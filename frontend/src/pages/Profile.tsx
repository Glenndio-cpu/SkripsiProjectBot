import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ImageCropModal from '../components/ImageCropModal';
import api from '../lib/api';
import type { PatientNotification } from '../lib/api';
import { AlertTriangle, Camera, Phone, Mail, X, Trash2, Lock, User, Activity, CalendarDays, BarChart3, Users, Megaphone, UserPlus, Bell } from 'lucide-react';
import { getUserStats } from '../lib/userActivityTracking';
import { isAdminRole, isStaffRole, roleLabel } from '../lib/roles';
import { useRealtimeUser } from '../hooks/use-realtime-user';

function isWhatsappReady(phone?: string): boolean {
  if (!phone) return false;

  const clean = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  if (!/^\d{10,15}$/.test(clean)) return false;

  return clean.startsWith('62') || clean.startsWith('08') || clean.startsWith('8');
}

interface UserRecord {
  email?: string;
  phone?: string;
  ktp?: string;
  profileImage?: string;
  password?: string;
  name?: string;
  [key: string]: unknown;
}

interface ActivityRecord {
  userEmail?: string;
  [key: string]: unknown;
}

const readStoredUser = (): { name: string; email: string; phone?: string; ktp?: string; medicalHistory?: string; profileImage?: string; role?: string } | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Record<string, unknown>;
    return {
      name: typeof candidate.name === 'string' ? candidate.name : '',
      email: typeof candidate.email === 'string' ? candidate.email : '',
      phone: typeof candidate.phone === 'string' ? candidate.phone : '',
      ktp: typeof candidate.ktp === 'string' ? candidate.ktp : '',
      medicalHistory: typeof candidate.medicalHistory === 'string' ? candidate.medicalHistory : '',
      profileImage: typeof candidate.profileImage === 'string' ? candidate.profileImage : '',
      role: typeof candidate.role === 'string' ? candidate.role : undefined,
    };
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeUser = useRealtimeUser();
  const [user, setUser] = useState<{ name: string; email: string; phone?: string; ktp?: string; medicalHistory?: string; profileImage?: string; role?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [userStats, setUserStats] = useState({ consultationCount: 0, activeDaysCount: 0 });
  const [patientNotifications, setPatientNotifications] = useState<PatientNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    ktp: '',
    medicalHistory: '',
  });

  useEffect(() => {
    const parsedUser = readStoredUser();
    if (!parsedUser) {
      navigate('/login');
      return;
    }

    if (parsedUser.role === 'public') {
      navigate('/konsultasi');
      return;
    }

    setUser(parsedUser);
    setProfileImage(parsedUser.profileImage || '');
    setFormData(prev => ({
      ...prev,
      name: parsedUser.name,
      email: parsedUser.email,
      phone: parsedUser.phone || '',
      ktp: parsedUser.ktp || '',
      medicalHistory: parsedUser.medicalHistory || '',
    }));

    // Only load stats for patients, not staff roles
    if (!isStaffRole(parsedUser.role)) {
      const stats = getUserStats();
      if (stats instanceof Promise) {
        stats.then(s => setUserStats(s));
      } else {
        setUserStats(stats);
      }
      void loadPatientNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!realtimeUser || realtimeUser.role === 'public') return;

    const name = typeof realtimeUser.name === 'string' ? realtimeUser.name : '';
    const email = typeof realtimeUser.email === 'string' ? realtimeUser.email : '';
    const phone = typeof realtimeUser.phone === 'string' ? realtimeUser.phone : '';
    const ktp = typeof realtimeUser.ktp === 'string' ? realtimeUser.ktp : '';
    const medicalHistory = typeof realtimeUser.medicalHistory === 'string' ? realtimeUser.medicalHistory : '';
    const profileImage = typeof realtimeUser.profileImage === 'string' ? realtimeUser.profileImage : '';
    const role = typeof realtimeUser.role === 'string' ? realtimeUser.role : undefined;

    setUser((prev) => ({
      name: name || prev?.name || '',
      email: email || prev?.email || '',
      phone,
      ktp,
      medicalHistory,
      profileImage,
      role,
    }));
    setProfileImage(profileImage);

    if (!isEditing) {
      setFormData((prev) => ({
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        phone,
        ktp,
        medicalHistory,
      }));
    }
  }, [isEditing, realtimeUser]);

  useEffect(() => {
    if (!user?.email || isEditing) return;

    let isMounted = true;
    const intervalMs = 6000;

    const normalizeUser = (value: any) => ({
      email: typeof value?.email === 'string' ? value.email : '',
      name: typeof value?.name === 'string' ? value.name : '',
      phone: typeof value?.phone === 'string' ? value.phone : '',
      ktp: typeof value?.ktp === 'string' ? value.ktp : '',
      gender: typeof value?.gender === 'string' ? value.gender : '',
      age: typeof value?.age === 'number' ? value.age : (value?.age ?? null),
      medicalHistory: typeof value?.medicalHistory === 'string' ? value.medicalHistory : '',
      profileImage: typeof value?.profileImage === 'string' ? value.profileImage : '',
      role: typeof value?.role === 'string' ? value.role : 'patient',
    });

    const syncProfile = async () => {
      try {
        const data = await api.me();
        if (!isMounted || !data?.user) return;

        const serverUser = normalizeUser(data.user);
        const localRaw = localStorage.getItem('user');
        const localUser = localRaw ? normalizeUser(JSON.parse(localRaw)) : null;

        if (!localUser || JSON.stringify(localUser) !== JSON.stringify(serverUser)) {
          localStorage.setItem('user', JSON.stringify(serverUser));
          window.dispatchEvent(new Event('userUpdated'));
        }
      } catch (error) {
        // ignore sync errors; auth guard will handle invalid sessions
      }
    };

    void syncProfile();
    const timer = window.setInterval(syncProfile, intervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [isEditing, user?.email]);

  const loadPatientNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const data = await api.getPatientNotifications();
      setPatientNotifications(data.notifications || []);
      setUnreadNotificationCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error('Load patient notifications error:', error);
      setPatientNotifications([]);
      setUnreadNotificationCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await api.markPatientNotificationRead(id);
      setPatientNotifications((prev) => prev.map((item) => (
        item.id === id ? { ...item, isRead: true } : item
      )));
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      alert(error?.message || 'Gagal menandai notifikasi sebagai dibaca');
    }
  };

  const handleMarkAllNotificationRead = async () => {
    try {
      await api.markAllPatientNotificationsRead();
      setPatientNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (error: any) {
      alert(error?.message || 'Gagal menandai semua notifikasi');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar!');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB!');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setTempImageUrl(base64String);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfileImage(croppedImageUrl);

    const currentUser = readStoredUser() || { name: '', email: '', role: undefined };
    const updatedUser = { ...currentUser, profileImage: croppedImageUrl };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    // Update on backend
    api.updateProfile({ email: currentUser.email, profileImage: croppedImageUrl }).catch(console.error);

    window.dispatchEvent(new Event('userUpdated'));
    alert('Foto profil berhasil diperbarui!');
  };

  const handleRemoveImage = () => {
    setProfileImage('');

    const currentUser = readStoredUser() || { name: '', email: '', role: undefined };
    const updatedUser = { ...currentUser, profileImage: '' };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    // Update on backend
    api.updateProfile({ email: currentUser.email, profileImage: '' }).catch(console.error);

    window.dispatchEvent(new Event('userUpdated'));
    alert('Foto profil berhasil dihapus!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = formData.phone ? formData.phone.replace(/[\s()-]/g, '') : '';
    const phoneRegex = /^[0-9]{10,15}$/;
    const isPatient = !isStaffRole(user?.role);
    const complaintText = formData.medicalHistory.trim();

    if (isPatient && !cleanPhone) {
      alert('Nomor WhatsApp pasien wajib diisi untuk menerima broadcast.');
      return;
    }

    if (cleanPhone && !phoneRegex.test(cleanPhone)) {
      alert('Nomor telepon tidak valid (10-15 digit angka)');
      return;
    }

    const cleanKtp = formData.ktp ? formData.ktp.replace(/\D/g, '') : '';

    if (cleanKtp && !/^\d{16}$/.test(cleanKtp)) {
      alert('Nomor KTP harus 16 digit angka');
      return;
    }

    if (isPatient && !complaintText) {
      alert('Keluhan pasien wajib diisi');
      return;
    }

    try {
      await api.updateProfile({
        email: user?.email || '',
        name: formData.name,
        phone: cleanPhone,
        ktp: cleanKtp,
        profileImage: profileImage,
        medicalHistory: isPatient ? complaintText : undefined,
      });

      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        phone: cleanPhone,
        ktp: cleanKtp,
        profileImage: profileImage,
        medicalHistory: isPatient ? complaintText : user?.medicalHistory,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      window.dispatchEvent(new Event('userUpdated'));
      alert('Profil berhasil diperbarui!');
    } catch (error: any) {
      console.error('Save profile error:', error);
      alert(error.message || 'Terjadi kesalahan saat menyimpan profil!');
    }
  };

  const handleRemovePhone = async () => {
    if (!isStaffRole(user?.role)) {
      alert('Nomor WhatsApp pasien tidak dapat dilepas karena digunakan untuk broadcast informasi.');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin melepas nomor telepon dari akun ini?')) return;

    try {
      await api.updateProfile({ email: user?.email || '', phone: '' });

      const updatedUser = { ...user, phone: '' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData({ ...formData, phone: '' });
      window.dispatchEvent(new Event('userUpdated'));
      alert('Nomor telepon berhasil dilepas dari akun!');
    } catch (error: any) {
      alert(error.message || 'Gagal melepas nomor telepon!');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      alert('Password saat ini harus diisi!');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Password baru dan konfirmasi password tidak sama!');
      return;
    }
    if (formData.newPassword.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }

    try {
      const data = await api.changePassword(user?.email || '', formData.currentPassword, formData.newPassword);
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password berhasil diubah!');
    } catch (error: any) {
      console.error('Change password error:', error);
      alert(error.message || 'Gagal mengubah password!');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      alert('Masukkan password untuk konfirmasi penghapusan akun!');
      return;
    }

    try {
      await api.deleteAccount(user?.email || '', deleteConfirmPassword);
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('userUpdated'));
      alert('Akun berhasil dihapus. Terima kasih telah menggunakan layanan kami.');
      navigate('/login', { replace: true });
      void api.logout().catch(() => undefined);
    } catch (error: any) {
      console.error('Delete account error:', error);
      alert(error.message || 'Password salah! Penghapusan akun dibatalkan.');
    }
  };

  if (!user) {
    return <Layout><p className="text-center py-20 text-slate-400">Loading...</p></Layout>;
  }

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent";
  const whatsappReady = isWhatsappReady(user.phone || formData.phone);

  const stats = [
    { icon: Activity, label: 'Konsultasi', value: userStats.consultationCount },
    { icon: CalendarDays, label: 'Hari Aktif', value: userStats.activeDaysCount }
  ];

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-8">Akun Saya</h1>

          {/* Profile Card */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 sm:p-7 mb-5">

            {/* Avatar + Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-slate-100"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-emerald-50 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-emerald-500 border-2 border-slate-100">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Upload foto"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-slate-700 truncate">{user.name}</h2>
                <span className={`inline-block mt-1 mb-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${isStaffRole(user.role)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {roleLabel(user.role)}
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                </div>
                {user.phone && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-sm text-slate-500">{user.phone}</p>
                  </div>
                )}
                {!isStaffRole(user.role) && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${whatsappReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <Bell className="w-3 h-3" />
                      {whatsappReady ? 'WhatsApp siap menerima broadcast' : 'WhatsApp belum siap menerima broadcast'}
                    </span>
                  </div>
                )}
                {user.ktp && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-sm text-slate-500">KTP: {user.ktp}</p>
                  </div>
                )}
                {!isStaffRole(user.role) && (
                  <div className="flex items-start justify-center sm:justify-start gap-1.5 mt-1">
                    <Activity className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <p className="text-sm text-slate-500 line-clamp-2">
                      Keluhan: {user.medicalHistory ? user.medicalHistory : 'Belum diisi'}
                    </p>
                  </div>
                )}

                {/* Image Actions */}
                {profileImage && (
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      Ganti Foto
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={handleRemoveImage}
                      className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Profile */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" /> Edit Profil
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4 border-t border-slate-100 pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-slate-600 mb-1.5">Nomor Telepon</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`flex-1 ${inputClass}`}
                      placeholder="08123456789"
                    />
                    {isStaffRole(user?.role) && formData.phone && (
                      <button
                        type="button"
                        onClick={handleRemovePhone}
                        className="px-3 py-2 text-xs font-medium bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                      >
                        Lepas
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {!isStaffRole(user?.role)
                      ? 'Wajib diisi untuk menerima broadcast WhatsApp.'
                      : (formData.phone ? 'Satu nomor hanya untuk satu akun' : 'Opsional')}
                  </p>
                </div>

                <div>
                  <label htmlFor="ktp" className="block text-xs font-medium text-slate-600 mb-1.5">Nomor KTP</label>
                  <input
                    type="text"
                    id="ktp"
                    name="ktp"
                    value={formData.ktp}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="16 digit KTP"
                    inputMode="numeric"
                    maxLength={16}
                  />
                  <p className="mt-1 text-xs text-slate-400">Diisi jika Anda ingin melengkapi identitas pasien.</p>
                </div>

                {!isStaffRole(user.role) && (
                  <div>
                    <label htmlFor="medicalHistory" className="block text-xs font-medium text-slate-600 mb-1.5">Keluhan Penyakit</label>
                    <textarea
                      id="medicalHistory"
                      name="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={handleChange}
                      className={inputClass}
                      rows={3}
                      placeholder="Tuliskan keluhan penyakit Anda saat ini"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-400">Perbarui keluhan jika Anda datang kembali dengan penyakit yang berbeda.</p>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                    Simpan
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-medium text-slate-600 border border-slate-200 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Stats – only for patients */}
          {!isStaffRole(user.role) && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-100 rounded-xl p-4 sm:p-5 text-center">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <stat.icon className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-700">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Patient Info Reception */}
          {!isStaffRole(user.role) && (
            <div className="bg-white border border-emerald-100 rounded-xl p-5 sm:p-7 mb-5">
              <h3 className="text-lg font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" /> Informasi untuk Pasien
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Sebagai pasien, Anda akan menerima informasi jadwal berobat dan broadcast WhatsApp dari puskesmas.
              </p>
              <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${whatsappReady ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                Status nomor WhatsApp: <span className="font-semibold">{whatsappReady ? 'Siap menerima broadcast' : 'Belum siap menerima broadcast'}</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Informasi jadwal berobat ditampilkan pada banner beranda.</li>
                <li>• Broadcast WhatsApp dikirim ke nomor telepon pasien yang aktif.</li>
                <li>• Pastikan nomor telepon Anda terisi agar tidak melewatkan informasi.</li>
              </ul>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-slate-700">Notifikasi Informasi Kesehatan</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${unreadNotificationCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {unreadNotificationCount} belum dibaca
                    </span>
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationRead}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                </div>

                {notificationsLoading ? (
                  <p className="text-sm text-slate-400">Memuat notifikasi...</p>
                ) : patientNotifications.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada notifikasi informasi kesehatan.</p>
                ) : (
                  <div className="space-y-2">
                    {patientNotifications.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border px-3 py-2 ${item.isRead ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${item.isRead ? 'text-slate-700' : 'text-emerald-700'}`}>{item.title}</p>
                            <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{item.content}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(item.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          {!item.isRead && (
                            <button
                              onClick={() => handleMarkNotificationRead(item.id)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Sudah dibaca
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Password */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 sm:p-7 mb-5">
            <h3 className="text-lg font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" /> Ubah Password
            </h3>
            <p className="text-xs text-slate-400 mb-5">Pastikan password baru minimal 6 karakter</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Password Saat Ini</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Masukkan password saat ini"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Password Baru</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-600 mb-1.5">Konfirmasi Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ketik ulang password baru"
                  />
                </div>
              </div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                Ubah Password
              </button>
            </form>
          </div>

          {/* Danger Zone – only for patients */}
          {!isStaffRole(user.role) && (
            <div className="bg-white border border-red-100 rounded-xl p-5 sm:p-7">
              <h3 className="text-lg font-semibold text-red-600 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Zona Berbahaya
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Setelah menghapus akun, semua data Anda akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Hapus Akun Saya
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-sm w-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Hapus Akun?</h3>
              </div>
              <button onClick={() => { setShowDeleteDialog(false); setDeleteConfirmPassword(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Tindakan ini akan menghapus semua data Anda secara permanen:
            </p>
            <ul className="space-y-1.5 mb-5">
              {[
                `Profil dan informasi akun`,
                `Riwayat konsultasi (${userStats.consultationCount} konsultasi)`,
                `Aktivitas ${userStats.activeDaysCount} hari`
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Masukkan password untuk konfirmasi</label>
              <input
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                placeholder="Password akun Anda"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmPassword(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageUrl={tempImageUrl}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </Layout>
  );
};

export default Profile;
