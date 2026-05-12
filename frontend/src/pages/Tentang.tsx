import React from 'react';
import Layout from '../components/layout/Layout';
import {
  Eye,
  ShieldAlert,
  Info,
  Stethoscope,
  CalendarDays,
  Megaphone,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Users,
} from 'lucide-react';
import { formatPhoneDisplay, publicInfo, publicLinks } from '../lib/publicInfo';

const identitasInstansi = {
  namaInstansi: 'UPTD Puskesmas Wori',
  lokasi: 'Desa Wori, Kecamatan Wori, Kabupaten Minahasa Utara',
  visi: 'Kecamatan Wori HEBAT untuk Perubahan dan Kemajuan serta Kesejahteraan Berlandaskan Iman dan Gotong Royong.',
  misi: [
    'Meningkatkan kualitas sumber daya.',
    'Meningkatkan kualitas pelayanan publik yang lebih baik, cepat, mudah, dan bebas.',
  ],
};

const layananKesehatan = [
  {
    icon: Stethoscope,
    title: 'Upaya Kesehatan Perseorangan (UKP)',
    items: [
      'Pemeriksaan Umum',
      'Kesehatan Gigi dan Mulut',
      'Pelayanan KIA - KB',
      'Gawat Darurat',
      'Pelayanan Gizi',
      'Persalinan',
      'Kefarmasian / Apotek',
      'Laboratorium',
    ],
  },
  {
    icon: Info,
    title: 'UKM Esensial',
    items: [
      'Promosi Kesehatan',
      'Kesehatan Lingkungan',
      'Pelayanan KIA/KB',
      'Pelayanan Gizi',
      'Pencegahan dan Pengendalian Penyakit',
    ],
  },
  {
    icon: Megaphone,
    title: 'UKM Pengembangan',
    items: [
      'Kesehatan Jiwa',
      'Kesehatan Gigi Masyarakat',
      'Kesehatan Tradisional Komplementer',
      'Kesehatan Olahraga',
      'Kesehatan Lansia',
      'Kesehatan Pra Nikah',
      'Usaha Kesehatan Sekolah (UKS)',
      'Keperawatan Kesehatan Masyarakat',
    ],
  },
];

const jadwalOperasional = [
  {
    layanan: 'Gawat Darurat dan Persalinan',
    jadwal: '24 jam (setiap hari)',
  },
  {
    layanan: 'Pelayanan Umum, Gigi, Lansia, KIA, Lab, Farmasi',
    jadwal: 'Senin - Kamis: 08.00 - 12.00 WITA | Jumat - Sabtu: 08.00 - 10.00 WITA',
  },
  {
    layanan: 'Konsultasi Sanitasi dan Gizi',
    jadwal: 'Rabu: 08.00 - 12.00 WITA | Jumat: 08.00 - 10.00 WITA',
  },
];

const janjiLayananJkn = [
  'Tidak meminta dokumen fotokopi kepada peserta sebagai syarat pendaftaran.',
  'Memberikan pelayanan tanpa biaya tambahan (gratis).',
  'Melayani peserta yang berada di luar wilayah FKTP terdaftarnya sesuai ketentuan.',
  'Memberikan pelayanan obat yang dibutuhkan dan tidak membebankan peserta untuk mencari obat jika terjadi kekosongan.',
  'Melayani konsultasi online kepada peserta JKN.',
  'Melayani peserta dengan ramah tanpa diskriminasi.',
];

const programPromosi = [
  {
    title: 'Edukasi Gizi (Isi Piringku)',
    items: [
      'Lauk-pauk: 1/3 dari setengah piring.',
      'Buah-buahan: 1/3 dari setengah piring.',
      'Sayuran: 2/3 dari setengah piring.',
      'Makanan pokok: 2/3 dari setengah piring.',
    ],
  },
  {
    title: 'Layanan Posyandu (Manjo ke Posyandu)',
    items: [
      'Pantau pertumbuhan bayi/balita.',
      'Imunisasi lengkap gratis.',
      'Pemberian makanan tambahan, vitamin A, dan obat cacing.',
      'Pemberian tablet tambah darah bagi ibu.',
      'Edukasi kesehatan menyeluruh untuk anak usia 0-5 tahun.',
    ],
  },
];

