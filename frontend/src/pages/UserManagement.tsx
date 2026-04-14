import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Users, Plus, Trash2, Edit3, Search, AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { isAdminRole, roleLabel, roleColor } from '../lib/roles';

interface User {
  email: string;
  name: string;
  phone?: string;
  ktp?: string;
  role: 'patient' | 'admin' | 'head' | 'nurse';
  createdAt: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form state for create user
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    ktp: string;
    role: 'patient' | 'admin' | 'head' | 'nurse';
  }>({
    name: '',
    email: '',
    password: '',
    phone: '',
    ktp: '',
    role: 'patient',
  });

  const [selectedRole, setSelectedRole] = useState<'patient' | 'admin' | 'head' | 'nurse'>('patient');

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
  }, [navigate]);

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
          (u.phone && u.phone.includes(term))
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, users]);

  const loadUsers = async () => {
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
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      showMessage('error', 'Nama, email, dan password harus diisi');
      return;
    }

    if (formData.role === 'patient' && !formData.ktp) {
      showMessage('error', 'Nomor KTP pasien harus diisi');
      return;
    }

    try {
      await api.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        ktp: formData.ktp || undefined,
        role: formData.role,
      });

      showMessage('success', 'User berhasil dibuat');
      setFormData({ name: '', email: '', password: '', phone: '', ktp: '', role: 'patient' });
      setShowCreateModal(false);
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal membuat user');
    }
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="figma-btn-primary"
            >
              <Plus size={18} /> Tambah User
            </button>
          </div>

          {/* Message */}
          {message && (
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
              placeholder="Cari nama, email, atau telepon..."
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
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada user ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.email} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-emerald-900">{user.name}</p>
                            {user.ktp && (
                              <p className="text-xs text-gray-500">KTP: {user.ktp.slice(-4)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">{user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">{user.phone || '-'}</p>
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

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="figma-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-emerald-900 mb-4">Tambah User Baru</h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="figma-input pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                      aria-label={showCreatePassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="figma-input"
                    placeholder="62812345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'patient' | 'admin' | 'head' | 'nurse',
                      })
                    }
                    className="figma-input"
                    required
                  >
                    <option value="patient">Pasien</option>
                    <option value="nurse">Tenaga Medis</option>
                    <option value="head">Kepala Puskesmas</option>
                    <option value="admin">Admin IT Manager</option>
                  </select>
                </div>

                {formData.role === 'patient' && (
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">
                      Nomor KTP (16 digit) *
                    </label>
                    <input
                      type="text"
                      value={formData.ktp}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ktp: e.target.value.replace(/\D/g, '').slice(0, 16),
                        })
                      }
                      className="figma-input"
                      placeholder="1234567890123456"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="figma-btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="figma-btn-primary flex-1"
                  >
                    Buat User
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
