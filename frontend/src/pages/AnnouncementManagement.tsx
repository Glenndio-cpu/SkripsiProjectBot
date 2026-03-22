import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import {
  Bell, Plus, Trash2, Edit3, ToggleLeft, ToggleRight, Loader2,
  Info, AlertTriangle, CheckCircle, X, Calendar, ArrowUp, ArrowDown,
} from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  active: boolean;
  priority: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

const TYPE_OPTIONS = [
  { value: 'info', label: 'Informasi', color: 'bg-sky-100 text-sky-700', icon: Info },
  { value: 'warning', label: 'Peringatan', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  { value: 'success', label: 'Sukses', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  { value: 'urgent', label: 'Mendesak', color: 'bg-red-100 text-red-700', icon: Bell },
];

function getAdminEmail(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'nurse') return u.email;
    }
  } catch { /* */ }
  return '';
}

const AnnouncementManagement = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info' as string,
    priority: 0,
    expiresAt: '' as string,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const user = JSON.parse(userData);
    if (user.role !== 'nurse') { navigate('/'); return; }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAnnouncements(getAdminEmail());
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      alert('Gagal memuat pengumuman: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', content: '', type: 'info', priority: 0, expiresAt: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (ann: Announcement) => {
    setForm({
      title: ann.title,
      content: ann.content,
      type: ann.type,
      priority: ann.priority,
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 16) : '',
    });
    setEditId(ann.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      alert('Judul dan isi pengumuman wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        adminEmail: getAdminEmail(),
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
      };
      if (editId) {
        await api.updateAnnouncement(editId, payload);
      } else {
        await api.createAnnouncement(payload);
      }
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ann: Announcement) => {
    try {
      await api.updateAnnouncement(ann.id, {
        adminEmail: getAdminEmail(),
        active: !ann.active,
      });
      loadData();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await api.deleteAnnouncement(id, getAdminEmail());
      loadData();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
  };

  const getTypeConfig = (type: string) =>
    TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <span className="ml-3 text-slate-500">Memuat pengumuman...</span>
        </div>
      </Layout>
    );
  }

  const activeCount = announcements.filter(a => a.active).length;
  const expiredCount = announcements.filter(a => a.expiresAt && new Date(a.expiresAt) < new Date()).length;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">Kelola Pengumuman</h1>
            <p className="text-slate-500 text-sm mt-1">Buat pengumuman yang tampil sebagai banner di halaman Beranda</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Pengumuman
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{announcements.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Aktif</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{expiredCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Kedaluwarsa</p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">
                {editId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Judul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Jadwal Imunisasi Bulan Ini"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  maxLength={255}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Isi Pengumuman</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="Tulis isi pengumuman yang akan ditampilkan di banner..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tipe</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Prioritas</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
                    min={0}
                    max={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Angka lebih tinggi = muncul lebih dulu</p>
                </div>

                {/* Expires At */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Kedaluwarsa (opsional)</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Preview */}
              {form.title.trim() && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-400 mb-1.5">Preview Banner:</p>
                  <div className={`rounded-lg border p-3 flex items-start gap-3 ${
                    form.type === 'info' ? 'bg-sky-50 border-sky-200' :
                    form.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    form.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    {React.createElement(getTypeConfig(form.type).icon, {
                      className: `w-5 h-5 flex-shrink-0 mt-0.5 ${
                        form.type === 'info' ? 'text-sky-500' :
                        form.type === 'warning' ? 'text-amber-500' :
                        form.type === 'success' ? 'text-emerald-500' :
                        'text-red-500'
                      }`
                    })}
                    <div>
                      <p className={`text-sm font-semibold ${
                        form.type === 'info' ? 'text-sky-800' :
                        form.type === 'warning' ? 'text-amber-800' :
                        form.type === 'success' ? 'text-emerald-800' :
                        'text-red-800'
                      }`}>{form.title}</p>
                      {form.content.trim() && (
                        <p className={`text-sm mt-0.5 ${
                          form.type === 'info' ? 'text-sky-600' :
                          form.type === 'warning' ? 'text-amber-600' :
                          form.type === 'success' ? 'text-emerald-600' :
                          'text-red-600'
                        }`}>{form.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editId ? 'Simpan Perubahan' : 'Buat Pengumuman'}
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

        {/* List */}
        {announcements.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada pengumuman</p>
            <p className="text-slate-400 text-sm mt-1">Buat pengumuman pertama untuk ditampilkan di halaman Beranda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => {
              const cfg = getTypeConfig(ann.type);
              const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
              return (
                <div
                  key={ann.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-opacity ${
                    !ann.active || isExpired ? 'opacity-60 border-slate-200' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-4 p-4 sm:p-5">
                    {/* Type badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      {React.createElement(cfg.icon, { className: 'w-5 h-5' })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700">{ann.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{ann.content}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {ann.active && !isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            Aktif
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-600">
                            Kedaluwarsa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500">
                            Nonaktif
                          </span>
                        )}
                        {ann.priority > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-600">
                            <ArrowUp className="w-3 h-3" /> {ann.priority}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {ann.expiresAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            s/d {new Date(ann.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(ann)}
                        className={`p-2 rounded-lg transition-colors ${
                          ann.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                        title={ann.active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {ann.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(ann)}
                        className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default AnnouncementManagement;