const alurPendaftaranPasien = [
  'Pasien datang ke gedung puskesmas.',
  'Pasien mengambil kartu antrean dari petugas.',
  'Pasien menyerahkan kartu antrean dan identitas (KTP/KK/BPJS/SIM/Kartu Kunjungan) ke loket.',
  'Petugas melakukan verifikasi kartu kunjungan dan pencatatan identitas.',
  'Pengecekan status pasien: pasien baru dicatat di buku register, pasien lama dicari berkas rekam mediknya.',
  'Petugas loket menyerahkan status rekam medik ke Ruang Pemeriksaan Umum (R. PU).',
  'Petugas memastikan kembali kelengkapan pengisian data rekam medik.',
  'Petugas menginput data pendaftaran ke aplikasi SIKDA Generik.',
  'Pendaftaran selesai, pasien menunggu panggilan di ruang tunggu.',
];

const rumahSakitRujukan = [
  'RSUP Prof. R.D. Kandou Manado',
  'RSUD ODSK Provinsi Sulawesi Utara',
  'RS TK. II Robert Wolter Monginsidi',
  'RSU Pancaran Kasih',
  'RS Advent Manado',
  'RSAU Dr. Charles P.J. Suoth Sam Ratulangi',
  'RS Manado Medical Center',
  'RS Hermina',
  'RS Siloam Manado',
  'RS Sentra Medika',
  'RSUD Maria Walanda Maramis',
  'RSU Hermana Lembean',
  'RSU Tonsea GMIM',
  'RS Mata Sulawesi Utara',
  'Klinik Utama Mata Prov. Sulut',
  'RSJ Prof. Dr. V.K. Ratumbuysang',
];

const timPengembang = [
  'Glenndio Reyza Umboh',
  'Rodrico Wullur',
  'Dody T Laongky',
];

