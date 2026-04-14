import {
  MapPin,
  Phone,
  Clock,
  Globe,
  Star,
  Users,
  Calendar,
  Award,
  ChevronRight,
  AlertCircle,
  Syringe,
  Heart,
} from "lucide-react";

const announcements = [
  {
    id: 1,
    type: "info",
    title: "Pelayanan Vaksin HPV",
    desc: "Tersedia setiap Senin–Rabu untuk siswi SD & SMP",
    time: "Mulai 15 April 2026",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    iconColor: "text-blue-500",
  },
  {
    id: 2,
    type: "urgent",
    title: "Stok Darah Menipis",
    desc: "Butuh pendonor darah golongan B dan O",
    time: "Segera",
    color: "bg-red-50 border-red-200 text-red-800",
    iconColor: "text-red-500",
  },
  {
    id: 3,
    type: "event",
    title: "Posyandu Balita",
    desc: "Pemantauan tumbuh kembang & imunisasi",
    time: "Rabu, 16 April 2026",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    iconColor: "text-emerald-500",
  },
];

const doctors = [
  {
    name: "dr. Rina Kusuma",
    specialty: "Dokter Umum",
    status: "available",
    avatar: "RK",
    color: "from-emerald-400 to-teal-500",
  },
  {
    name: "dr. Budi Setiawan",
    specialty: "Dokter Gigi",
    status: "busy",
    avatar: "BS",
    color: "from-blue-400 to-indigo-500",
  },
  {
    name: "Ns. Sari Dewi",
    specialty: "Perawat – KIA",
    status: "available",
    avatar: "SD",
    color: "from-pink-400 to-rose-500",
  },
  {
    name: "Apt. Hendra",
    specialty: "Apoteker",
    status: "available",
    avatar: "HN",
    color: "from-amber-400 to-orange-500",
  },
];

const stats = [
  { label: "Pasien Hari Ini", value: "142", icon: <Users className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-50" },
  { label: "Rating Layanan", value: "4.8", icon: <Star className="w-4 h-4" />, color: "text-amber-600 bg-amber-50" },
  { label: "Dokter Aktif", value: "6", icon: <Award className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
  { label: "Antrian Saat Ini", value: "23", icon: <Calendar className="w-4 h-4" />, color: "text-purple-600 bg-purple-50" },
];

export function InfoPanel() {
  return (
    <aside className="hidden xl:flex flex-col w-72 bg-white border-l border-gray-100 overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <h3 className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
          Info Puskesmas
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Informasi terkini & layanan</p>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-2 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <div className={`p-1.5 rounded-lg ${stat.color} mb-1.5`}>{stat.icon}</div>
            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.125rem" }}>{stat.value}</p>
            <p className="text-xs text-gray-400 text-center leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Contact Info */}
      <div className="px-4 pb-4 border-b border-gray-100">
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-snug">
              Jl. Kesehatan Raya No. 1, Kel. Sehat Makmur, Kec. Sehat, Jakarta Timur
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-gray-600">(021) 1234-5678</p>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p>Sen–Kam: 07.30 – 14.00</p>
              <p>Jumat: 07.30 – 11.30</p>
              <p>Sabtu: 07.30 – 13.00</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-600 hover:underline cursor-pointer">puskesmaskecsehat.go.id</p>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Pengumuman</h4>
          <button className="text-xs text-emerald-600 hover:underline">Lihat semua</button>
        </div>
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-3 rounded-xl border text-xs leading-snug ${ann.color}`}
            >
              <div className="flex items-start gap-2">
                {ann.type === "urgent" ? (
                  <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${ann.iconColor}`} />
                ) : ann.type === "event" ? (
                  <Syringe className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${ann.iconColor}`} />
                ) : (
                  <Heart className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${ann.iconColor}`} />
                )}
                <div>
                  <p style={{ fontWeight: 600 }}>{ann.title}</p>
                  <p className="opacity-80 mt-0.5">{ann.desc}</p>
                  <p className="opacity-60 mt-1">{ann.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctors on Duty */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Tenaga Medis</h4>
          <button className="text-xs text-emerald-600 hover:underline">Lihat semua</button>
        </div>
        <div className="space-y-2">
          {doctors.map((doc, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${doc.color} flex items-center justify-center text-white text-xs shrink-0`}
                style={{ fontWeight: 700 }}
              >
                {doc.avatar}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-gray-800 truncate" style={{ fontWeight: 600 }}>
                  {doc.name}
                </p>
                <p className="text-xs text-gray-400">{doc.specialty}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    doc.status === "available" ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
