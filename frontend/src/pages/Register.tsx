import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { User, ShieldCheck, Info } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ktp: '',
    password: '',
    confirmPassword: '',
    adminCode: '' // Tambahan untuk kode admin
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registerAsAdmin, setRegisterAsAdmin] = useState(false); // Toggle untuk mode admin

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validasi form
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (!registerAsAdmin) {
      const cleanKtp = formData.ktp.replace(/\D/g, '');
      if (!/^\d{16}$/.test(cleanKtp)) {
        setError('Nomor KTP pasien harus 16 digit angka');
        return;
      }
    }

    // Validasi kode admin jika mendaftar sebagai admin
    if (registerAsAdmin && !formData.adminCode) {
      setError('Kode akses admin harus diisi');
      return;
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Format email tidak valid');
      return;
    }

    // Validasi nomor telepon (harus angka dan minimal 10 digit)
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Nomor telepon tidak valid (10-15 digit angka)');
      return;
    }

    // Validasi password minimal 6 karakter
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    // Validasi password match
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
        ktp: registerAsAdmin ? undefined : formData.ktp.replace(/\D/g, ''),
        password: formData.password,
        role: registerAsAdmin ? 'nurse' : 'patient',
        adminAccessCode: registerAsAdmin ? formData.adminCode : undefined
      });
      
      // Set user sebagai logged in
      localStorage.setItem('user', JSON.stringify({
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || '',
        ktp: data.user.ktp || '',
        profileImage: data.user.profileImage || '',
        role: data.user.role || 'patient'
      }));
      
      // Dispatch event for other components
      window.dispatchEvent(new Event('userUpdated'));
      
      setIsLoading(false);
      
      if (registerAsAdmin) {
        alert('Akun admin berhasil dibuat! Anda dapat mengakses Dashboard Admin.');
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-400px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-700 mb-2">Buat Akun Baru</h1>
              <p className="text-gray-600">Bergabung dengan Puskesmas Wori Online</p>
            </div>

            {/* Toggle Admin/Patient Registration */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Jenis Akun
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterAsAdmin(false);
                    setFormData({ ...formData, adminCode: '' });
                    setError('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    !registerAsAdmin
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <User className="w-6 h-6 mb-1" />
                    <span className="text-sm">Pasien</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterAsAdmin(true);
                    setError('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    registerAsAdmin
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <ShieldCheck className="w-6 h-6 mb-1" />
                    <span className="text-sm">Admin/Petugas</span>
                  </div>
                </button>
              </div>
              {registerAsAdmin && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-700">
                    <Info className="w-3 h-3 inline mr-1" /> Anda akan mendaftar sebagai <strong>Admin/Petugas Kesehatan</strong>. 
                    Kode akses diperlukan untuk verifikasi.
                  </p>
                </div>
              )}
              {!registerAsAdmin && (
                <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <p className="text-xs text-sky-700">
                    <Info className="w-3 h-3 inline mr-1" /> Untuk akun <strong>Pasien</strong>, kolom <strong>Nomor KTP</strong> wajib diisi (16 digit angka).
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Telepon WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                  placeholder="08123456789 atau +628123456789"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Wajib diisi!</span> Nomor ini akan digunakan untuk:
                </p>
                <ul className="mt-1 text-xs text-gray-500 ml-4 list-disc">
                  <li>Notifikasi broadcast informasi kesehatan</li>
                  <li>Reminder jadwal vaksinasi</li>
                  <li>Update dari Puskesmas Wori</li>
                </ul>
                <p className="mt-1 text-xs text-red-600">Satu nomor hanya untuk satu akun</p>
              </div>

              {!registerAsAdmin && (
                <div>
                  <label htmlFor="ktp" className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor KTP Pasien <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ktp"
                    name="ktp"
                    value={formData.ktp}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    placeholder="16 digit nomor KTP"
                    maxLength={16}
                    inputMode="numeric"
                    required={!registerAsAdmin}
                  />
                  <p className="mt-1 text-xs text-gray-500">Digunakan untuk verifikasi identitas pasien.</p>
                </div>
              )}

              {/* Admin Code Field - Only show if registerAsAdmin is true */}
              {registerAsAdmin && (
                <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                  <label htmlFor="adminCode" className="block text-sm font-medium text-purple-800 mb-2">
                    Kode Akses Admin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="adminCode"
                    name="adminCode"
                    value={formData.adminCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                    placeholder="Masukkan kode akses admin"
                    required={registerAsAdmin}
                  />
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-700">
                       <strong>Kode akses rahasia</strong> - Hanya dimiliki oleh admin resmi. 
                      Hubungi super admin Puskesmas Wori untuk mendapatkan kode.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                  placeholder="Masukkan password lagi"
                  required
                />
              </div>

              <div className="flex items-start">
                <input type="checkbox" id="terms" className="mr-2 mt-1" required />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  Saya setuju menerima notifikasi broadcast kesehatan via WhatsApp dan menyetujui{' '}
                  <a href="#" className="text-sky-500 hover:text-slate-600">
                    Syarat & Ketentuan
                  </a>{' '}
                  serta{' '}
                  <a href="#" className="text-sky-500 hover:text-slate-600">
                    Kebijakan Privasi
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${registerAsAdmin ? 'bg-purple-600 hover:bg-purple-700' : 'bg-sky-500 hover:bg-slate-600'} text-white py-3 rounded-lg transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isLoading 
                  ? 'Mendaftar...' 
                  : registerAsAdmin 
                    ? 'Daftar sebagai Admin' 
                    : 'Daftar sebagai Pasien'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-sky-500 hover:text-slate-600 font-semibold">
                  Masuk di sini
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-500 mb-4">Atau daftar dengan</p>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
