import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeartbeat, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { getUserInitial, useRealtimeUser } from '@/hooks/use-realtime-user';
import { getGeminiResponse, type ChatMessage } from '../lib/gemini';
import { AlertTriangle, Stethoscope, Info } from 'lucide-react';
import { trackConsultation } from '../lib/userActivityTracking';
import {
  CHAT_DAILY_USAGE_STORAGE_KEY,
  CHAT_GUEST_SESSION_STORAGE_KEY,
  GUEST_DAILY_MESSAGE_LIMIT,
  GUEST_SESSION_MESSAGE_LIMIT,
  PATIENT_DAILY_MESSAGE_LIMIT,
  getGuestDailyUsageCount,
  getGuestSessionUsageCount,
  getPatientDailyUsageCount,
  incrementGuestDailyUsageCount,
  incrementGuestSessionUsageCount,
  incrementPatientDailyUsageCount,
  broadcastQuotaChange,
  onQuotaChanged,
  readAllQuotas,
} from '../lib/chatLimits';
import { ROLE_PATIENT } from '../lib/roles';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type MessageBlock =
  | { type: 'heading'; text: string }
  | { type: 'important'; text: string }
  | { type: 'numbered'; marker: string; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'question'; text: string }
  | { type: 'closing'; text: string }
  | { type: 'paragraph'; text: string };

const headingPattern = /^(Pengobatan|Perawatan|Rekomendasi|Manfaat|Risiko|Resiko|Pencegahan|Penyebab|Gejala|Diagnosis|Komplikasi|Tanda|Ciri|Obat|Terapi|Penanganan|Penularan|Definisi|Apa itu|Cara|Langkah)\s*:?$/i;
const importantPattern = /^(Penting|Catatan|Perhatian|Ingat|Warning|Peringatan)[:\s!]/i;
const questionPattern = /^(Kapan|Mengapa|Bagaimana|Apa|Siapa|Di mana|Berapa).*\?$/i;
const closingPattern = /^(Semoga|Jika|Jangan|Tetap|Cepat|Salam|Sebagai|Saya|Terima kasih|Silakan|Jangan ragu|Ingat)/i;
const listMarkerPattern = /^(\d+[.)]|[-*•])\s+/;
const shortHeadingPattern = /^[A-Z][A-Za-z0-9\s()\/,.-]{2,56}:$/;
const wrappedContinuationPattern = /^(dan|atau|yang|untuk|dengan|agar|sehingga|karena|jika|bila|serta|pada|di|ke|dari|oleh|tanpa|lebih|kurang|misalnya|contoh|termasuk)\b/i;

