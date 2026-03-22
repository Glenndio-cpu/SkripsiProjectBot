import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { FaPaperPlane, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { sendConsultationEmail } from '../lib/emailService';
import { getGeminiResponse, isGeminiConfigured, type ChatMessage } from '../lib/gemini';
import { trackConsultation } from '../lib/userActivityTracking';
import { AlertTriangle, Info, Stethoscope, Wrench, Phone as PhoneIcon, Mail, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Konsultasi = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya Chatbot Puskesmas Wori. Bagaimana saya bisa membantu Anda dengan pertanyaan seputar kesehatan dan pencegahan penyakit menular hari ini?'
    }
  ]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [summaryToSend, setSummaryToSend] = useState('');
  const [emailData, setEmailData] = useState({ name: '', email: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isApiConfigured, setIsApiConfigured] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkLoginStatus = () => {
      const user = localStorage.getItem('user');
      setIsUserLoggedIn(!!user);
    };

    checkLoginStatus();
    setIsApiConfigured(isGeminiConfigured());

    window.addEventListener('userUpdated', checkLoginStatus);
    window.addEventListener('storage', checkLoginStatus);

    return () => {
      window.removeEventListener('userUpdated', checkLoginStatus);
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    if (chatContainerRef.current && conversation.length > 1) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const analyzeQuery = (message: string): {
    isHealthRelated: boolean;
    isClear: boolean;
    isEmergency: boolean;
  } => {
    const greetingPatterns = [
      /^(halo|hai|hi|hello|hey|selamat|assalamu|apa\s+kabar|permisi|terima\s+kasih|makasih|ok|oke|ya|iya|tidak|baik|siapa)/i
    ];

    const isGreeting = greetingPatterns.some(pattern => pattern.test(message.trim()));

    const healthKeywords = [
      'sakit', 'penyakit', 'gejala', 'obat', 'dokter', 'rumah sakit', 'konsumsi', 'mengonsumsi',
      'demam', 'batuk', 'pilek', 'diare', 'mual', 'pusing', 'vaksin', 'alergi',
      'pengobatan', 'klinik', 'kesehatan', 'infeksi', 'virus', 'bakteri',
      'diabetes', 'darah tinggi', 'jantung', 'paru-paru', 'imun', 'sehat', 'tolong', 'racun', 'keracunan',
      'perawatan', 'cara', 'mengobati', 'mengatasi', 'mencegah', 'terkena', 'terserang',
      'flu', 'tbc', 'covid', 'corona', 'ispa', 'pencegahan', 'penularan', 'menular'
    ];

    const emergencyKeywords = ['darurat', 'gawat', 'kritis', 'emergency', 'sesak', 'tidak sadar'];

    const isHealth = healthKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    const isEmergency = emergencyKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    const words = message.trim().toLowerCase().split(/\s+/);
    const isClear = isGreeting || words.length >= 2 || isHealth;

    return {
      isHealthRelated: isHealth,
      isClear: isClear,
      isEmergency: isEmergency
    };
  };

  const formatAIResponse = (response: string): string => {
    let formatted = response
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__|__/g, '')
      .trim();

    formatted = formatted
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n')
      .trim();

    formatted = formatted
      .replace(/(Pengobatan|Perawatan|Rekomendasi|Manfaat|Risiko|Resiko|Pencegahan|Penyebab|Gejala|Diagnosis|Komplikasi|Tanda|Ciri|Obat|Terapi|Penanganan|Penularan|Definisi|Cara|Langkah)\s*:/gi, '\n\n$1:\n');

    formatted = formatted
      .replace(/^\s*[*-]\s+/gm, '• ')
      .replace(/^\s*•\s+/gm, '• ');

    formatted = formatted
      .replace(/^(\d+)[.)]\s*/gm, '$1. ');

    formatted = formatted
      .replace(/  +/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/ \n/g, '\n')
      .trim();

    formatted = formatted
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');

    return formatted;
  };

  const validateHealthResponse = (response: string): boolean => {
    if (!analyzeQuery(response).isHealthRelated) return false;
    const requiredSections = ['Rekomendasi:', 'Pencegahan:'];
    return requiredSections.every(section => response.includes(section));
  };

  const extractSummary = (content: string): string | null => {
    const summaryMatch = content.match(/Rangkuman:([\s\S]*?)(?=\n\n|$)/i);
    if (!summaryMatch) return null;

    return summaryMatch[1]
      .split('\n')
      .map(line => line.replace(/^[•-]\s*/, '').trim())
      .filter(line => line)
      .join('\n');
  };

  const prepareWhatsAppMessage = () => {
    const lastAssistantMessage = conversation
      .filter(msg => msg.role === 'assistant')
      .pop()?.content || '';

    const summary = extractSummary(lastAssistantMessage);

    if (!summary) {
      toast({
        title: "Tidak ada rangkuman",
        description: "Tidak ditemukan rangkuman konsultasi untuk dikirim.",
        variant: "destructive"
      });
      return;
    }

    setSummaryToSend(summary);
    setShowWhatsAppModal(true);
  };

  const handleShareViaEmail = () => {
    const summary = conversation
      .map((msg) => `${msg.role === 'user' ? 'Anda' : 'AI'}: ${msg.content}`)
      .join('\n\n');

    if (!summary.trim()) {
      toast({
        title: "Tidak ada ringkasan",
        description: "Tidak ditemukan rangkuman konsultasi untuk dikirim.",
        variant: "destructive"
      });
      return;
    }

    setSummaryToSend(summary);
    setShowEmailModal(true);
  };

  const sendToWhatsApp = () => {
    const phoneNumber = import.meta.env.VITE_PUSKESMAS_WHATSAPP || '6289657398733';
    const message = `Berikut ringkasan konsultasi Anda dengan Puskesmas Wori Online:\n\n${summaryToSend}`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setShowWhatsAppModal(false);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailData.name || !emailData.email) {
      alert('Nama dan email harus diisi!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.email)) {
      alert('Format email tidak valid!');
      return;
    }

    setIsSendingEmail(true);

    try {
      const userMessages = conversation
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n');

      const emailSent = await sendConsultationEmail({
        user_name: emailData.name,
        user_email: emailData.email,
        symptoms: userMessages,
        consultation_summary: summaryToSend
      });

      if (emailSent) {
        alert('Notifikasi berhasil dikirim ke admin! Anda akan segera dihubungi via email.');
        setShowEmailModal(false);
        setEmailData({ name: '', email: '' });
      } else {
        alert('Email service belum dikonfigurasi. Silakan gunakan WhatsApp untuk mengirim ringkasan.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Gagal mengirim email. Silakan coba lagi atau gunakan WhatsApp.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast({
        title: "Pesan kosong",
        description: "Silakan ketik pertanyaan Anda terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    const userMessage = message;
    setMessage('');

    const newConversation: Message[] = [...conversation, { role: 'user', content: userMessage }];
    setConversation(newConversation);
    setIsLoading(true);

    try {
      const { isHealthRelated, isClear } = analyzeQuery(userMessage);

      if (!isClear) {
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: 'Maaf, pertanyaan Anda kurang jelas. Mohon ajukan pertanyaan yang lebih spesifik agar saya dapat membantu dengan baik.'
        }]);
        setIsLoading(false);
        return;
      }

      if (!isUserLoggedIn && !isHealthRelated) {
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: 'Untuk konsultasi medis dan informasi penyakit, silakan login terlebih dahulu. Saat ini saya hanya dapat membantu dengan informasi umum Puskesmas seperti jam layanan, lokasi, pendaftaran, kontak, dan jadwal imunisasi.'
        }]);
        setIsLoading(false);
        return;
      }

      const chatMessages: ChatMessage[] = newConversation
        .filter((msg, index) => {
          if (index === 0 && msg.role === 'assistant') return false;
          return true;
        })
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const aiResponse = await getGeminiResponse(chatMessages);
      const formattedResponse = formatAIResponse(aiResponse);

      setConversation(prev => [...prev, {
        role: 'assistant',
        content: formattedResponse
      }]);

      if (isUserLoggedIn) {
        trackConsultation();
      }

    } catch (error: unknown) {
      console.error('Error in handleSendMessage:', error);

      let errorMessage = "Gagal memproses permintaan. Silakan coba lagi.";
      let errorDetail = "";

      const errMsg = error instanceof Error ? error.message : String(error);

      if (errMsg.includes("API key") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("dikonfigurasi")) {
        errorMessage = "Chatbot Belum Dikonfigurasi";
        errorDetail = `Silakan hubungi administrator untuk mengaktifkan layanan AI chatbot.\n\nUntuk konsultasi langsung:\nWhatsApp: ${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}\nEmail: ${import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}`;
      } else if (errMsg.includes("QUOTA_EXCEEDED") || errMsg.includes("429") || errMsg.includes("Too Many Requests")) {
        errorMessage = "Quota API Habis";
        errorDetail = `Layanan chatbot AI telah mencapai batas penggunaan. Silakan coba lagi dalam beberapa menit atau hubungi admin untuk upgrade quota.\n\nUntuk konsultasi langsung:\nWhatsApp: ${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}\nEmail: ${import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}`;
      } else if (errMsg.includes("MODEL_ERROR") || errMsg.includes("404") || errMsg.includes("not found")) {
        errorMessage = "Model AI Tidak Tersedia";
        errorDetail = `Sistem sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat atau hubungi:\n${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}`;
      } else if (errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "Layanan Sedang Sibuk";
        errorDetail = `Silakan coba lagi dalam beberapa saat.\n\nJika mendesak, hubungi:\n${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}`;
      } else if (errMsg.includes("SAFETY") || errMsg.includes("safety")) {
        errorMessage = "Pertanyaan Tidak Dapat Diproses";
        errorDetail = "Pastikan pertanyaan Anda sesuai dengan topik kesehatan dan pencegahan penyakit.";
      } else if (errMsg.includes("NetworkError") || errMsg.includes("Failed to fetch") || errMsg.toLowerCase().includes("network")) {
        errorMessage = "Koneksi Internet Bermasalah";
        errorDetail = "Silakan periksa koneksi internet Anda dan coba lagi.";
      } else {
        errorMessage = "Terjadi Kesalahan pada Chatbot";
        errorDetail = `${errMsg}\n\nUntuk bantuan langsung, hubungi:\n${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}\n${import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      const fullErrorMessage = errorDetail
        ? `${errorMessage}\n\n${errorDetail}`
        : `Maaf, terjadi kesalahan: ${errorMessage}\n\nSilakan coba lagi atau hubungi Puskesmas Wori di ${import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'} untuk bantuan langsung.`;

      setConversation(prev => [...prev, {
        role: 'assistant',
        content: fullErrorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const FormattedMessage = ({ content }: { content: string }) => {
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    let currentHeaderNumber = 0;
    let subItemCounter = 0;

    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {allLines.map((line, lineIndex) => {
          let trimmedLine = line.trim()
            .replace(/\*\*\*/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/__|__/g, '')
            .trim();

          if (/^\d+\.\s+[A-Z]/.test(trimmedLine)) {
            trimmedLine = trimmedLine.replace(/^\d+\.\s+/, '');
          }

          if (!trimmedLine) return null;

          const isHeader = trimmedLine.match(/^(Pengobatan|Perawatan|Rekomendasi|Manfaat|Risiko|Resiko|Pencegahan|Penyebab|Gejala|Diagnosis|Komplikasi|Tanda|Ciri|Obat|Terapi|Penanganan|Penularan|Definisi|Apa itu|Cara|Langkah)[:\s]/i);
          const isImportant = trimmedLine.match(/^(Penting|Catatan|Perhatian|Ingat|Warning|Peringatan)[:\s!]/i);
          const isQuestion = trimmedLine.match(/^(Kapan|Mengapa|Bagaimana|Apa|Siapa|Di mana|Berapa).*\?$/i);
          const isBoldText = trimmedLine.endsWith(':') && trimmedLine.length < 80;
          const isFirstLine = lineIndex === 0 && trimmedLine.length > 50;
          const isDisclaimer = trimmedLine.match(/^(Meskipun|Namun|Perlu diingat|Harap diingat|Catatan penting|Disclaimer)/i);
          const isLastLine = lineIndex === allLines.length - 1 && (
            trimmedLine.match(/^(Semoga|Jika|Jangan|Tetap|Cepat|Salam|Sebagai|Saya|Terima kasih|Silakan|Jangan ragu|Ingat)/i) ||
            trimmedLine.match(/(siap membantu|pertanyaan lain|butuhkan|memerlukan)/i)
          );

          if (isHeader) {
            currentHeaderNumber++;
            subItemCounter = 0;
            return (
              <div key={lineIndex} className="mt-4 first:mt-0">
                <h3 className="font-semibold text-slate-700 text-sm pb-1.5 border-b border-slate-200 mb-2">
                  <span className="text-sky-500 mr-1.5">{currentHeaderNumber}.</span>
                  {trimmedLine.replace(/:\s*$/, '')}
                </h3>
              </div>
            );
          }

          if (isImportant) {
            return (
              <div key={lineIndex} className="bg-amber-50 border-l-2 border-amber-400 p-2.5 rounded-r my-2">
                <p className="text-amber-800 font-medium text-xs flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{trimmedLine}</span>
                </p>
              </div>
            );
          }

          if (isQuestion) {
            return <p key={lineIndex} className="font-medium text-slate-700 mt-3 mb-1">{trimmedLine}</p>;
          }

          if (isBoldText) {
            return <p key={lineIndex} className="font-medium text-slate-700 mt-2 mb-0.5 ml-5">{trimmedLine}</p>;
          }

          if (isFirstLine) {
            return <p key={lineIndex} className="text-slate-600 mb-2">{trimmedLine}</p>;
          }

          if (isDisclaimer || isLastLine) {
            return <p key={lineIndex} className="text-slate-500 mt-3 italic text-xs">{trimmedLine}</p>;
          }

          subItemCounter++;
          return (
            <div key={lineIndex} className="flex items-start gap-2 ml-5 my-1">
              <span className="font-medium text-sky-500 min-w-[1.2rem] text-xs mt-0.5">{subItemCounter}.</span>
              <p className="text-slate-600 flex-1">{trimmedLine}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout hideAIAssistant={true}>
      <section className="py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">Konsultasi Kesehatan</h1>
              <p className="text-sm text-slate-400 mt-1">Tanyakan keluhan Anda kepada asisten AI kami</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium self-start ${
              isUserLoggedIn
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}>
              {isUserLoggedIn ? <Stethoscope className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
              {isUserLoggedIn ? 'Mode Konsultasi' : 'Mode Info Puskesmas'}
            </div>
          </div>

          {/* API Configuration Warning */}
          {!isApiConfigured && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-700 text-sm mb-1">Chatbot AI Belum Dikonfigurasi</h3>
                  <p className="text-xs text-slate-500 mb-3">Layanan AI belum aktif. Hubungi administrator untuk mengaktifkan.</p>
                  <div className="bg-white border border-amber-100 rounded-lg p-3 mb-3 text-xs">
                    <p className="font-medium text-slate-600 mb-2 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Untuk Admin/Developer:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-500 ml-1">
                      <li>Buka <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-sky-500 hover:text-sky-600">Google AI Studio</a></li>
                      <li>Login & klik "Create API Key" (GRATIS)</li>
                      <li>Tambahkan ke file <code className="bg-slate-100 px-1 rounded text-slate-600">backend/.env</code></li>
                      <li>Format: <code className="bg-slate-100 px-1 rounded text-slate-600">GEMINI_API_KEY=your_key</code></li>
                      <li>Restart backend server</li>
                    </ol>
                  </div>
                  <div className="bg-white border border-amber-100 rounded-lg p-3 text-xs">
                    <p className="font-medium text-slate-600 mb-1 flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5" /> Hubungi langsung:</p>
                    <p className="text-slate-500">
                      WhatsApp: <a href={`https://wa.me/${import.meta.env.VITE_PUSKESMAS_WHATSAPP || '6289657398733'}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-500 hover:text-sky-600">{import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733'}</a>
                      <br />Email: <a href={`mailto:${import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}`} className="font-medium text-sky-500 hover:text-sky-600">{import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info banner for non-logged-in users */}
          {!isUserLoggedIn && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-sky-50 border border-sky-100 rounded-xl">
              <Info className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Saat ini Anda hanya dapat bertanya tentang informasi Puskesmas (jam layanan, lokasi, pendaftaran, dll).
                <strong className="text-slate-600"> Silakan login untuk mengakses konsultasi medis.</strong>
              </p>
            </div>
          )}

          {/* Chat Container */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-4">
            <div
              ref={chatContainerRef}
              className="p-4 sm:p-5 h-[55vh] sm:h-[60vh] overflow-y-auto space-y-4"
            >
              {conversation.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-xl px-4 py-3 max-w-[85%] sm:max-w-[75%] ${
                      msg.role === 'user'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-50 border border-slate-100 text-slate-700'
                    }`}
                  >
                    <FormattedMessage content={msg.content} />
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3 bg-slate-50 border border-slate-100">
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-300"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-3 sm:p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ketik pertanyaan Anda..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
                  disabled={isLoading || !message.trim()}
                >
                  <FaPaperPlane className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            <button
              type="button"
              onClick={prepareWhatsAppMessage}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <FaWhatsapp className="w-4 h-4" />
              Kirim ke WhatsApp
            </button>
            <button
              type="button"
              onClick={handleShareViaEmail}
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <FaEnvelope className="w-4 h-4" />
              Kirim ke Email Admin
            </button>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-600">Penting:</span> Informasi ini hanya bersifat informatif dan bukan pengganti nasihat medis profesional. Selalu konsultasikan dengan dokter atau tenaga medis yang berkualifikasi untuk diagnosis dan pengobatan.
            </p>
          </div>
        </div>
      </section>

      {/* WhatsApp Confirmation Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Konfirmasi Pengiriman</h3>
            <p className="text-sm text-slate-500 mb-5">Anda akan mengirim ringkasan konsultasi ke WhatsApp. Lanjutkan?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={sendToWhatsApp}
                className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-500" /> Kirim ke Email Admin
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Masukkan data Anda untuk mengirim notifikasi konsultasi ke admin Puskesmas Wori Online.
            </p>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label htmlFor="userName" className="block text-xs font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  id="userName"
                  value={emailData.name}
                  onChange={(e) => setEmailData({...emailData, name: e.target.value})}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="Masukkan nama Anda"
                  required
                />
              </div>
              <div>
                <label htmlFor="userEmail" className="block text-xs font-medium text-slate-600 mb-1.5">Email Anda</label>
                <input
                  type="email"
                  id="userEmail"
                  value={emailData.email}
                  onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-100 rounded-lg">
                <Info className="w-3.5 h-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">Admin akan menghubungi Anda via email untuk konsultasi lebih lanjut.</p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ name: '', email: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={isSendingEmail}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <><Loader2 className="animate-spin w-3.5 h-3.5" /> Mengirim...</>
                  ) : (
                    <><Mail className="w-3.5 h-3.5" /> Kirim Email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Konsultasi;
