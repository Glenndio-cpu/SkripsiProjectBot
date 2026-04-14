import { useState } from "react";
import {
  MessageSquarePlus,
  Search,
  ChevronRight,
  Stethoscope,
  Settings,
  HelpCircle,
  Clock,
  Trash2,
  X,
  Menu,
} from "lucide-react";

interface ChatHistory {
  id: string;
  title: string;
  preview: string;
  time: string;
  category: "umum" | "gizi" | "ibu-anak" | "lansia" | "lainnya";
}

const chatHistories: ChatHistory[] = [
  {
    id: "1",
    title: "Gejala Demam Berdarah",
    preview: "Anak saya demam sudah 3 hari...",
    time: "Hari ini",
    category: "umum",
  },
  {
    id: "2",
    title: "Jadwal Imunisasi Bayi",
    preview: "Kapan jadwal imunisasi DPT?",
    time: "Hari ini",
    category: "ibu-anak",
  },
  {
    id: "3",
    title: "Konsultasi Gizi Ibu Hamil",
    preview: "Makanan apa yang baik untuk ibu hamil?",
    time: "Kemarin",
    category: "gizi",
  },
  {
    id: "4",
    title: "Pendaftaran Berobat",
    preview: "Bagaimana cara daftar online?",
    time: "Kemarin",
    category: "umum",
  },
  {
    id: "5",
    title: "Tekanan Darah Tinggi",
    preview: "Bapak saya hipertensi, obatnya...",
    time: "2 hari lalu",
    category: "lansia",
  },
  {
    id: "6",
    title: "Posyandu Balita",
    preview: "Jadwal posyandu bulan ini kapan?",
    time: "3 hari lalu",
    category: "ibu-anak",
  },
  {
    id: "7",
    title: "Program KB",
    preview: "Mau konsultasi tentang KB spiral...",
    time: "Minggu lalu",
    category: "ibu-anak",
  },
  {
    id: "8",
    title: "Cek Kolesterol",
    preview: "Di mana bisa cek kolesterol gratis?",
    time: "Minggu lalu",
    category: "lansia",
  },
];

const categoryColors: Record<ChatHistory["category"], string> = {
  umum: "bg-blue-100 text-blue-700",
  gizi: "bg-orange-100 text-orange-700",
  "ibu-anak": "bg-pink-100 text-pink-700",
  lansia: "bg-purple-100 text-purple-700",
  lainnya: "bg-gray-100 text-gray-700",
};

const categoryLabels: Record<ChatHistory["category"], string> = {
  umum: "Umum",
  gizi: "Gizi",
  "ibu-anak": "Ibu & Anak",
  lansia: "Lansia",
  lainnya: "Lainnya",
};

interface SidebarProps {
  activeChat: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ activeChat, onSelectChat, onNewChat, isOpen, onClose }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = chatHistories.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filtered.reduce((acc, chat) => {
    const group = chat.time;
    if (!acc[group]) acc[group] = [];
    acc[group].push(chat);
    return acc;
  }, {} as Record<string, ChatHistory[]>);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-72 flex flex-col bg-white border-r border-gray-100 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 bg-gradient-to-br from-emerald-600 to-teal-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm leading-tight" style={{ fontWeight: 600 }}>
                  Puskesmas
                </p>
                <p className="text-emerald-200 text-xs leading-tight">Kecamatan Sehat</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
            style={{ fontWeight: 500 }}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span className="text-sm">Chat Baru</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari percakapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2">
          {Object.entries(grouped).map(([group, chats]) => (
            <div key={group} className="mb-1">
              <p className="px-4 py-1.5 text-xs text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                {group}
              </p>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 mx-1 rounded-xl transition-all group relative cursor-pointer ${ 
                    activeChat === chat.id
                      ? "bg-emerald-50 border border-emerald-200"
                      : "hover:bg-gray-50"
                  }`}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          activeChat === chat.id ? "text-emerald-800" : "text-gray-800"
                        }`}
                        style={{ fontWeight: activeChat === chat.id ? 600 : 400 }}
                      >
                        {chat.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{chat.preview}</p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded-md text-xs ${categoryColors[chat.category]}`}
                        style={{ fontWeight: 500 }}
                      >
                        {categoryLabels[chat.category]}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {activeChat === chat.id && (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                  </div>
                  {/* Hover Delete */}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2.5 top-2 p-1 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Clock className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Tidak ada percakapan ditemukan</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-3 py-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm">Bantuan</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-sm">Pengaturan</span>
          </button>
          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
              BU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>Budi Santoso</p>
              <p className="text-xs text-gray-400 truncate">Pasien Umum</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}