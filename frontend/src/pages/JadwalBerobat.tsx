import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { Bell, CalendarDays, CheckCircle, Clock3, Info, Loader2, MapPin } from 'lucide-react';

interface Announcement {
  id: number;
  category?: 'health_info' | 'schedule';
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  location?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  createdAt: string;
}

const typeClass: Record<string, string> = {
  info: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  urgent: 'bg-red-50 border-red-200 text-red-800',
}

const JadwalBerobat = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let active = true;

    api.getPublicAnnouncements({ category: 'schedule' })
      .then((data) => {
        if (!active) return;
        setAnnouncements(data.announcements || []);
      })
      .catch(() => {
        if (!active) return;
        setAnnouncements([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayAnnouncements = useMemo(() => announcements, [announcements]);

  return (
    <Layout>
      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">Jadwal Berobat</h1>
            <p className="text-slate-500 text-sm mt-2">
              Halaman ini menampilkan jadwal layanan kesehatan yang terstruktur berdasarkan tanggal, waktu, dan lokasi.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-emerald-500 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Pembaruan Jadwal</p>
                <p className="text-sm text-slate-600 mt-1">
                  Jadwal dapat berubah sewaktu-waktu. Pantau halaman ini secara berkala dan pastikan nomor WhatsApp Anda aktif untuk menerima broadcast.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat jadwal...
            </div>
          ) : displayAnnouncements.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
              <Info className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Belum ada informasi jadwal berobat.</p>
              <p className="text-slate-400 text-sm mt-1">Silakan cek kembali nanti.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayAnnouncements.map((ann) => (
                <article
                  key={ann.id}
                  className={`rounded-xl border p-4 sm:p-5 ${typeClass[ann.type] || typeClass.info}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{ann.title}</h2>
                      {ann.content && <p className="text-sm mt-1 leading-relaxed">{ann.content}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/70 font-medium">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {ann.eventDate
                            ? new Date(`${ann.eventDate}T00:00:00`).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                            : 'Tanggal belum diatur'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/70 font-medium">
                          <Clock3 className="w-3.5 h-3.5" />
                          {ann.eventTime ? `${ann.eventTime.slice(0, 5)} WITA` : 'Waktu belum diatur'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/70 font-medium">
                          <MapPin className="w-3.5 h-3.5" />
                          {ann.location || 'Lokasi belum diatur'}
                        </span>
                      </div>
                    </div>
                    <Bell className="w-4 h-4 flex-shrink-0 mt-1" />
                  </div>
                  <div className="mt-3 text-xs opacity-80">
                    Diperbarui: {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 bg-white border border-emerald-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Tips untuk Pasien</p>
                <ul className="mt-1 text-sm text-slate-600 space-y-1">
                  <li>• Datang 15-30 menit sebelum jadwal pelayanan.</li>
                  <li>• Bawa dokumen yang diperlukan (KTP/BPJS jika ada).</li>
                  <li>• Pastikan nomor WhatsApp di profil Anda aktif untuk broadcast.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default JadwalBerobat;