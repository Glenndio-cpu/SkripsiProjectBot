import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Users, Plus, Trash2, Edit3, Search, AlertCircle, CheckCircle, Loader, Eye, EyeOff, X } from 'lucide-react';
import api from '../lib/api';
import { isAdminRole, roleLabel, roleColor } from '../lib/roles';

interface User {
  email: string;
  name: string;
  phone?: string;
  ktp?: string;
  gender?: 'male' | 'female';
  age?: number;
  medicalHistory?: string;
  profileImage?: string;
  role: 'patient' | 'admin' | 'head' | 'nurse';
  createdAt: string;
}

function truncateText(value?: string, max = 60): string {
  const text = (value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] = useState<'staff' | 'user'>('staff'); // 'staff' atau 'user'
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for create user
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    ktp: string;
    gender: 'male' | 'female' | '';
    age: string;
    medicalHistory: string;
    ktpImage: string;
    ktpWithOwnerImage: string;
    role: 'patient' | 'admin' | 'head' | 'nurse';
  }>({
    name: '',
    email: '',
    password: '',
    phone: '',
    ktp: '',
    gender: '',
    age: '',
    medicalHistory: '',
    ktpImage: '',
    ktpWithOwnerImage: '',
    role: 'patient',
  });

  const [selectedRole, setSelectedRole] = useState<'patient' | 'admin' | 'head' | 'nurse'>('patient');

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      showMessage('error', 'Gagal memuat daftar user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Auth check
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (!isAdminRole(user.role)) {
      navigate('/');
      return;
    }

    loadUsers();
  }, [loadUsers, navigate]);

  // Filter users
  useEffect(() => {
    let filtered = [...users];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.phone && u.phone.includes(term)) ||
          (u.medicalHistory && u.medicalHistory.toLowerCase().includes(term))
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, users]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const streamUrl = api.getPatientComplaintsStreamUrl({ interval: 4 });
    const source = new EventSource(streamUrl, { withCredentials: true });

    const handleRefresh = () => {
      void loadUsers();
    };

    source.addEventListener('patient-complaints-updated', handleRefresh);

    return () => {
      source.close();
    };
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      setModalMessage({ type: 'error', text: 'Nama, email, dan password harus diisi' });
      return;
    }

    // Untuk user (pasien), KTP wajib diisi
    if (createModalType === 'user' && !formData.ktp) {
      setModalMessage({ type: 'error', text: 'Nomor KTP pasien harus diisi' });
      return;
    }

    if (createModalType === 'user' && !formData.ktpImage) {
      setModalMessage({ type: 'error', text: 'Foto KTP pasien harus diunggah' });
      return;
    }

    if (createModalType === 'user' && !formData.ktpWithOwnerImage) {
      setModalMessage({ type: 'error', text: 'Foto KTP dengan wajah pasien harus diunggah' });
      return;
    }

    if (createModalType === 'user' && !['male', 'female'].includes(formData.gender)) {
      setModalMessage({ type: 'error', text: 'Gender pasien wajib dipilih' });
      return;
    }

    const parsedAge = Number.parseInt(formData.age, 10);
    if (createModalType === 'user' && (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
      setModalMessage({ type: 'error', text: 'Umur pasien harus di antara 1 sampai 120 tahun' });
      return;
    }

    if (createModalType === 'user' && !formData.medicalHistory.trim()) {
      setModalMessage({ type: 'error', text: 'Keluhan atau riwayat penyakit wajib diisi' });
      return;
    }

    setIsSubmitting(true);
    setModalMessage({ type: 'info', text: 'Menyimpan user...' });

    try {
      const roleToUse = createModalType === 'user' ? 'patient' : formData.role;
      
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        ktp: formData.ktp || undefined,
        ktpImage: createModalType === 'user' ? formData.ktpImage : undefined,
        ktpWithOwnerImage: createModalType === 'user' ? formData.ktpWithOwnerImage : undefined,
        gender: createModalType === 'user' ? (formData.gender as 'male' | 'female') : undefined,
        age: createModalType === 'user' ? parsedAge : undefined,
        medicalHistory: createModalType === 'user' ? formData.medicalHistory.trim() : undefined,
        role: roleToUse,
      };

      console.log('Submitting user creation with payload:', { ...payload, ktpImage: '[base64...]', ktpWithOwnerImage: '[base64...]' });
      
      await api.createUser(payload);

      setModalMessage({ type: 'success', text: `${createModalType === 'staff' ? 'Staff' : 'User'} berhasil dibuat` });
      showMessage('success', `${createModalType === 'staff' ? 'Staff' : 'User'} berhasil dibuat`);
      
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        ktp: '',
        gender: '',
        age: '',
        medicalHistory: '',
        ktpImage: '',
        ktpWithOwnerImage: '',
        role: 'patient',
      });
      
      setTimeout(() => {
        setShowCreateModal(false);
        setModalMessage(null);
      }, 1500);
      
      loadUsers();
    } catch (error: any) {
      const errorMsg = error?.message || 'Gagal membuat user';
      console.error('Create user error:', error);
      setModalMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (field: 'ktpImage' | 'ktpWithOwnerImage') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setModalMessage({ type: 'error', text: 'File harus berupa gambar' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setModalMessage({ type: 'error', text: 'Ukuran file original terlalu besar (max 5MB)' });
        return;
      }

      setModalMessage({ type: 'info', text: 'Mengompres gambar...' });

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          setModalMessage({ type: 'error', text: 'Gagal membaca gambar' });
          return;
        }
        compressImage(result, field);
      };
      reader.onerror = () => setModalMessage({ type: 'error', text: 'Gagal memproses gambar' });
      reader.readAsDataURL(file);
    };

  const compressImage = (base64: string, field: 'ktpImage' | 'ktpWithOwnerImage') => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxWidth = 800;
      const maxHeight = 800;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setModalMessage({ type: 'error', text: 'Gagal mengompres gambar' });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.5);
      
      // Check compressed size
      const sizeInBytes = compressed.length * 0.75;
      if (sizeInBytes > 300 * 1024) {
        setModalMessage({ type: 'error', text: 'Gambar hasil kompresi masih terlalu besar. Gunakan gambar yang lebih kecil atau resolusi lebih rendah.' });
        return;
      }
      
      setFormData((prev) => ({ ...prev, [field]: compressed }));
      setModalMessage(null);
    };
    img.onerror = () => setModalMessage({ type: 'error', text: 'Gagal memproses gambar' });
    img.src = base64;
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      await api.updateUserRole(selectedUser.email, selectedRole);
      showMessage('success', `Role berhasil diubah ke ${roleLabel(selectedRole)}`);
      setShowRoleModal(false);
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal mengubah role');
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Yakin ingin menghapus user ${email}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await api.deleteUser(email);
      showMessage('success', 'User berhasil dihapus');
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal menghapus user');
    }
  };

  const getRoleColorClass = (role: string) => {
    const colors = roleColor(role);
    return `${colors.bg} ${colors.text}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="figma-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="figma-heading flex items-center gap-2"><Users size={28} />Manajemen User</h1>
              <p className="figma-caption mt-1">Kelola akun pengguna dan atur role sistem</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={() => {
                  setCreateModalType('user');
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    phone: '',
                    ktp: '',
                    gender: '',
                    age: '',
                    medicalHistory: '',
                    ktpImage: '',
                    ktpWithOwnerImage: '',
                    role: 'patient',
                  });
                  setModalMessage(null);
                  setShowCreateModal(true);
                }}
                className="figma-btn-secondary w-full sm:w-auto"
              >
                <Plus size={18} /> Tambah User
              </button>
              <button
                onClick={() => {
                  setCreateModalType('staff');
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    phone: '',
                    ktp: '',
                    gender: '',
                    age: '',
                    medicalHistory: '',
                    ktpImage: '',
                    ktpWithOwnerImage: '',
                    role: 'nurse',
                  });
                  setModalMessage(null);
                  setShowCreateModal(true);
                }}
                className="figma-btn-primary w-full sm:w-auto"
              >
                <Plus size={18} /> Tambah Staff
              </button>
            </div>
          </div>

          {/* Message */}
          {message && !showCreateModal && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <p>{message.text}</p>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="figma-card p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-emerald-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama, email, telepon, atau keluhan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="figma-input pl-10"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="figma-input"
          >
            <option value="all">Semua Role</option>
            <option value="patient">Pasien</option>
            <option value="nurse">Tenaga Medis</option>
            <option value="head">Kepala Puskesmas</option>
            <option value="admin">Admin IT Manager</option>
          </select>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="figma-card flex justify-center py-12">
            <Loader className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <div className="figma-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-emerald-50/70 border-b border-emerald-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Telepon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Keluhan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 uppercase">
                      Terdaftar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-emerald-700 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada user ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.email} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <span className="text-emerald-500 font-bold">
                                  {(user.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-emerald-900">{user.name}</p>
                              {user.ktp && (
                                <p className="text-xs text-gray-500">KTP: {user.ktp.slice(-4)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">{user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">{user.phone || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">
                            {truncateText(user.medicalHistory, 70)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleColorClass(
                              user.role
                            )}`}
                          >
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">
                            {new Date(user.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(user.role);
                                setShowRoleModal(true);
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Ubah role"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.email)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus user"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create User/Staff Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center">
            <div className="figma-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-emerald-100 px-6 py-4">
                <h2 className="text-xl font-bold text-emerald-900">
                  {createModalType === 'staff' ? 'Tambah Staff Baru' : 'Tambah User Baru'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setModalMessage(null);
                  }}
                  className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto px-6 py-4">
                {modalMessage && (
                  <div
                    className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${
                      modalMessage.type === 'error'
                        ? 'bg-red-50 border-red-300 text-red-800'
                        : modalMessage.type === 'info'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    {modalMessage.type === 'error' && <AlertCircle size={16} />}
                    {modalMessage.type === 'info' && <Loader size={16} className="animate-spin" />}
                    {modalMessage.type === 'success' && <CheckCircle size={16} />}
                    <span>{modalMessage.text}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="figma-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="figma-input"
                    required
                  />
                </div>

                {createModalType === 'staff' && (
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">
                      Role Staff *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as 'nurse' | 'head' | 'admin' })
                      }
                      className="figma-input"
                      required
                    >
                      <option value="nurse">Tenaga Medis</option>
                      <option value="head">Kepala Puskesmas</option>
                      <option value="admin">Admin IT Manager</option>
                    </select>
                  </div>
                )}

                {createModalType === 'user' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">
                        Nomor KTP *
                      </label>
                      <input
                        type="text"
                        value={formData.ktp}
                        onChange={(e) => setFormData({ ...formData, ktp: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                        className="figma-input"
                        placeholder="Contoh: 1234567890123456"
                        maxLength={16}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">
                          Gender *
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                          className="figma-input"
                          required
                        >
                          <option value="">Pilih gender</option>
                          <option value="male">Laki-laki</option>
                          <option value="female">Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">
                          Umur *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="figma-input"
                          placeholder="Contoh: 34"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">
                        Keluhan / Riwayat Penyakit *
                      </label>
                      <textarea
                        value={formData.medicalHistory}
                        onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                        className="figma-input min-h-24"
                        placeholder="Masukkan keluhan atau riwayat penyakit pasien"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">
                        Foto KTP *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload('ktpImage')}
                        className="block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-200"
                        required
                      />
                      {formData.ktpImage && (
                        <img
                          src={formData.ktpImage}
                          alt="Preview KTP"
                          className="mt-2 w-full h-36 object-contain rounded-lg border border-emerald-100 bg-emerald-50/30"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">
                        Foto KTP dengan Wajah *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload('ktpWithOwnerImage')}
                        className="block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-200"
                        required
                      />
                      {formData.ktpWithOwnerImage && (
                        <img
                          src={formData.ktpWithOwnerImage}
                          alt="Preview KTP dengan wajah"
                          className="mt-2 w-full h-36 object-contain rounded-lg border border-emerald-100 bg-emerald-50/30"
                        />
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="figma-input"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="figma-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                    >
                      {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                </div>

                <div className="flex gap-3 border-t border-emerald-100 bg-white px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setModalMessage(null);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Role Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="figma-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-emerald-900 mb-4">
                Ubah Role: {selectedUser.name}
              </h2>

              <div className="mb-6">
                <p className="text-sm text-emerald-700 mb-4">
                  Email: <span className="font-semibold">{selectedUser.email}</span>
                </p>

                <label className="block text-sm font-medium text-emerald-800 mb-2">
                  Pilih Role Baru
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as 'patient' | 'admin' | 'head' | 'nurse')
                  }
                  className="figma-input"
                >
                  <option value="patient">Pasien</option>
                  <option value="nurse">Tenaga Medis</option>
                  <option value="head">Kepala Puskesmas</option>
                  <option value="admin">Admin IT Manager</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="figma-btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="figma-btn-primary flex-1"
                >
                  Ubah Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserManagement;
