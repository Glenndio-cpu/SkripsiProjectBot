import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { isStaffRole } from '../lib/roles';
import {
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';

interface ScheduleAnnouncement {
  id: number;
  category?: 'health_info' | 'schedule';
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  active: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
}

function getActorEmail(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (isStaffRole(u.role)) return u.email;
    }
  } catch {
    // Ignore malformed local storage data.
  }
  return '';
}

function formatDateLabel(dateValue?: string | null): string {
  if (!dateValue) return '-';
  const d = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateValue;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimeLabel(timeValue?: string | null): string {
  if (!timeValue) return '-';
  const base = timeValue.length >= 5 ? timeValue.slice(0, 5) : timeValue;
  return `${base} WITA`;
}

const ScheduleManagement = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleAnnouncement[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    eventDate: '',
    eventTime: '',
    location: '',
    content: '',
    priority: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (!isStaffRole(user.role)) {
      navigate('/');
      return;
    }

    setRole(user.role || '');
    void loadData();
  }, [navigate]);

  const isSessionInvalidError = (message: string): boolean => {
    const lower = message.toLowerCase();
    return lower.includes('sesi tidak valid') || lower.includes('login ulang') || lower.includes('http 401');
  };

  const handleExpiredSession = () => {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userUpdated'));
    navigate('/login', { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAnnouncements(getActorEmail(), 'schedule');
      setSchedules(data.announcements || []);
    } catch (err: any) {
      const msg = String(err?.message || 'Gagal memuat jadwal');
      if (isSessionInvalidError(msg)) {
        handleExpiredSession();
        return;
      }
      alert('Gagal memuat jadwal: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      eventDate: '',
      eventTime: '',
      location: '',
      content: '',
      priority: 0,
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: ScheduleAnnouncement) => {
    setForm({
      title: schedule.title || '',
      eventDate: schedule.eventDate ? schedule.eventDate.slice(0, 10) : '',
      eventTime: schedule.eventTime ? schedule.eventTime.slice(0, 5) : '',
      location: schedule.location || '',
      content: schedule.content || '',
      priority: schedule.priority || 0,
    });
    setEditId(schedule.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Nama kegiatan/jadwal wajib diisi');
      return;
    }
    if (!form.eventDate || !form.eventTime || !form.location.trim()) {
      alert('Tanggal, waktu, dan lokasi jadwal wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        adminEmail: getActorEmail(),
        category: 'schedule' as const,
        title: form.title.trim(),
        content: form.content.trim(),
        type: 'info',
        priority: form.priority,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        location: form.location.trim(),
      };

      if (editId) {
        await api.updateAnnouncement(editId, payload);
      } else {
        await api.createAnnouncement(payload);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Gagal menyimpan jadwal');
      if (isSessionInvalidError(msg)) {
        handleExpiredSession();
        return;
      }
      alert('Gagal: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (schedule: ScheduleAnnouncement) => {
    try {
      await api.updateAnnouncement(schedule.id, {
        adminEmail: getActorEmail(),
        category: 'schedule',
        active: !schedule.active,
      });
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Gagal mengubah status jadwal');
      if (isSessionInvalidError(msg)) {
        handleExpiredSession();
        return;
      }
      alert('Gagal: ' + msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await api.deleteAnnouncement(id, getActorEmail());
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Gagal menghapus jadwal');
      if (isSessionInvalidError(msg)) {
        handleExpiredSession();
        return;
      }
      alert('Gagal: ' + msg);
    }
  };

  const canEdit = role === 'nurse';

  const activeCount = useMemo(() => schedules.filter((s) => s.active).length, [schedules]);
  const upcomingCount = useMemo(
    () => schedules.filter((s) => {
      if (!s.eventDate || !s.eventTime) return false;
      const dt = new Date(`${s.eventDate}T${s.eventTime.slice(0, 5)}:00`);
      return !Number.isNaN(dt.getTime()) && dt.getTime() >= Date.now();
    }).length,
    [schedules]
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-500">Memuat jadwal layanan...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">Kelola Jadwal Berobat / Posyandu</h1>
            <p className="text-slate-500 text-sm mt-1">
              Input jadwal layanan terstruktur (tanggal, waktu, lokasi) agar pasien mengetahui kapan dan di mana layanan tersedia.
            </p>
          </div>
          {canEdit && !showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Jadwal
            </button>
          )}
        </div>

        {!canEdit && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Mode monitoring aktif. Hanya Tenaga Medis yang dapat membuat atau mengubah jadwal layanan.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{schedules.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Jadwal</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Aktif</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Akan Datang</p>
          </div>
        </div>

        {canEdit && showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">
                {editId ? 'Edit Jadwal Layanan' : 'Buat Jadwal Layanan Baru'}
              </h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Posyandu Balita"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Waktu</label>
                  <input
                    type="time"
                    value={form.eventTime}
                    onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Prioritas</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    min={0}
                    max={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Contoh: Balai Desa Wori"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  maxLength={255}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Catatan (opsional)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Contoh: Bawa buku KIA dan kartu BPJS"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editId ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {schedules.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada jadwal layanan</p>
            <p className="text-slate-400 text-sm mt-1">
              {canEdit
                ? 'Buat jadwal pertama agar pasien tahu kapan layanan tersedia'
                : 'Belum ada jadwal layanan untuk dipantau'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const scheduleDate = schedule.eventDate && schedule.eventTime
                ? new Date(`${schedule.eventDate}T${schedule.eventTime.slice(0, 5)}:00`)
                : null;
              const isPast = scheduleDate ? scheduleDate.getTime() < Date.now() : false;

              return (
                <div
                  key={schedule.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-opacity ${!schedule.active ? 'opacity-60 border-slate-200' : 'border-slate-100'}`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-700">{schedule.title}</h3>
                        {schedule.content && <p className="text-sm text-slate-500 mt-1">{schedule.content}</p>}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(schedule)}
                            className={`p-2 rounded-lg transition-colors ${schedule.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                            title={schedule.active ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {schedule.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDateLabel(schedule.eventDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
                        <Clock3 className="w-3.5 h-3.5" />
                        {formatTimeLabel(schedule.eventTime)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-50 text-violet-700 font-medium">
                        <MapPin className="w-3.5 h-3.5" />
                        {schedule.location || '-'}
                      </span>
                      {isPast && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">
                          Jadwal lewat
                        </span>
                      )}
                      {schedule.active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-500 font-medium">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;
