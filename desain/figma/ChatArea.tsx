import { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Bot,
  User,
  Stethoscope,
  Clock,
  MapPin,
  Phone,
  CalendarDays,
  Pill,
  HeartPulse,
  Baby,
  ChevronRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  time: string;
  type?: "text" | "card" | "options";
  cards?: ServiceCard[];
  options?: string[];
}

interface ServiceCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const quickReplies = [
  "Jam buka puskesmas",
  "Cara daftar berobat",
  "Jadwal imunisasi",
  "Konsultasi gizi",
  "Layanan lansia",
  "Cek kesehatan gratis",
];

const serviceCards: ServiceCard[] = [
  {
    icon: <CalendarDays className="w-5 h-5" />,
    title: "Pendaftaran Online",
    description: "Daftar antrian berobat secara online tanpa antre panjang",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: <Baby className="w-5 h-5" />,
    title: "KIA & Imunisasi",
    description: "Layanan kesehatan ibu dan anak, posyandu, imunisasi",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: <Pill className="w-5 h-5" />,
    title: "Farmasi",
    description: "Pengambilan obat dan konsultasi farmasi",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: <HeartPulse className="w-5 h-5" />,
    title: "Prolanis",
    description: "Program pengelolaan penyakit kronis: diabetes, hipertensi",
    color: "from-purple-500 to-violet-600",
  },
];

const initialMessages: Message[] = [
  {
    id: "1",
    role: "bot",
    content:
      "Selamat datang di **Chatbot Puskesmas Kecamatan Sehat** 👋\n\nSaya adalah asisten virtual yang siap membantu Anda dengan informasi seputar layanan kesehatan di puskesmas kami. Apa yang bisa saya bantu hari ini?",
    time: "09:00",
    type: "text",
  },
  {
    id: "2",
    role: "bot",
    content: "Berikut layanan yang tersedia:",
    time: "09:00",
    type: "card",
    cards: serviceCards,
  },
];

const botResponses: Record<string, string> = {
  default:
    "Terima kasih atas pertanyaan Anda. Saya akan mencarikan informasi yang tepat untuk Anda. Apakah ada hal lain yang ingin Anda tanyakan seputar layanan puskesmas?",
  jam: "🕐 **Jam Operasional Puskesmas Kecamatan Sehat:**\n\n• **Senin – Kamis:** 07.30 – 14.00 WIB\n• **Jumat:** 07.30 – 11.30 WIB\n• **Sabtu:** 07.30 – 13.00 WIB\n• **Minggu & Hari Libur:** Tutup\n\n⚠️ *Pendaftaran ditutup 30 menit sebelum jam tutup pelayanan.*",
  daftar:
    "📋 **Cara Mendaftar Berobat:**\n\n**Online (Aplikasi JKN Mobile):**\n1. Download aplikasi JKN Mobile\n2. Login dengan nomor BPJS\n3. Pilih menu 'Antrean Online'\n4. Pilih Puskesmas Kecamatan Sehat\n5. Pilih tanggal & poli tujuan\n\n**Langsung ke Puskesmas:**\n• Bawa KTP dan kartu BPJS\n• Datang ke loket pendaftaran\n• Ambil nomor antrean\n\n📞 Butuh bantuan? Hubungi: **(021) 1234-5678**",
  imunisasi:
    "💉 **Jadwal Imunisasi Bayi & Balita:**\n\n| Usia | Vaksin |\n|------|--------|\n| Lahir | HB-0, Polio-0 |\n| 1 bulan | BCG, Polio-1 |\n| 2 bulan | DPT-HB-Hib-1, Polio-2, RV-1 |\n| 3 bulan | DPT-HB-Hib-2, Polio-3, RV-2 |\n| 4 bulan | DPT-HB-Hib-3, Polio-4, IPV |\n| 9 bulan | Campak/MR |\n| 18 bulan | DPT-HB-Hib-4, Campak/MR-2 |\n\n📅 *Posyandu setiap Rabu, pukul 08.00 – 11.00 WIB*",
  gizi: "🥗 **Layanan Konsultasi Gizi:**\n\nKami menyediakan konsultasi gizi untuk:\n• ✅ Ibu hamil & menyusui\n• ✅ Bayi & balita kurang gizi\n• ✅ Penderita diabetes & hipertensi\n• ✅ Remaja dengan masalah gizi\n\n📅 **Jadwal Konsultasi:**\nSetiap Selasa & Kamis, 08.00 – 12.00 WIB\n\n👩‍⚕️ Konsultasi dengan Ahli Gizi kami GRATIS untuk peserta BPJS.",
  lansia:
    "👴 **Layanan Kesehatan Lansia:**\n\nPuskesmas kami menyediakan:\n• 🩺 Pemeriksaan kesehatan rutin\n• 💊 Prolanis (Hipertensi & Diabetes)\n• 🦷 Pemeriksaan gigi\n• 👁️ Pemeriksaan mata\n• 🧠 Senam lansia (Jumat, 06.30 WIB)\n\n🆓 **GRATIS** untuk lansia 60+ tahun dengan KTP",
  cek: "🩺 **Layanan Cek Kesehatan Gratis:**\n\nBerdasarkan program Pemerintah:\n• **Tekanan Darah** – setiap hari\n• **Gula Darah** – Senin & Kamis\n• **Kolesterol** – Rabu\n• **Asam Urat** – Selasa & Jumat\n\n✅ Gratis untuk peserta BPJS\n📍 Lokasi: Ruang Pemeriksaan Umum",
};

function getBotResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("jam") || lower.includes("buka") || lower.includes("tutup"))
    return botResponses.jam;
  if (lower.includes("daftar") || lower.includes("registrasi") || lower.includes("antrean"))
    return botResponses.daftar;
  if (lower.includes("imunisasi") || lower.includes("vaksin") || lower.includes("posyandu"))
    return botResponses.imunisasi;
  if (lower.includes("gizi") || lower.includes("nutrisi") || lower.includes("diet"))
    return botResponses.gizi;
  if (lower.includes("lansia") || lower.includes("tua") || lower.includes("prolanis"))
    return botResponses.lansia;
  if (lower.includes("cek") || lower.includes("periksa") || lower.includes("gratis") || lower.includes("kolesterol"))
    return botResponses.cek;
  return botResponses.default;
}

function formatMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? (
            <strong key={j} style={{ fontWeight: 600 }}>
              {part}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function ChatArea() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: getBotResponse(text),
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        type: "text",
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-gray-50">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            Asisten Virtual Puskesmas
          </h2>
          <p className="text-xs text-emerald-600" style={{ fontWeight: 500 }}>
            ● Online • Siap membantu 24/7
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>Jl. Kesehatan No. 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>(021) 1234-5678</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>07.30 – 14.00</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div className="shrink-0 mt-1">
              {msg.role === "bot" ? (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* Text Bubble */}
              {msg.type !== "card" && (
                <div
                  className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  {formatMessage(msg.content)}

                  {/* Actions */}
                  {msg.role === "bot" && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedId === msg.id ? "Disalin!" : "Salin"}</span>
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors ml-auto">
                        <RefreshCw className="w-3 h-3" />
                        <span>Ulangi</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Service Cards */}
              {msg.type === "card" && msg.cards && (
                <div>
                  <p className="text-sm text-gray-600 mb-2 px-1">{msg.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.cards.map((card, i) => (
                      <button
                        key={i}
                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all text-left group"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shrink-0`}
                        >
                          {card.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 group-hover:text-emerald-700 transition-colors" style={{ fontWeight: 600 }}>
                            {card.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{card.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 shrink-0 mt-1 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <span className="text-xs text-gray-400 px-1">{msg.time}</span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-1">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => sendMessage(reply)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              style={{ fontWeight: 500 }}
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <button className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors mb-0.5">
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pertanyaan Anda tentang layanan puskesmas..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none py-1.5 max-h-32"
            style={{ lineHeight: "1.5" }}
          />
          <div className="flex items-center gap-1.5 mb-0.5">
            <button className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className={`p-2 rounded-xl transition-all ${
                input.trim() && !isTyping
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-md hover:shadow-emerald-200 active:scale-95"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Chatbot ini hanya memberikan informasi umum. Untuk kondisi darurat, hubungi{" "}
          <span className="text-emerald-600" style={{ fontWeight: 500 }}>119</span>
        </p>
      </div>
    </div>
  );
}
