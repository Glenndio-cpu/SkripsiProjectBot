import React, { useState, useRef, useEffect, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { FaPaperPlane } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getGeminiResponse, isGeminiConfigured, type ChatMessage } from '../lib/gemini';
import { trackConsultation } from '../lib/userActivityTracking';
import { buildSupportContactText, publicInfo, publicLinks } from '../lib/publicInfo';
import { ROLE_PATIENT, ROLE_PUBLIC } from '../lib/roles';
import {
  AlertTriangle,
  Info,
  Stethoscope,
  Wrench,
  Phone as PhoneIcon,
  Menu,
  X,
  Search,
  MessageSquarePlus,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Bot,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryItem {
  id: string;
  label: string;
  preview: string;
  category: 'konsultasi';
  updatedAt: string;
  customLabel: boolean;
  messages: Message[];
}

const GUEST_MESSAGE_LIMIT = 5;
const INITIAL_ASSISTANT_MESSAGE = 'Halo! Saya Chatbot Puskesmas. Bagaimana saya bisa membantu Anda dengan pertanyaan seputar kesehatan hari ini?';
const PATIENT_CHAT_STORAGE_KEY_PREFIX = 'puskesbot:patient-chat-sessions:';

const categoryStyles: Record<string, string> = {
  konsultasi: 'bg-emerald-100 text-emerald-700',
};

const categoryLabels: Record<string, string> = {
  konsultasi: 'Konsultasi',
};

const toGroupLabel = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowOnly.getTime() - dateOnly.getTime()) / 86400000);

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const makeSessionId = (): string => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildPatientStorageKey = (email: string): string => `${PATIENT_CHAT_STORAGE_KEY_PREFIX}${email.toLowerCase()}`;

const summarizeText = (text: string, maxLen: number): string => {
  const clean = text.trim();
  if (!clean) return '-';
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
};

const sessionTitleFromMessages = (messages: Message[]): string => {
  const firstUser = messages.find((msg) => msg.role === 'user')?.content || '';
  return summarizeText(firstUser || 'Percakapan baru', 38);
};

const sessionPreviewFromMessages = (messages: Message[]): string => {
  const latest = messages[messages.length - 1]?.content || '';
  return summarizeText(latest, 70);
};