const sanitizeLine = (line: string): string => {
  return line
    .trim()
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const shouldMergeShortContinuation = (previous: string, current: string): boolean => {
  if (!previous || /[.!?]$/.test(previous)) return false;
  if (listMarkerPattern.test(current)) return false;
  return /^(cara|langkah|catatan|rekomendasi|pencegahan|pengobatan|penanganan)\s*:?$/i.test(current);
};

const shouldMergeWrappedLine = (previous: string, current: string): boolean => {
  if (!previous) return false;
  if (listMarkerPattern.test(current)) return false;
  if (headingPattern.test(current) || importantPattern.test(current) || questionPattern.test(current)) return false;
  if (shortHeadingPattern.test(current)) return false;
  if (/:$/.test(previous) || /[.!?]$/.test(previous)) return false;

  return /^[a-z(]/.test(current) || wrappedContinuationPattern.test(current);
};

const buildMessageBlocks = (content: string): MessageBlock[] => {
  const mergedLines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(sanitizeLine)
    .filter(Boolean)
    .reduce<string[]>((acc, line) => {
      if (
        acc.length > 0 &&
        (shouldMergeShortContinuation(acc[acc.length - 1], line) || shouldMergeWrappedLine(acc[acc.length - 1], line))
      ) {
        acc[acc.length - 1] = `${acc[acc.length - 1]} ${line}`;
        return acc;
      }

      acc.push(line);
      return acc;
    }, []);

  return mergedLines.map((line, index) => {
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (numberedMatch) {
      return {
        type: 'numbered',
        marker: `${numberedMatch[1]}.`,
        text: numberedMatch[2].trim(),
      };
    }

    const bulletMatch = line.match(/^(?:[-*•])\s+(.+)/);
    if (bulletMatch) {
      return { type: 'bullet', text: bulletMatch[1].trim() };
    }

    if (importantPattern.test(line)) {
      return { type: 'important', text: line };
    }

    if (headingPattern.test(line) || shortHeadingPattern.test(line)) {
      return { type: 'heading', text: line.replace(/:\s*$/, '') };
    }

    if (questionPattern.test(line)) {
      return { type: 'question', text: line };
    }

    const isClosing = index === mergedLines.length - 1 && (
      closingPattern.test(line) ||
      /(siap membantu|pertanyaan lain|butuhkan|memerlukan)/i.test(line)
    );

    if (isClosing) {
      return { type: 'closing', text: line };
    }

    return { type: 'paragraph', text: line };
  });
};

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [guestDailyUsage, setGuestDailyUsage] = useState(() => getGuestDailyUsageCount());
  const [patientDailyUsage, setPatientDailyUsage] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (parsed?.role !== ROLE_PATIENT || !parsed?.email) return 0;
      return getPatientDailyUsageCount(parsed.email);
    } catch { return 0; }
  });
  const [guestSessionUsage, setGuestSessionUsage] = useState(() => getGuestSessionUsageCount());
  const [conversation, setConversation] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Halo! Saya Chatbot Puskesmas Wori. Bagaimana saya bisa membantu Anda hari ini?' 
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const realtimeUser = useRealtimeUser();
  const userEmail = typeof realtimeUser?.email === 'string' ? realtimeUser.email.trim().toLowerCase() : '';
  const userProfileImage = typeof realtimeUser?.profileImage === 'string' ? realtimeUser.profileImage.trim() : '';
  const userAvatarInitial = getUserInitial(typeof realtimeUser?.name === 'string' ? realtimeUser.name : 'Anda', 'A');

  // Keep refs so event-handler closures always see latest values
  const isLoggedInRef = useRef(isUserLoggedIn);
  const userEmailRef = useRef(userEmail);
  useEffect(() => { isLoggedInRef.current = isUserLoggedIn; }, [isUserLoggedIn]);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  // Check login status
  useEffect(() => {
    const isPatient =
      realtimeUser?.role === ROLE_PATIENT &&
      typeof realtimeUser?.email === 'string' &&
      realtimeUser.email.trim() !== '';
    setIsUserLoggedIn(Boolean(isPatient));

    if (isPatient) {
      setPatientDailyUsage(getPatientDailyUsageCount(realtimeUser.email));
      setGuestDailyUsage(getGuestDailyUsageCount());
      setGuestSessionUsage(0);
      return;
    }

    setGuestDailyUsage(getGuestDailyUsageCount());
    setGuestSessionUsage(getGuestSessionUsageCount());
    setPatientDailyUsage(0);
  }, [realtimeUser]);

  // ── Re-sync all quota values from localStorage ─────────────────────
  // Uses refs to avoid stale closures when invoked from event listeners.
  const syncQuotasFromStorage = useCallback(() => {
    if (isLoggedInRef.current && userEmailRef.current) {
      const q = readAllQuotas(userEmailRef.current);
      setPatientDailyUsage(q.patientDaily);
      setGuestDailyUsage(q.guestDaily);
      setGuestSessionUsage(0);
      return;
    }
    const q = readAllQuotas();
    setGuestDailyUsage(q.guestDaily);
    setGuestSessionUsage(q.guestSession);
    setPatientDailyUsage(0);
  }, []);

  // Explicit mount sync — guarantees fresh localStorage read regardless of
  // navigation path (SPA transition, back button, full page load, etc.).
  useEffect(() => {
    syncQuotasFromStorage();
  }, [syncQuotasFromStorage]);

  // Cross-tab sync: StorageEvent + BroadcastChannel + visibilitychange
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CHAT_DAILY_USAGE_STORAGE_KEY || event.key === CHAT_GUEST_SESSION_STORAGE_KEY || event.key === 'user') {
        syncQuotasFromStorage();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncQuotasFromStorage();
      }
    };

    const handleFocus = () => {
      syncQuotasFromStorage();
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    const unsubBroadcast = onQuotaChanged(syncQuotasFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      unsubBroadcast();
    };
  }, [syncQuotasFromStorage]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const currentGuestSessionCount = getGuestSessionUsageCount();
    const guestUnlockMessage = `Silakan login untuk unlock fitur pasien: hingga ${PATIENT_DAILY_MESSAGE_LIMIT} pertanyaan per hari, riwayat percakapan tersimpan, ganti judul, dan hapus percakapan.`;

    if (!isUserLoggedIn) {
      const guestDailyUsageCount = getGuestDailyUsageCount();

      if (currentGuestSessionCount >= GUEST_SESSION_MESSAGE_LIMIT) {
        const sessionLimitMessage = `Batas mode masyarakat tercapai: maksimal ${GUEST_SESSION_MESSAGE_LIMIT} pertanyaan per sesi. ${guestUnlockMessage}`;
        toast({
          title: 'Batas sesi masyarakat tercapai',
          description: sessionLimitMessage,
          variant: 'destructive',
        });
        setConversation((prev) => [...prev, { role: 'assistant', content: sessionLimitMessage }]);
        return;
      }

      if (guestDailyUsageCount >= GUEST_DAILY_MESSAGE_LIMIT) {
        const dailyLimitMessage = `Batas harian mode masyarakat tercapai: maksimal ${GUEST_DAILY_MESSAGE_LIMIT} pertanyaan per hari per perangkat. ${guestUnlockMessage}`;
        toast({
          title: 'Batas harian masyarakat tercapai',
          description: dailyLimitMessage,
          variant: 'destructive',
        });
        setConversation((prev) => [...prev, { role: 'assistant', content: dailyLimitMessage }]);
        return;
      }
    }

    if (isUserLoggedIn && userEmail) {
      const patientDailyUsageCount = getPatientDailyUsageCount(userEmail);
      if (patientDailyUsageCount >= PATIENT_DAILY_MESSAGE_LIMIT) {
        const patientLimitMessage = `Batas harian akun pasien tercapai: maksimal ${PATIENT_DAILY_MESSAGE_LIMIT} pertanyaan per hari. Anda tetap bisa membuka riwayat percakapan, mengganti judul, atau menghapus percakapan. Silakan lanjutkan kembali besok.`;
        toast({
          title: 'Batas harian pasien tercapai',
          description: patientLimitMessage,
          variant: 'destructive',
        });
        setConversation((prev) => [...prev, { role: 'assistant', content: patientLimitMessage }]);
        return;
      }
    }

    const userMessage = message;
    setMessage('');

    if (!isUserLoggedIn) {
      const nextGuestDailyUsage = incrementGuestDailyUsageCount();
      setGuestDailyUsage(nextGuestDailyUsage);
      const nextGuestSessionUsage = incrementGuestSessionUsageCount();
      setGuestSessionUsage(nextGuestSessionUsage);
      broadcastQuotaChange();
    } else if (userEmail) {
      const nextPatientDailyUsage = incrementPatientDailyUsageCount(userEmail);
      setPatientDailyUsage(nextPatientDailyUsage);
      broadcastQuotaChange();
    }
    
    const newConversation: Message[] = [...conversation, { role: 'user', content: userMessage }];
    setConversation(newConversation);
    setIsLoading(true);

    try {
      // Filter hanya pesan user dan assistant yang bukan greeting
      // Gemini API memerlukan pesan pertama harus dari 'user'
      const chatMessages: ChatMessage[] = newConversation
        .filter((msg, index) => {
          // Hapus pesan greeting pertama (index 0) jika itu assistant message
          if (index === 0 && msg.role === 'assistant') {
            return false;
          }
          return true;
        })
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log("AIAssistant sending to Gemini:", chatMessages.length, "messages");

      // Panggil Gemini API (mode otomatis disesuaikan dengan login status)
      const aiResponse = await getGeminiResponse(chatMessages);
      
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse
      }]);

      // Track consultation jika user sudah login
      if (isUserLoggedIn) {
        trackConsultation();
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Pesan berbeda berdasarkan status login
      const errorMessage = isUserLoggedIn 
        ? 'Maaf, saya mengalami kesulitan untuk memproses permintaan Anda saat ini. Silakan coba lagi.'
        : 'Login terlebih dahulu untuk mendapatkan layanan konsultasi kesehatan!';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const guestSessionRemaining = Math.max(0, GUEST_SESSION_MESSAGE_LIMIT - guestSessionUsage);
  const guestDailyRemaining = Math.max(0, GUEST_DAILY_MESSAGE_LIMIT - guestDailyUsage);
  const patientDailyRemaining = Math.max(0, PATIENT_DAILY_MESSAGE_LIMIT - patientDailyUsage);

  // Helper component to render formatted messages
  const FormattedMessage = ({ content, role }: { content: string; role: Message['role'] }) => {
    if (role === 'user') {
      return (
        <p className="whitespace-pre-wrap text-[0.95rem] font-semibold leading-relaxed tracking-[0.01em] text-white">
          {content.trim()}
        </p>
      );
    }

    const blocks = buildMessageBlocks(content);

    return (
      <div className="space-y-1.5 text-[0.85rem] leading-snug md:space-y-3 md:text-[1rem] md:leading-relaxed">
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            return (
              <h4 key={index} className="mt-2.5 rounded-r-md border-l-2 border-emerald-300 bg-emerald-50/70 py-0.5 pl-2 text-[0.82rem] font-semibold text-slate-700 first:mt-0 md:mt-3 md:py-1 md:text-[0.95rem]">
                {block.text}
              </h4>
            );
          }

          if (block.type === 'important') {
            return (
              <div key={index} className="my-1.5 rounded-r border-l-2 border-yellow-400 bg-yellow-50 p-2 md:my-2.5 md:p-3">
                <p className="flex items-start gap-1.5 text-[0.72rem] font-semibold text-yellow-800 md:text-[0.82rem]">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 md:h-3.5 md:w-3.5" />
                  <span>{block.text}</span>
                </p>
              </div>
            );
          }

          if (block.type === 'numbered') {
            return (
              <div key={index} className="my-1 flex items-start gap-1.5 md:my-2 md:gap-2.5">
                <span className="min-w-[1.05rem] text-[0.72rem] font-semibold text-emerald-500 md:min-w-[1.2rem] md:text-xs">{block.marker}</span>
                <p className="flex-1 text-[0.85rem] leading-snug text-slate-700 md:text-[1rem] md:leading-relaxed">{block.text}</p>
              </div>
            );
          }

          if (block.type === 'bullet') {
            return (
              <div key={index} className="my-1 flex items-start gap-1.5 md:my-2 md:gap-2.5">
                <span className="min-w-[1.05rem] text-[0.72rem] font-semibold text-emerald-500 md:min-w-[1.2rem] md:text-xs">•</span>
                <p className="flex-1 text-[0.85rem] leading-snug text-slate-700 md:text-[1rem] md:leading-relaxed">{block.text}</p>
              </div>
            );
          }

          if (block.type === 'question') {
            return <p key={index} className="mt-2 text-[0.85rem] font-semibold text-slate-700 md:mt-2.5 md:text-[1rem]">{block.text}</p>;
          }

          if (block.type === 'closing') {
            return <p key={index} className="mt-3 text-[0.72rem] italic text-slate-500 md:mt-3.5 md:text-xs">{block.text}</p>;
          }

          return <p key={index} className="text-[0.85rem] leading-snug text-slate-700 md:text-[1rem] md:leading-relaxed">{block.text}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Buka Chatbot Puskesmas Wori"
      >
        {isOpen ? (
          <FaTimes className="text-xl" />
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <FaHeartbeat className="text-2xl" />
          </motion.div>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 right-6 w-96 sm:w-[28rem] rounded-lg bg-white shadow-2xl z-40 overflow-hidden" // Changed from bottom-20 to top-24
            style={{ 
              height: '65vh', // Slightly reduced height
              maxHeight: '65vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header - unchanged */}
            <div className="bg-slate-600 text-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-full mr-3">
                    <FaHeartbeat className="text-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold">Puskesmas Wori</h3>
                    <p className="text-xs opacity-80">Layanan Chatbot</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
              
              {/* Mode Badge */}
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                isUserLoggedIn 
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                  : 'bg-blue-500/20 text-blue-100 border border-blue-400/30'
              }`}>
                <span>{isUserLoggedIn ? <Stethoscope className="w-3 h-3" /> : <Info className="w-3 h-3" />}</span>
                <span>Mode: {isUserLoggedIn ? 'Konsultasi' : 'Info Puskesmas'}</span>
              </div>

              <p className="mt-2 text-[11px] text-white/90 leading-relaxed">
                {isUserLoggedIn
                  ? `Limit akun: ${PATIENT_DAILY_MESSAGE_LIMIT}/hari. Sisa hari ini: ${patientDailyRemaining}.`
                  : `Mode masyarakat: sisa sesi ${guestSessionRemaining} dan sisa harian ${guestDailyRemaining}. Login untuk unlock fitur pasien.`}
              </p>
            </div>
            
            {/* Messages - Now has more vertical space */}
            <div 
              className="p-4 overflow-y-auto bg-gray-50"
              style={{ 
                flex: 1,
                minHeight: '60%'
              }}
            >
              {conversation.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {msg.role === 'assistant' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                        <Stethoscope className="h-4 w-4 text-white" />
                      </div>
                    ) : userProfileImage ? (
                      <img
                        src={userProfileImage}
                        alt="Foto profil"
                        className="h-8 w-8 rounded-lg border border-blue-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">
                        {userAvatarInitial}
                      </div>
                    )}
                  </div>
                  <div
                    className={`inline-block max-w-[90%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'border border-emerald-500/70 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/15'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    <FormattedMessage content={msg.content} role={msg.role} />
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="mb-4">
                  <div className="inline-block rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-700">
                    <div className="flex space-x-2">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-gray-400"
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Input Form - unchanged */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ketik pesan anda..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isLoading}
                />
                <motion.button
                  type="submit"
                  className="bg-emerald-500 text-white px-4 py-2 rounded-r-lg"
                  whileHover={{ backgroundColor: '#2563eb' }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading || !message.trim()}
                >
                  <FaPaperPlane />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;