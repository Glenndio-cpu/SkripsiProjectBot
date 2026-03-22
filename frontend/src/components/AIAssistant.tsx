import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeartbeat, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { getGeminiResponse, type ChatMessage } from '../lib/gemini';
import { AlertTriangle, Stethoscope, Info } from 'lucide-react';
import { trackConsultation } from '../lib/userActivityTracking';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Halo! Saya Chatbot Puskesmas Wori. Bagaimana saya bisa membantu Anda hari ini?' 
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check login status
  useEffect(() => {
    const checkLoginStatus = () => {
      const user = localStorage.getItem('user');
      setIsUserLoggedIn(!!user);
    };
    
    checkLoginStatus();
    
    // Listen for login/logout events
    window.addEventListener('userUpdated', checkLoginStatus);
    window.addEventListener('storage', checkLoginStatus);
    
    return () => {
      window.removeEventListener('userUpdated', checkLoginStatus);
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    
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

  // Helper component to render formatted messages
  const FormattedMessage = ({ content }: { content: string }) => {
    // Split content into lines first
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    let currentHeaderNumber = 0;
    let subItemCounter = 0;

    return (
      <div className="space-y-2">
        {allLines.map((line, lineIndex) => {
          // Clean ALL formatting markers from the line
          let trimmedLine = line.trim()
            .replace(/\*\*\*/g, '')  // Remove triple asterisks
            .replace(/\*\*/g, '')    // Remove double asterisks
            .replace(/\*/g, '')      // Remove single asterisks  
            .replace(/__|__/g, '')   // Remove underscores
            .trim();
          
          // Remove numbering from Gemini if pattern is: "number. CapitalLetter..."
          // This preserves "1. +62..." but removes "1. Fokus..."
          if (/^\d+\.\s+[A-Z]/.test(trimmedLine)) {
            trimmedLine = trimmedLine.replace(/^\d+\.\s+/, '');
          }
          
          // Skip empty lines
          if (!trimmedLine) return null;
          
          // Header detection
          const isHeader = trimmedLine.match(/^(Pengobatan|Perawatan|Rekomendasi|Manfaat|Risiko|Resiko|Pencegahan|Penyebab|Gejala|Diagnosis|Komplikasi|Tanda|Ciri|Obat|Terapi|Penanganan|Penularan|Definisi|Apa itu|Cara|Langkah)[:\s]/i);
          
          // Important notes
          const isImportant = trimmedLine.match(/^(Penting|Catatan|Perhatian|Ingat)[:\s!]/i);
          
          // Bold text detection (ends with :)
          const isBoldText = trimmedLine.endsWith(':') && trimmedLine.length < 60;
          
          // Line pertama yang panjang (greeting) - TANPA NOMOR
          const isFirstLine = lineIndex === 0 && trimmedLine.length > 50;
          
          // Disclaimer atau kalimat sebelum penutup - TANPA NOMOR
          const isDisclaimer = trimmedLine.match(/^(Meskipun|Namun|Perlu diingat|Harap diingat|Catatan penting|Disclaimer)/i);
          
          // Line terakhir (closing) - TANPA NOMOR
          // Deteksi kalimat penutup yang umum dari chatbot
          const isLastLine = lineIndex === allLines.length - 1 && (
            trimmedLine.match(/^(Semoga|Jika|Jangan|Tetap|Cepat|Salam|Sebagai|Saya|Terima kasih|Silakan|Jangan ragu|Ingat)/i) ||
            trimmedLine.match(/(siap membantu|pertanyaan lain|butuhkan|memerlukan)/i)
          );
          
          if (isHeader) {
            currentHeaderNumber++;
            subItemCounter = 0;
            return (
              <div 
                key={lineIndex}
                className="mt-4 first:mt-0"
              >
                <h4 className="font-bold text-slate-600 text-base pb-1.5 border-b border-sky-300 mb-2">
                  <span className="text-sky-500 mr-2">{currentHeaderNumber}.</span>
                  {trimmedLine.replace(/:\s*$/, '')}
                </h4>
              </div>
            );
          }
          
          if (isImportant) {
            return (
              <div 
                key={lineIndex}
                className="bg-yellow-50 border-l-3 border-yellow-400 p-2 rounded-r my-2"
              >
                <p className="text-yellow-800 font-semibold text-xs flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{trimmedLine}</span>
                </p>
              </div>
            );
          }
          
          // Bold text - TIDAK DIBERI NOMOR
          if (isBoldText) {
            return (
              <p 
                key={lineIndex}
                className="font-semibold text-gray-900 mt-2 mb-0.5 text-sm ml-4"
              >
                {trimmedLine}
              </p>
            );
          }
          
          // Line pertama (greeting panjang) - TIDAK DIBERI NOMOR
          if (isFirstLine) {
            return (
              <p 
                key={lineIndex}
                className="text-sm text-gray-800 leading-relaxed mb-2"
              >
                {trimmedLine}
              </p>
            );
          }
          
          // Disclaimer - TIDAK DIBERI NOMOR
          if (isDisclaimer) {
            return (
              <p 
                key={lineIndex}
                className="text-sm text-gray-700 leading-relaxed mt-3 italic"
              >
                {trimmedLine}
              </p>
            );
          }
          
          // Line terakhir (closing) - TIDAK DIBERI NOMOR
          if (isLastLine) {
            return (
              <p 
                key={lineIndex}
                className="text-sm text-gray-800 leading-relaxed mt-3 italic"
              >
                {trimmedLine}
              </p>
            );
          }
          
          // SEMUA LINE LAINNYA DIBERI NOMOR
          subItemCounter++;
          return (
            <div 
              key={lineIndex}
              className="flex items-start gap-2 ml-4 my-1.5"
            >
              <span className="font-semibold text-sky-500 min-w-[1.2rem] text-xs">
                {subItemCounter}.
              </span>
              <p className="text-sm leading-relaxed text-gray-800 flex-1">
                {trimmedLine}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Buka Asisten Virtual"
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
                    <h3 className="font-bold">Puskesmas Wori Online</h3>
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
                  className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}
                >
                  <div
                    className={`inline-block rounded-lg px-4 py-2 max-w-[90%] ${
                      msg.role === 'user'
                        ? 'bg-sky-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    <FormattedMessage content={msg.content} />
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
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={isLoading}
                />
                <motion.button
                  type="submit"
                  className="bg-sky-500 text-white px-4 py-2 rounded-r-lg"
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