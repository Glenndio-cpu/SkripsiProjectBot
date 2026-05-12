import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { trackDailyActivity } from '../lib/userActivityTracking';
import { Camera, Eye, EyeOff, Info, RefreshCcw, UserPlus, Zap } from 'lucide-react';

type PhotoState = {
  previewUrl: string;
  status: 'idle' | 'ready' | 'error';
  message: string;
};

type CaptureTarget = 'ktp' | 'ktpWithOwner' | null;

const initialPhotoState = (message: string): PhotoState => ({
  previewUrl: '',
  status: 'idle',
  message,
});

const Register = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const [ktpImageState, setKtpImageState] = useState<PhotoState>(
    initialPhotoState('Ambil foto KTP langsung dari kamera.')
  );
  const [ktpWithOwnerImageState, setKtpWithOwnerImageState] = useState<PhotoState>(
    initialPhotoState('Ambil foto KTP bersama pemilik dari kamera.')
  );

  const [cameraOpen, setCameraOpen] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const currentLabel = useMemo(() => {
    if (captureTarget === 'ktp') return 'Foto KTP';
    if (captureTarget === 'ktpWithOwner') return 'Foto KTP + Pemilik';
    return 'Kamera';
  }, [captureTarget]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  };

  const detectTorchSupport = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setTorchSupported(false);
      return;
    }

    const capabilities = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(Boolean(capabilities.torch));
  };

  const getCameraErrorMessage = (err: unknown) => {
    const name = typeof err === 'object' && err ? (err as { name?: string }).name : '';

    switch (name) {
      case 'NotAllowedError':
        return 'Izin kamera ditolak. Aktifkan izin kamera di browser.';
      case 'NotFoundError':
        return 'Kamera tidak ditemukan di perangkat ini.';
      case 'NotReadableError':
        return 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
      case 'OverconstrainedError':
        return 'Kamera tidak mendukung resolusi ini. Coba ulang.';
      default:
        return 'Kamera gagal dibuka. Pastikan izin kamera diaktifkan.';
    }
  };

  const getCameraStream = async (facingMode: 'environment' | 'user') => {
    const baseVideo = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    const candidates: MediaStreamConstraints[] = [
      { audio: false, video: { ...baseVideo, facingMode: { ideal: facingMode } } },
      { audio: false, video: { ...baseVideo, facingMode } },
      { audio: false, video: { ...baseVideo } },
      { audio: false, video: true },
    ];

    let lastError: unknown;
    for (const constraints of candidates) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError ?? new Error('Kamera tidak tersedia.');
  };

  const attachStreamToVideo = async (stream: MediaStream) => {
    let attempts = 0;
    while (!videoRef.current && attempts < 3) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      attempts += 1;
    }

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((err) => console.warn('Video play error:', err));
    }
  };

  const startCamera = async (facingMode: 'environment' | 'user' = 'environment') => {
    stopCamera();

    const stream = await getCameraStream(facingMode);
    streamRef.current = stream;

    await attachStreamToVideo(stream);

    setCameraFacingMode(facingMode);
    setCameraError('');

    detectTorchSupport(stream);
  };

  const openCamera = async (target: CaptureTarget) => {
    if (!target) return;
    setError('');
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser tidak mendukung akses kamera. Gunakan browser terbaru.');
      return;
    }

    try {
      setCaptureTarget(target);
      setCameraOpen(true);
      await startCamera(cameraFacingMode);
    } catch (err) {
      console.error('Open camera error:', err);
      setCameraError(getCameraErrorMessage(err));
      stopCamera();
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCaptureTarget(null);
    setCameraError('');
    stopCamera();
  };

  const switchCamera = async () => {
    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';

    try {
      await startCamera(nextFacingMode);
    } catch (err) {
      console.error('Switch camera error:', err);
      setCameraError('Gagal ganti kamera depan/belakang.');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0] as MediaStreamTrack & {
      applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
    };

    if (!track || !track.applyConstraints) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((prev) => !prev);
    } catch (err) {
      console.error('Torch toggle error:', err);
      setCameraError('Perangkat ini tidak mendukung blitz kamera.');
      setTorchSupported(false);
      setTorchOn(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !captureTarget) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (!width || !height) {
      setCameraError('Gagal mengambil foto. Coba lagi.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setCameraError('Gagal memproses hasil kamera.');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (captureTarget === 'ktp') {
      setKtpImageState({
        previewUrl: dataUrl,
        status: 'ready',
        message: 'Foto KTP berhasil diambil dari kamera.',
      });
    } else {
      setKtpWithOwnerImageState({
        previewUrl: dataUrl,
        status: 'ready',
        message: 'Foto KTP + pemilik berhasil diambil dari kamera.',
      });
    }

    closeCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'ktp' ? value.replace(/\D/g, '').slice(0, 16) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (!['male', 'female'].includes(formData.gender)) {
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

    if (!ktpImageState.previewUrl || ktpImageState.status !== 'ready') {
      setError('Foto KTP wajib diambil dari kamera.');
      return;
    }

    if (!ktpWithOwnerImageState.previewUrl || ktpWithOwnerImageState.status !== 'ready') {
      setError('Foto KTP + pemilik wajib diambil dari kamera.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Format email tidak valid');
      return;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Nomor telepon tidak valid (10-15 digit angka)');
      return;
    }

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
        ktp: cleanKtp,
        ktpImage: ktpImageState.previewUrl,
        ktpWithOwnerImage: ktpWithOwnerImageState.previewUrl,
        gender: formData.gender as 'male' | 'female',
        age: parsedAge,
        medicalHistory: normalizedMedicalHistory,
        password: formData.password,
      });

      setIsLoading(false);

      if (data?.requiresApproval) {
        navigate('/approval-waiting', {
          state: {
            identifier: data?.user?.email || formData.email,
            name: data?.user?.name || formData.name,
            email: data?.user?.email || formData.email,
            phone: data?.user?.phone || cleanPhone,
            registrationStatus: data?.user?.registrationStatus || 'pending',
            registrationNote: data?.user?.registrationNote || '',
          },
          replace: true,
        });
        return;
      }

      localStorage.setItem('user', JSON.stringify({
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || '',
        ktp: data.user.ktp || '',
        ktpImage: data.user.ktpImage || '',
        ktpWithOwnerImage: data.user.ktpWithOwnerImage || '',
        gender: data.user.gender || '',
        age: data.user.age ?? null,
        medicalHistory: data.user.medicalHistory || '',
        profileImage: data.user.profileImage || '',
        role: data.user.role || 'patient',
      }));
      window.dispatchEvent(new Event('userUpdated'));
      trackDailyActivity();
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.');
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
                <Info className="w-3 h-3 inline mr-1" /> Foto identitas wajib diambil langsung dari kamera.
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
              </div>

              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white p-2 text-emerald-600 shadow-sm">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">Foto KTP</h2>
                      <p className="text-xs text-slate-600">Hanya dari kamera, tidak bisa upload file.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void openCamera('ktp')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <Camera className="h-4 w-4" />
                      {ktpImageState.previewUrl ? 'Ambil Ulang' : 'Buka Kamera'}
                    </button>

                    <div className="space-y-2 rounded-xl bg-white/90 p-3 ring-1 ring-emerald-100">
                      {ktpImageState.previewUrl ? (
                        <img
                          src={ktpImageState.previewUrl}
                          alt="Pratinjau KTP"
                          className="h-40 w-full rounded-lg object-contain bg-slate-50"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                          Belum ada foto.
                        </div>
                      )}
                      <p className={`text-xs ${ktpImageState.status === 'error' ? 'text-rose-700' : 'text-slate-600'}`}>
                        {ktpImageState.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white p-2 text-emerald-600 shadow-sm">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">Foto KTP + Pemilik</h2>
                      <p className="text-xs text-slate-600">Ambil langsung dari kamera perangkat.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void openCamera('ktpWithOwner')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <Camera className="h-4 w-4" />
                      {ktpWithOwnerImageState.previewUrl ? 'Ambil Ulang' : 'Buka Kamera'}
                    </button>

                    <div className="space-y-2 rounded-xl bg-white/90 p-3 ring-1 ring-emerald-100">
                      {ktpWithOwnerImageState.previewUrl ? (
                        <img
                          src={ktpWithOwnerImageState.previewUrl}
                          alt="Pratinjau KTP dan pemilik"
                          className="h-40 w-full rounded-lg object-contain bg-slate-50"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                          Belum ada foto.
                        </div>
                      )}
                      <p className={`text-xs ${ktpWithOwnerImageState.status === 'error' ? 'text-rose-700' : 'text-slate-600'}`}>
                        {ktpWithOwnerImageState.message}
                      </p>
                    </div>
                  </div>
                </div>
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
                  <option value="" disabled hidden />
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
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
                  Saya setuju dengan{' '}
                  <Link to="/syarat-ketentuan" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Syarat & Ketentuan
                  </Link>{' '}
                  dan{' '}
                  <Link to="/kebijakan-privasi" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Kebijakan Privasi
                  </Link>
                  .
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

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{currentLabel}</h2>
                <p className="text-xs text-slate-500">Ambil foto langsung dari kamera perangkat.</p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>

            <div className="overflow-hidden rounded-xl bg-black">
              {cameraError ? (
                <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-rose-200">{cameraError}</div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-[360px] w-full object-cover" />
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                <Camera className="h-4 w-4" />
                Ambil Foto
              </button>

              <button
                type="button"
                onClick={() => void switchCamera()}
                disabled={Boolean(cameraError)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <RefreshCcw className="h-4 w-4" />
                {cameraFacingMode === 'environment' ? 'Pakai Kamera Depan' : 'Pakai Kamera Belakang'}
              </button>

              <button
                type="button"
                onClick={() => void toggleTorch()}
                disabled={!torchSupported}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Zap className="h-4 w-4" />
                {torchOn ? 'Blitz Mati' : 'Blitz Nyala'}
              </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Register;
