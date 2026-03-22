import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if current user is admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'nurse') {
      navigate('/');
      return;
    }
  }, [navigate]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // We'll verify the code when actually registering via backend
    // For now, just allow access if code is provided
    if (accessCode.trim()) {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Kode akses harus diisi!');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    // Validasi email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Format email tidak valid');
      return;
    }

    // Validasi nomor telepon
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Nomor telepon harus 10-15 digit angka');
      return;
    }

    // Validasi password
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama');
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.register({
        name: formData.name,
        email: formData.email,
        phone: cleanPhone,
        password: formData.password,
        role: 'nurse',
        adminAccessCode: accessCode
      });
      
      setIsLoading(false);
      alert(`Admin ${formData.name} berhasil didaftarkan!`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      setAccessCode('');
      setIsAuthorized(false);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Terjadi kesalahan saat mendaftarkan admin. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-sky-50 p-4 rounded-full mb-4">
            <ShieldCheck className="w-12 h-12 text-sky-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-700 mb-2">
            Registrasi Admin Baru
          </h1>
          <p className="text-gray-600">
            Tambahkan petugas kesehatan atau admin baru untuk Puskesmas Wori Online
          </p>
        </div>

        {/* Access Code Verification */}
        {!isAuthorized ? (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-1">Akses Terbatas</h3>
                    <p className="text-sm text-yellow-700">
                      Anda memerlukan kode akses khusus untuk mendaftarkan admin baru.
                      Hubungi super admin untuk mendapatkan kode.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kode Akses Admin
                  </label>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Masukkan kode akses"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-sky-500 text-white px-6 py-3 rounded-lg hover:bg-slate-600 transition-colors font-medium"
                >
                  Verifikasi Kode Akses
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Info:</strong> Kode akses bersifat rahasia dan hanya diberikan kepada 
                  super admin Puskesmas Wori. Jangan bagikan kode ini kepada siapapun.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Registration Form
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-green-700 font-medium">Kode akses valid! Silakan lengkapi form registrasi.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Dr. John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@puskesmaswori.id"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Telepon/WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08123456789"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Format: 08xxxxxxxxxx (10-15 digit)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ketik ulang password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthorized(false);
                    setAccessCode('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-sky-500 text-white px-6 py-3 rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Mendaftarkan...' : 'Daftarkan Admin'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-700">
                <strong>Role:</strong> Admin yang didaftarkan akan memiliki role "nurse" dan dapat
                mengakses Dashboard Admin, Kelola Pasien, dan Broadcast WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sky-500 hover:text-slate-700 font-medium"
          >
            ← Kembali ke Dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminRegister;
