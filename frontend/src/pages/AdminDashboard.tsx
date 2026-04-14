import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getAllUsers } from '../lib/userBroadcast';
import { getAllUserStats } from '../lib/userActivityTracking';
import { UsersRound, MessageCircle, Zap, Smartphone, BarChart3, Megaphone, Lightbulb, Database, Calendar, ShieldCheck } from 'lucide-react';
import { isAdminRole, isHeadRole, isStaffRole } from '../lib/roles';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState('');
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    activeToday: 0,
    patientsWithPhone: 0,
    newThisWeek: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Check if user is monitoring-level staff
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (!isStaffRole(user.role)) {
        navigate('/');
        return;
      }

      setCurrentRole(user.role || '');
      loadDashboardData();
    } catch {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const loadDashboardData = async () => {
    const allUsers = await getAllUsers();
    const allActivities = await getAllUserStats();

    // Filter only patients
    const patients = allUsers.filter(u => u.role === 'patient');

    // Calculate statistics
    const totalConsultations = allActivities.reduce((sum: number, a: any) => sum + (a.consultationCount || 0), 0);

    // Active today
    const today = new Date().toISOString().split('T')[0];
    const activeToday = allActivities.filter((a: any) => a.activeDays?.includes(today)).length;

    // Patients with phone
    const withPhone = patients.filter(p => p.phone && p.phone.length > 0).length;

    // New this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = patients.filter(p => {
      const createdDate = new Date(p.createdAt);
      return createdDate >= weekAgo;
    }).length;

    setStats({
      totalPatients: patients.length,
      totalConsultations,
      activeToday,
      patientsWithPhone: withPhone,
      newThisWeek
    });

    // Get recent activity (last 10 users with activity)
    const recent = allActivities
      .filter((a: any) => (a.consultationCount || 0) > 0 || (a.activeDays?.length || 0) > 0)
      .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 10);

    setRecentActivity(recent);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
    <div className={`figma-card p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-emerald-700/80 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-emerald-900 mt-2">{value}</h3>
          {subtitle && <p className="text-emerald-700/60 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="text-emerald-300">{Icon && <Icon className="w-10 h-10" />}</div>
      </div>
    </div>
  );

  const isHead = isHeadRole(currentRole);
  const isAdmin = isAdminRole(currentRole);
  const isNurse = isStaffRole(currentRole) && !isHead && !isAdmin;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="figma-card p-6">
          <h1 className="figma-heading mb-2">
            {isHead ? 'Dashboard Monitoring Kepala Puskesmas' : isNurse ? 'Dashboard Operasional Tenaga Medis' : 'Dashboard Admin IT Manager'}
          </h1>
          <p className="figma-caption">
            {isHead
              ? 'Panel pengawasan data pasien, penggunaan chatbot, jadwal, validasi informasi kesehatan, dan monitoring broadcast.'
              : isNurse
                ? 'Panel operasional Tenaga Medis untuk mengelola informasi kesehatan, validasi konten chatbot, dan jadwal berobat/posyandu.'
                : 'Panel kontrol penuh untuk pengelolaan sistem Puskesmas Wori Online'}
          </p>
        </div>

        {/* Super Admin Access Matrix */}
        <div className="figma-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">
                {isHead ? 'Hak Akses Kepala Puskesmas' : isNurse ? 'Hak Akses Tenaga Medis' : 'Hak Akses Admin IT Manager'}
              </h2>
              <p className="text-sm text-emerald-700/80">
                {isHead
                  ? 'Akses monitoring dan validasi tanpa penginputan data langsung.'
                  : isNurse
                    ? 'Akses operasional untuk manajemen konten medis dan jadwal layanan.'
                    : 'Akses tertinggi untuk seluruh fitur inti dan konfigurasi sistem'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(isHead
              ? [
                'Login ke panel monitoring',
                'Melihat data pasien',
                'Melihat laporan penggunaan chatbot',
                'Melihat informasi jadwal berobat',
                'Menyetujui/memvalidasi informasi kesehatan',
                'Monitoring broadcast WhatsApp',
              ]
              : isNurse
                ? [
                  'Login ke panel Tenaga Medis',
                  'Kelola edukasi & informasi kesehatan',
                  'Validasi konten & chatbot',
                  'Kelola jadwal berobat & posyandu',
                  'Pantau aktivitas konsultasi pasien',
                ]
                : [
                  'Login ke panel Admin IT',
                  'Kelola dan Konfigurasi AI (RAG, Qdrant, LLM)',
                  'User Management (akun pasien & staf)',
                  'Kelola WhatsApp Gateway',
                  'Monitoring sistem teknis AI',
                  'Kontrol keamanan akses platform',
                ]
            ).map((capability) => (
              <div key={capability} className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                {capability}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={UsersRound}
            title="Total Pasien"
            value={stats.totalPatients}
            subtitle={`${stats.newThisWeek} pasien baru minggu ini`}
            color="border-blue-500"
          />

          <StatCard
            icon={MessageCircle}
            title="Total Konsultasi"
            value={stats.totalConsultations}
            subtitle="Semua konsultasi pasien"
            color="border-green-500"
          />

          <StatCard
            icon={Zap}
            title="Aktif Hari Ini"
            value={stats.activeToday}
            subtitle="Pasien aktif hari ini"
            color="border-yellow-500"
          />

          <StatCard
            icon={Smartphone}
            title="Pasien dengan HP"
            value={stats.patientsWithPhone}
            subtitle={`${Math.round((stats.patientsWithPhone / stats.totalPatients) * 100 || 0)}% dari total`}
            color="border-red-500"
          />

          <StatCard
            icon={BarChart3}
            title="Rata-rata Konsultasi"
            value={Math.round((stats.totalConsultations / stats.totalPatients) || 0)}
            subtitle="Per pasien"
            color="border-indigo-500"
          />
        </div>

        {/* Admin Features Menu */}
        <div className="figma-card p-6">
          <h2 className="text-xl font-semibold text-emerald-900 mb-4">
            {isHead ? 'Fitur Monitoring Kepala Puskesmas' : isNurse ? 'Fitur Operasional Tenaga Medis' : 'Fitur Admin IT Manager'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="figma-btn-primary"
                >
                  <UsersRound className="w-6 h-6" />
                  <span className="font-medium">User Management</span>
                </button>
                <button
                  onClick={() => navigate('/admin/register')}
                  className="figma-btn-secondary"
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-medium">Tambah Staf</span>
                </button>
                <button
                  onClick={() => navigate('/admin/ai')}
                  className="figma-btn-secondary"
                >
                  <Database className="w-6 h-6" />
                  <span className="font-medium">Kelola dan Konfigurasi AI</span>
                </button>
              </>
            )}

            {isHead && (
              <>
                <button
                  onClick={() => navigate('/admin/patients')}
                  className="figma-btn-primary"
                >
                  <UsersRound className="w-6 h-6" />
                  <span className="font-medium">Monitoring Data Pasien</span>
                </button>
                <button
                  onClick={() => navigate('/admin/schedules')}
                  className="figma-btn-secondary"
                >
                  <Calendar className="w-6 h-6" />
                  <span className="font-medium">Kelola Jadwal Posyandu</span>
                </button>
                <button
                  onClick={() => navigate('/admin/announcements')}
                  className="figma-btn-secondary"
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-medium">Approval Informasi</span>
                </button>
                <button
                  onClick={() => navigate('/admin/broadcast')}
                  className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg transition-colors"
                >
                  <Megaphone className="w-6 h-6" />
                  <span className="font-medium">Broadcast WA Resmi</span>
                </button>
              </>
            )}

            {isNurse && (
              <>
                <button
                  onClick={() => navigate('/admin/announcements')}
                  className="figma-btn-primary"
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-medium">Kelola Informasi Kesehatan</span>
                </button>
                <button
                  onClick={() => navigate('/admin/schedules')}
                  className="figma-btn-secondary"
                >
                  <Calendar className="w-6 h-6" />
                  <span className="font-medium">Kelola Jadwal Posyandu</span>
                </button>
              </>
            )}

            {isAdmin && (
              <button
                onClick={() => navigate('/admin/broadcast')}
                className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg transition-colors"
              >
                <Megaphone className="w-6 h-6" />
                <span className="font-medium">Manajemen WA Gateway</span>
              </button>
            )}

          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h2>

          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada aktivitas pasien</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                      <span className="text-emerald-500 font-bold">
                        {activity.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{activity.email}</p>
                      <p className="text-sm text-gray-500">
                        {activity.consultationCount} konsultasi
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      Terakhir aktif
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(activity.lastUpdated).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Tips Pengelolaan</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Gunakan fitur Broadcast untuk mengirim informasi kesehatan ke semua pasien</li>
                <li>• Monitor aktivitas pasien secara berkala untuk memastikan engagement</li>
                <li>• Kelola data pasien dengan hati-hati dan jaga privasi mereka</li>
                <li>• Tambah admin baru hanya jika diperlukan dengan kode akses yang aman</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
