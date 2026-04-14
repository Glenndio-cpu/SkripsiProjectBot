import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { Eye, EyeOff, Info, UserPlus } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ktp: '',
    gender: '',
    age: '',
    medicalHistory: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    if (!['male', 'female', 'other'].includes(formData.gender)) {
      setError('Gender pasien wajib dipilih');
      return;
    }

    const parsedAge = Number.parseInt(formData.age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setError('Umur pasien harus di antara 1 sampai 120 tahun');
      return;
    }

    const normalizedMedicalHistory = formData.medicalHistory.trim();
    if (!normalizedMedicalHistory) {
      setError('Keluhan atau riwayat penyakit wajib diisi');
      return;
    }

    const cleanKtp = formData.ktp.replace(/\D/g, '');
    if (!/^\d{16}$/.test(cleanKtp)) {
      setError('Nomor KTP pasien harus 16 digit angka');
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
        ktp: cleanKtp,
        gender: formData.gender as 'male' | 'female' | 'other',
        age: parsedAge,
        medicalHistory: normalizedMedicalHistory,
        password: formData.password,
      });

      // Set user sebagai logged in
      localStorage.setItem('user', JSON.stringify({
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || '',
        ktp: data.user.ktp || '',
        gender: data.user.gender || '',
        age: data.user.age ?? null,
        medicalHistory: data.user.medicalHistory || '',
        profileImage: data.user.profileImage || '',
        role: data.user.role || 'patient'
      }));

      // Dispatch event for other components
      window.dispatchEvent(new Event('userUpdated'));

      setIsLoading(false);
      navigate('/');
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
              <h1 className="text-3xl font-bold text-slate-700 mb-2">Daftar</h1>
            </div>

            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-700">
                <Info className="w-3 h-3 inline mr-1" /> Hanya untuk pasien dengan KTP. Staf ditambahkan admin.
              </p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="08123456789"
                  required
                />
              </div>

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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="16 digit nomor KTP"
                  maxLength={16}
                  inputMode="numeric"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Digunakan untuk verifikasi identitas pasien.</p>
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-white"
                  required
                >
                  <option value="">Pilih gender</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Umur <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="Contoh: 32"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  required
                />
              </div>

              <div>
                <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-2">
                  Keluhan (Riwayat Penyakit) <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  rows={4}
                  placeholder="Tuliskan keluhan utama atau riwayat penyakit yang perlu diketahui"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    placeholder="Masukkan password lagi"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Lihat konfirmasi password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <input type="checkbox" id="terms" className="mr-2 mt-1" required />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  Saya setuju menerima notifikasi broadcast kesehatan via WhatsApp dan menyetujui{' '}
                  <a href="#" className="text-emerald-500 hover:text-slate-600">
                    Syarat & Ketentuan
                  </a>{' '}
                  serta{' '}
                  <a href="#" className="text-emerald-500 hover:text-slate-600">
                    Kebijakan Privasi
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? 'Mendaftar...' : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Daftar sebagai Pasien
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-emerald-500 hover:text-slate-600 font-semibold">
                  Masuk di sini
                </Link>
              </p>
            </div>


          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
