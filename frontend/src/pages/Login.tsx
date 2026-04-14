import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { isStaffRole } from '../lib/roles';
import { Eye, EyeOff, LogIn, Shield, User } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '', // bisa email atau nomor telepon
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'patient' | 'admin'>('patient');
  const [showPassword, setShowPassword] = useState(false);

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
    if (!formData.identifier || !formData.password) {
      setError('Semua field harus diisi');
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.login(formData.identifier, formData.password, selectedRole);

      // Login berhasil - simpan user data
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

      // Redirect berdasarkan role
      if (isStaffRole(data.user.role)) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Terjadi kesalahan saat login. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-400px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-700 mb-2">Login</h1>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedRole('patient')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedRole === 'patient'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <User className="w-4 h-4" />
                Login sebagai Pasien
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedRole === 'admin'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Shield className="w-4 h-4" />
                Login Admin/Staf
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                  Email atau Nomor Telepon
                </label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  placeholder="nama@email.com atau 08123456789"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    placeholder="Masukkan password"
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 rounded" />
                  <span className="text-gray-600">Ingat saya</span>
                </label>
                <a href="#" className="text-emerald-500 hover:text-slate-600">
                  Lupa password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 text-white py-3 rounded-lg hover:bg-slate-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? 'Memproses...' : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Belum punya akun?{' '}
                <Link to="/register" className="text-emerald-500 hover:text-slate-600 font-semibold">
                  Daftar sekarang
                </Link>
              </p>
            </div>


          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