const Konsultasi = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: 'assistant',
      content: INITIAL_ASSISTANT_MESSAGE,
    }
  ]);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isPublicUser, setIsPublicUser] = useState(false);
  const [isApiConfigured, setIsApiConfigured] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHistoryId, setActiveHistoryId] = useState('aktif');
  const [historyItems, setHistoryItems] = useState<ChatHistoryItem[]>([]);
  const [sessionsHydrated, setSessionsHydrated] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const supportContacts = buildSupportContactText();

  const getCurrentUserEmail = (): string => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (parsed?.role !== ROLE_PATIENT) return '';
      return typeof parsed?.email === 'string' ? parsed.email : '';
    } catch {
      return '';
    }
  };

  const createEmptySession = (): ChatHistoryItem => {
    const nowIso = new Date().toISOString();
    const baseMessages: Message[] = [{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }];

    return {
      id: makeSessionId(),
      label: 'Percakapan baru',
      preview: sessionPreviewFromMessages(baseMessages),
      category: 'konsultasi',
      updatedAt: nowIso,
      customLabel: false,
      messages: baseMessages,
    };
  };

  const normalizeStoredSession = (raw: unknown): ChatHistoryItem | null => {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as {
      id?: unknown;
      label?: unknown;
      preview?: unknown;
      updatedAt?: unknown;
      customLabel?: unknown;
      messages?: unknown;
    };

    if (typeof value.id !== 'string' || !value.id.trim()) return null;
    if (!Array.isArray(value.messages)) return null;

    const messages = value.messages
      .filter((msg) => {
        return !!msg && typeof msg === 'object' &&
          ((msg as { role?: unknown }).role === 'user' || (msg as { role?: unknown }).role === 'assistant') &&
          typeof (msg as { content?: unknown }).content === 'string' &&
          (msg as { content: string }).content.trim() !== '';
      })
      .map((msg) => ({
        role: (msg as { role: 'user' | 'assistant' }).role,
        content: (msg as { content: string }).content,
      }));

    if (!messages.length) return null;

    const updatedAt = typeof value.updatedAt === 'string' && value.updatedAt
      ? value.updatedAt
      : new Date().toISOString();

    return {
      id: value.id,
      label: typeof value.label === 'string' && value.label ? value.label : sessionTitleFromMessages(messages),
      preview: typeof value.preview === 'string' && value.preview ? value.preview : sessionPreviewFromMessages(messages),
      category: 'konsultasi',
      updatedAt,
      customLabel: value.customLabel === true,
      messages,
    };
  };

  const loadPatientSessionsFromStorage = () => {
    const email = getCurrentUserEmail();
    if (!email) {
      setHistoryItems([]);
      setConversation([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }]);
      setActiveHistoryId('aktif');
      setSessionsHydrated(false);
      return;
    }

    try {
      const key = buildPatientStorageKey(email);
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];

      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeStoredSession).filter((item): item is ChatHistoryItem => Boolean(item))
        : [];

      const sessions = normalized.length
        ? [...normalized].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        : [createEmptySession()];

      setHistoryItems(sessions);
      setActiveHistoryId(sessions[0].id);
      setConversation(sessions[0].messages);
      setSessionsHydrated(true);
    } catch {
      const fallback = createEmptySession();
      setHistoryItems([fallback]);
      setActiveHistoryId(fallback.id);
      setConversation(fallback.messages);
      setSessionsHydrated(true);
    }
  };

  const syncSessionMessages = (sessionId: string, messages: Message[]) => {
    const nowIso = new Date().toISOString();
    setHistoryItems((prev) => {
      const current = prev.find((item) => item.id === sessionId);
      const customLabel = current?.customLabel === true;
      const nextLabel = customLabel ? (current?.label || sessionTitleFromMessages(messages)) : sessionTitleFromMessages(messages);

      const updated: ChatHistoryItem = {
        id: sessionId,
        label: nextLabel,
        preview: sessionPreviewFromMessages(messages),
        category: 'konsultasi',
        updatedAt: nowIso,
        customLabel,
        messages,
      };

      const others = prev.filter((item) => item.id !== sessionId);
      return [updated, ...others];
    });
  };

  const createNewPatientSession = () => {
    const nextSession = createEmptySession();
    setHistoryItems((prev) => [nextSession, ...prev]);
    setActiveHistoryId(nextSession.id);
    setConversation(nextSession.messages);
    setSearchQuery('');
  };

  const renamePatientSession = (sessionId: string) => {
    const session = historyItems.find((item) => item.id === sessionId);
    if (!session) return;

    const nextTitle = window.prompt('Ganti judul percakapan:', session.label);
    if (nextTitle === null) return;

    const cleaned = nextTitle.trim();
    if (!cleaned) {
      toast({
        title: 'Judul tidak valid',
        description: 'Judul percakapan tidak boleh kosong.',
        variant: 'destructive',
      });
      return;
    }

    setHistoryItems((prev) => prev.map((item) => {
      if (item.id !== sessionId) return item;
      return {
        ...item,
        label: cleaned,
        customLabel: true,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const selectPatientSession = (sessionId: string) => {
    const selected = historyItems.find((item) => item.id === sessionId);
    if (!selected) return;
    setActiveHistoryId(sessionId);
    setConversation(selected.messages);
  };

  const deletePatientSession = (sessionId: string) => {
    const remaining = historyItems.filter((item) => item.id !== sessionId);
    const nextSessions = remaining.length ? remaining : [createEmptySession()];
    const nextActiveId = nextSessions.some((item) => item.id === activeHistoryId) && activeHistoryId !== sessionId
      ? activeHistoryId
      : nextSessions[0].id;
    const nextActiveSession = nextSessions.find((item) => item.id === nextActiveId) || nextSessions[0];

    setHistoryItems(nextSessions);
    setActiveHistoryId(nextActiveId);
    setConversation(nextActiveSession.messages);
  };

  const sidebarGroups = useMemo(() => {
    const keyword = searchQuery.toLowerCase();

    if (!isUserLoggedIn) {
      const latestMessage = conversation[conversation.length - 1]?.content || 'Belum ada percakapan.';
      const activeItem: ChatHistoryItem = {
        id: 'aktif',
        label: 'Sesi aktif',
        preview: summarizeText(latestMessage, 70),
        category: 'konsultasi',
        updatedAt: new Date().toISOString(),
        customLabel: false,
        messages: conversation,
      };

      const show = !keyword || activeItem.label.toLowerCase().includes(keyword) || activeItem.preview.toLowerCase().includes(keyword);
      return show ? [{ title: 'Saat ini', items: [activeItem] }] : [];
    }

    const filtered = historyItems.filter((item) => {
      return !keyword || item.label.toLowerCase().includes(keyword) || item.preview.toLowerCase().includes(keyword);
    });

    const grouped = filtered.reduce((acc, item) => {
      const title = toGroupLabel(item.updatedAt);
      if (!acc[title]) acc[title] = [];
      acc[title].push(item);
      return acc;
    }, {} as Record<string, ChatHistoryItem[]>);

    return Object.entries(grouped).map(([title, items]) => ({ title, items }));
  }, [conversation, historyItems, isUserLoggedIn, searchQuery]);

  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) {
          setIsUserLoggedIn(false);
          setIsPublicUser(false);
          return;
        }

        const parsed = JSON.parse(raw);
        if (parsed?.role === ROLE_PUBLIC) {
          localStorage.removeItem('user');
          setIsUserLoggedIn(false);
          setIsPublicUser(false);
          window.dispatchEvent(new Event('userUpdated'));
          return;
        }

        const isPatient = parsed?.role === ROLE_PATIENT && typeof parsed?.email === 'string' && parsed.email.trim() !== '';
        const isPublic = parsed?.role === ROLE_PUBLIC;
        setIsUserLoggedIn(isPatient);
        setIsPublicUser(isPublic);
        if (isPublic) setSidebarOpen(false);
      } catch {
        setIsUserLoggedIn(false);
        setIsPublicUser(false);
      }
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
    if (!isUserLoggedIn) {
      setHistoryItems([]);
      setConversation([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }]);
      setActiveHistoryId('aktif');
      setSessionsHydrated(false);
      return;
    }
    loadPatientSessionsFromStorage();
  }, [isUserLoggedIn]);

  useEffect(() => {
    if (!isUserLoggedIn || !sessionsHydrated) return;

    const email = getCurrentUserEmail();
    if (!email) return;

    localStorage.setItem(buildPatientStorageKey(email), JSON.stringify(historyItems));
  }, [historyItems, isUserLoggedIn, sessionsHydrated]);

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

    const guestMessageCount = conversation.filter((msg) => msg.role === 'user').length;
    if (!isUserLoggedIn && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
      const limitMessage = `Mode tamu dibatasi hingga ${GUEST_MESSAGE_LIMIT} pertanyaan per sesi. Silakan login untuk konsultasi lebih lanjut.`;
      toast({
        title: 'Batas mode tamu tercapai',
        description: limitMessage,
        variant: 'destructive',
      });
      setConversation((prev) => [...prev, {
        role: 'assistant',
        content: limitMessage,
      }]);
      return;
    }

    const userMessage = message;
    setMessage('');

    const sessionIdForMessage = isUserLoggedIn
      ? (activeHistoryId !== 'aktif' ? activeHistoryId : makeSessionId())
      : 'aktif';

    if (isUserLoggedIn && activeHistoryId === 'aktif') {
      setActiveHistoryId(sessionIdForMessage);
    }

    const newConversation: Message[] = [...conversation, { role: 'user', content: userMessage }];
    setConversation(newConversation);
    if (isUserLoggedIn) {
      syncSessionMessages(sessionIdForMessage, newConversation);
    }
    setIsLoading(true);

    try {
      const { isHealthRelated, isClear } = analyzeQuery(userMessage);

      if (!isClear) {
        const unclearConversation = [...newConversation, {
          role: 'assistant',
          content: 'Maaf, pertanyaan Anda kurang jelas. Mohon ajukan pertanyaan yang lebih spesifik agar saya dapat membantu dengan baik.'
        }];
        setConversation(unclearConversation);
        if (isUserLoggedIn) {
          syncSessionMessages(sessionIdForMessage, unclearConversation);
        }
        setIsLoading(false);
        return;
      }

      if (!isUserLoggedIn && !isHealthRelated) {
        const guestLimitedConversation = [...newConversation, {
          role: 'assistant',
          content: 'Mode tamu hanya melayani informasi kesehatan umum dan layanan Puskesmas (jam layanan, lokasi, pendaftaran, kontak, dan jadwal). Silakan login untuk konsultasi kesehatan yang lebih personal.'
        }];
        setConversation(guestLimitedConversation);
        if (isUserLoggedIn) {
          syncSessionMessages(sessionIdForMessage, guestLimitedConversation);
        }
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

      const aiResponse = await getGeminiResponse(chatMessages, isUserLoggedIn ? 'consultation' : 'public');
      const formattedResponse = formatAIResponse(aiResponse);

      const answeredConversation = [...newConversation, {
        role: 'assistant',
        content: formattedResponse
      }];
      setConversation(answeredConversation);
      if (isUserLoggedIn) {
        syncSessionMessages(sessionIdForMessage, answeredConversation);
      }

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
        errorDetail = `Silakan hubungi administrator untuk mengaktifkan layanan AI chatbot.\n\nUntuk konsultasi langsung:\n${supportContacts}`;
      } else if (errMsg.includes("QUOTA_EXCEEDED") || errMsg.includes("429") || errMsg.includes("Too Many Requests")) {
        errorMessage = "Quota API Habis";
        errorDetail = `Layanan chatbot AI telah mencapai batas penggunaan. Silakan coba lagi dalam beberapa menit atau hubungi admin untuk upgrade quota.\n\nUntuk konsultasi langsung:\n${supportContacts}`;
      } else if (errMsg.includes("MODEL_ERROR") || errMsg.includes("404") || errMsg.includes("not found")) {
        errorMessage = "Model AI Tidak Tersedia";
        errorDetail = `Sistem sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat atau hubungi:\n${supportContacts}`;
      } else if (errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "Layanan Sedang Sibuk";
        errorDetail = `Silakan coba lagi dalam beberapa saat.\n\nJika mendesak, hubungi:\n${supportContacts}`;
      } else if (errMsg.includes("SAFETY") || errMsg.includes("safety")) {
        errorMessage = "Pertanyaan Tidak Dapat Diproses";
        errorDetail = "Pastikan pertanyaan Anda sesuai dengan topik kesehatan dan pencegahan penyakit.";
      } else if (errMsg.includes("NetworkError") || errMsg.includes("Failed to fetch") || errMsg.toLowerCase().includes("network")) {
        errorMessage = "Koneksi Internet Bermasalah";
        errorDetail = "Silakan periksa koneksi internet Anda dan coba lagi.";
      } else {
        errorMessage = "Terjadi Kesalahan pada Chatbot";
        errorDetail = `${errMsg}\n\nUntuk bantuan langsung, hubungi:\n${supportContacts}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      const fullErrorMessage = errorDetail
        ? `${errorMessage}\n\n${errorDetail}`
        : `Maaf, terjadi kesalahan: ${errorMessage}\n\nSilakan coba lagi atau hubungi layanan dukungan berikut:\n${supportContacts}`;

      const errorConversation = [...newConversation, {
        role: 'assistant',
        content: fullErrorMessage
      }];
      setConversation(errorConversation);
      if (isUserLoggedIn) {
        syncSessionMessages(sessionIdForMessage, errorConversation);
      }
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
              <span className="font-medium text-emerald-600 min-w-[1.2rem] text-xs mt-0.5">{subItemCounter}.</span>
              <p className="text-slate-600 flex-1">{trimmedLine}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout hideAIAssistant={true}>
      <section className="py-6 lg:py-8">
        <div className="mx-auto max-w-[1400px] px-2 sm:px-4">
          {!isApiConfigured && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-semibold text-slate-700">Chatbot AI Belum Dikonfigurasi</h3>
                  <p className="mb-3 text-xs text-slate-500">Layanan AI belum aktif. Hubungi administrator untuk mengaktifkan.</p>
                  <div className="mb-3 rounded-lg border border-amber-100 bg-white p-3 text-xs">
                    <p className="mb-2 flex items-center gap-1 font-medium text-slate-600"><Wrench className="h-3.5 w-3.5" /> Untuk Admin/Developer:</p>
                    <ol className="ml-1 list-inside list-decimal space-y-1 text-slate-500">
                      <li>Buka <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-700">Google AI Studio</a></li>
                      <li>Login dan klik "Create API Key"</li>
                      <li>Tambahkan ke file backend/.env</li>
                      <li>Format: GEMINI_API_KEY=your_key</li>
                      <li>Restart backend server</li>
                    </ol>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white p-3 text-xs">
                    <p className="mb-1 flex items-center gap-1 font-medium text-slate-600"><PhoneIcon className="h-3.5 w-3.5" /> Hubungi langsung:</p>
                    <p className="text-slate-500">
                      WhatsApp: {publicLinks.whatsapp ? (
                        <a href={publicLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:text-emerald-700">{publicInfo.phone || publicInfo.whatsapp}</a>
                      ) : (
                        <span>Belum dikonfigurasi</span>
                      )}
                      <br />Email: {publicLinks.email ? (
                        <a href={publicLinks.email} className="font-medium text-emerald-600 hover:text-emerald-700">{publicInfo.email}</a>
                      ) : (
                        <span>Belum dikonfigurasi</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-white shadow-xl shadow-emerald-100/30">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/70" />

            {!isPublicUser && sidebarOpen && (
              <button
                type="button"
                aria-label="Tutup panel riwayat"
                className="fixed inset-0 z-20 bg-black/35 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <div className="flex min-h-[70vh] lg:min-h-[74vh]">
              {!isPublicUser && (
              <aside className={`absolute inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-gray-100 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pb-4 pt-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                        <Stethoscope className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight text-white">Puskesmas Wori</p>
                        <p className="text-xs leading-tight text-emerald-200">Asisten Konsultasi</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isUserLoggedIn) {
                        createNewPatientSession();
                      } else {
                        setConversation([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }]);
                        setActiveHistoryId('aktif');
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Chat Baru
                  </button>
                </div>

                <div className="border-b border-gray-100 px-3 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari percakapan..."
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto py-2">
                  {sidebarGroups.map((group) => {
                    return (
                      <div key={group.title}>
                        <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
                        {group.items.map((chat) => (
                          <button
                            key={chat.id}
                            type="button"
                            onClick={() => {
                              if (isUserLoggedIn) {
                                selectPatientSession(chat.id);
                              } else {
                                setActiveHistoryId(chat.id);
                              }
                              setSidebarOpen(false);
                            }}
                            className={`group relative mx-1 flex w-[calc(100%-8px)] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${activeHistoryId === chat.id ? 'border-emerald-200 bg-emerald-50' : 'border-transparent hover:bg-gray-50'}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm ${activeHistoryId === chat.id ? 'font-semibold text-emerald-800' : 'text-gray-800'}`}>{chat.label}</p>
                              <p className="mt-0.5 truncate text-xs text-gray-400">{chat.preview}</p>
                              <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-medium ${categoryStyles[chat.category] || categoryStyles.konsultasi}`}>
                                {categoryLabels[chat.category] || 'Konsultasi'}
                              </span>
                            </div>
                            {activeHistoryId === chat.id && <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />}
                            {isUserLoggedIn && (
                              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    renamePatientSession(chat.id);
                                  }}
                                  className="rounded-md p-1 text-gray-300 hover:bg-emerald-50 hover:text-emerald-500"
                                  title="Ganti judul"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePatientSession(chat.id);
                                  }}
                                  className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400"
                                  title="Hapus percakapan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </aside>
              )}

              <div className={`flex min-w-0 flex-1 flex-col ${isPublicUser ? 'bg-white' : 'bg-gray-50/80'}`}>
                <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
                  {!isPublicUser && (
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  )}
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[0.9375rem] font-semibold text-gray-900">Asisten Virtual Puskesmas</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <p className="font-medium text-emerald-600">Online • Siap membantu 24/7</p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${isUserLoggedIn ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>
                        {isUserLoggedIn ? <Stethoscope className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                        {isUserLoggedIn ? 'Mode Konsultasi' : (isPublicUser ? 'Mode Masyarakat' : 'Mode Info')}
                      </span>
                    </div>
                  </div>
                  {!isPublicUser && (
                  <div className="hidden items-center gap-4 text-xs text-gray-500 md:flex">
                    {publicInfo.address && (
                      <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {publicInfo.address}</div>
                    )}
                    {publicInfo.phone && (
                      <div className="flex items-center gap-1.5"><PhoneIcon className="h-3.5 w-3.5 text-gray-400" /> {publicInfo.phone}</div>
                    )}
                    {publicInfo.openHours && (
                      <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-400" /> {publicInfo.openHours}</div>
                    )}
                    {!publicInfo.address && !publicInfo.phone && !publicInfo.openHours && (
                      <div className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-gray-400" /> Kontak layanan belum dikonfigurasi</div>
                    )}
                  </div>
                  )}
                </div>

                {!isUserLoggedIn && (
                  <div className="mx-4 mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3.5">
                    <p className="text-xs text-slate-500">
                      Mode tamu aktif: Anda bisa bertanya informasi kesehatan umum dan layanan Puskesmas secara terbatas (maks {GUEST_MESSAGE_LIMIT} pertanyaan per sesi).
                      <strong className="text-slate-600"> Silakan login untuk konsultasi medis yang lebih lengkap.</strong>
                    </p>
                  </div>
                )}

                <div ref={chatContainerRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
                  {conversation.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="mt-1 shrink-0">
                        {msg.role === 'assistant' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                            <Stethoscope className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">Anda</div>
                        )}
                      </div>

                      <div className={`flex max-w-[88%] flex-col gap-2 sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'rounded-tl-sm border border-gray-100 bg-white text-gray-800 shadow-sm'}`}>
                          <FormattedMessage content={msg.content} />
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <div className="flex gap-1.5">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-emerald-300"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 bg-white p-3 sm:p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ketik pertanyaan Anda..."
                      className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-white transition-colors hover:from-emerald-600 hover:to-teal-700 disabled:bg-slate-300"
                      disabled={isLoading || !message.trim()}
                    >
                      <FaPaperPlane className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Konsultasi;