const Tentang = () => {
  const puskesmasName = publicInfo.name || 'Puskesmas Wori Online';
  const formattedPhone = publicInfo.phone ? formatPhoneDisplay(publicInfo.phone) : '';
  const formattedWhatsapp = publicInfo.whatsapp
    ? formatPhoneDisplay(publicInfo.whatsapp)
    : formattedPhone;

  const kontakResmi = [
    {
      icon: Phone,
      label: 'Telepon',
      value: formattedPhone || 'Belum dikonfigurasi',
      href: publicLinks.phone || undefined,
    },
    {
      icon: Phone,
      label: 'WhatsApp',
      value: formattedWhatsapp || 'Belum dikonfigurasi',
      href: publicLinks.whatsapp || undefined,
    },
    {
      icon: Mail,
      label: 'Email',
      value: publicInfo.email || 'Belum dikonfigurasi',
      href: publicLinks.email || undefined,
    },
    {
      icon: MapPin,
      label: 'Alamat',
      value: publicInfo.address || 'Belum dikonfigurasi',
      href: undefined,
    },
  ];

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-3 py-1 rounded-full mb-4">
            <Stethoscope className="w-4 h-4" />
            Profil Layanan
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-700 mb-4 leading-tight">
            Tentang {puskesmasName}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {puskesmasName} adalah layanan digital resmi untuk memudahkan masyarakat mendapatkan
            informasi kesehatan yang cepat, jelas, dan terpercaya, termasuk layanan, jadwal, alur pendaftaran,
            dan komunikasi resmi dengan puskesmas.
          </p>
        </div>
      </section>

      {/* Identitas dan Visi Misi */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-3">Identitas Instansi</h2>
            <div className="space-y-2 text-slate-600">
              <p><span className="font-semibold">Nama Instansi:</span> {identitasInstansi.namaInstansi}</p>
              <p><span className="font-semibold">Lokasi:</span> {identitasInstansi.lokasi}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-3">Visi dan Misi</h2>
            <p className="text-slate-600 leading-relaxed mb-3"><span className="font-semibold">Visi:</span> {identitasInstansi.visi}</p>
            <div className="space-y-2.5 text-slate-600">
              <p className="font-semibold">Misi:</p>
              {identitasInstansi.misi.map((misi, index) => (
                <p key={misi}>{index + 1}. {misi}</p>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Daftar Layanan */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-10">Daftar Layanan Kesehatan</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {layananKesehatan.map((group) => (
              <article key={group.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <group.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-slate-700 leading-snug mb-3">{group.title}</h3>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Jadwal Operasional */}
      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Jadwal Operasional Pelayanan</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jadwalOperasional.map((item) => (
              <div key={item.layanan} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-700">{item.layanan}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{item.jadwal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Janji Layanan JKN */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Janji Layanan JKN</h2>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 md:p-8 shadow-sm">
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              Menerima NIK/KTP/KIS Digital untuk pendaftaran pelayanan.
            </p>

            <div className="space-y-3">
              {janjiLayananJkn.map((item, index) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                    {index + 1}
                  </span>
                  <p className="text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Program Promosi */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Program Promosi Kesehatan dan Edukasi</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {programPromosi.map((program) => (
              <article key={program.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-700 mb-3">{program.title}</h3>
                <div className="space-y-2">
                  {program.items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Alur Pendaftaran */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Alur Pendaftaran Pasien</h2>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <div className="space-y-3">
              {alurPendaftaranPasien.map((langkah, index) => (
                <div key={langkah} className="flex items-start gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                    {index + 1}
                  </span>
                  <p className="text-slate-700">{langkah}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rumah Sakit Rujukan */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Rumah Sakit Rujukan</h2>
          <p className="text-center text-slate-500 max-w-3xl mx-auto mb-8">
            Daftar rujukan berikut digunakan untuk membantu pasien mendapatkan layanan lanjutan sesuai kebutuhan medis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rumahSakitRujukan.map((rumahSakit, index) => (
              <div key={rumahSakit} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold text-emerald-700 mr-1">{index + 1}.</span>
                  {rumahSakit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keamanan dan Batasan */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-3">Privasi dan Keamanan Data</h2>
            <p className="text-slate-600 leading-relaxed">
              Data pengguna digunakan untuk mendukung pelayanan kesehatan dan peningkatan mutu layanan.
              Data pribadi tidak dibagikan kepada pihak yang tidak berwenang.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Info className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-3">Batasan Layanan Digital</h2>
            <p className="text-slate-600 leading-relaxed">
              Informasi chatbot bersifat edukasi awal dan tidak menggantikan pemeriksaan klinis atau
              diagnosis dokter. Untuk kebutuhan penanganan lanjut, masyarakat tetap disarankan datang
              langsung ke fasilitas kesehatan.
            </p>
          </article>
        </div>
      </section>

      {/* Kondisi Darurat */}
      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-red-800 mb-1">Kondisi Darurat</h2>
                <p className="text-red-700 leading-relaxed">
                  Untuk kondisi gawat seperti sesak napas berat, nyeri dada hebat, penurunan kesadaran,
                  perdarahan aktif, atau kejang, segera menuju IGD atau fasilitas kesehatan terdekat.
                  Jangan menunda penanganan darurat hanya karena menunggu respons chat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tim Pengembang */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700">Tim Pengembang</h2>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">Website ini dikembangkan oleh peneliti skripsi dari Universitas Klabat:</p>
              {timPengembang.map((nama, index) => (
                <div key={nama} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700">Peneliti {index + 1}: {nama}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-8">Kontak Resmi</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {kontakResmi.map((item) => (
              <article key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="text-slate-700 font-semibold hover:text-emerald-600 transition-colors break-all"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-slate-700 font-semibold break-all">{item.value}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 md:p-6 text-emerald-900">
            <p>
              <span className="font-semibold">Jadwal layanan umum:</span>{' '}
              Senin - Kamis: 08.00 - 12.00 WITA | Jumat - Sabtu: 08.00 - 10.00 WITA
            </p>
            <p className="mt-1">
              <span className="font-semibold">Layanan 24 jam:</span>{' '}
              Gawat Darurat dan Persalinan
            </p>
            <p className="mt-1">
              <span className="font-semibold">Estimasi respons online:</span>{' '}
              {publicInfo.contactResponseTime}
            </p>
            {publicLinks.website && (
              <p className="mt-1">
                <span className="font-semibold">Website:</span>{' '}
                <a
                  href={publicLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-emerald-400 hover:text-emerald-700"
                >
                  {publicLinks.website}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Penutup */}
      <section className="pt-2 pb-14 md:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-600 leading-relaxed">
            Terima kasih telah menggunakan {puskesmasName}. Dukungan dan masukan masyarakat akan
            terus membantu kami meningkatkan kualitas pelayanan untuk kesehatan bersama.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Tentang;