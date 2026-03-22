import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getAllUsers } from '../lib/userBroadcast';
import { getAllUserStats } from '../lib/userActivityTracking';
import { UsersRound, MessageCircle, BookOpen, Zap, Smartphone, BarChart3, Megaphone, UserPlus, Lightbulb } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalArticlesRead: 0,
    activeToday: 0,
    patientsWithPhone: 0,
    newThisWeek: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Check if user is admin
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

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    const allUsers = await getAllUsers();
    const allActivities = await getAllUserStats();
    
    // Filter only patients (non-nurse users)
    const patients = allUsers.filter(u => u.role !== 'nurse');
    
    // Calculate statistics
    const totalConsultations = allActivities.reduce((sum: number, a: any) => sum + (a.consultationCount || 0), 0);
    const totalArticles = allActivities.reduce((sum: number, a: any) => sum + (a.articlesRead?.length || 0), 0);
    
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
      totalArticlesRead: totalArticles,
      activeToday,
      patientsWithPhone: withPhone,
      newThisWeek
    });

    // Get recent activity (last 10 users with activity)
    const recent = allActivities
      .filter((a: any) => (a.consultationCount || 0) > 0 || (a.articlesRead?.length || 0) > 0)
      .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 10);
    
    setRecentActivity(recent);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mt-2">{value}</h3>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="text-gray-400">{Icon && <Icon className="w-10 h-10" />}</div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-700 mb-2">Dashboard Admin</h1>
          <p className="text-gray-600">Selamat datang di panel administrasi Puskesmas Wori Online</p>
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
            icon={BookOpen}
            title="Artikel Dibaca"
            value={stats.totalArticlesRead}
            subtitle="Total pembacaan artikel"
            color="border-purple-500"
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

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/patients')}
              className="flex items-center justify-center gap-3 bg-sky-500 text-white px-6 py-4 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <UsersRound className="w-6 h-6" />
              <span className="font-medium">Kelola Pasien</span>
            </button>
            
            <button
              onClick={() => navigate('/admin/broadcast')}
              className="flex items-center justify-center gap-3 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Megaphone className="w-6 h-6" />
              <span className="font-medium">Broadcast WhatsApp</span>
            </button>
            
            <button
              onClick={() => navigate('/admin/register')}
              className="flex items-center justify-center gap-3 bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="w-6 h-6" />
              <span className="font-medium">Tambah Admin</span>
            </button>
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
                    <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center">
                      <span className="text-sky-500 font-bold">
                        {activity.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{activity.email}</p>
                      <p className="text-sm text-gray-500">
                        {activity.consultationCount} konsultasi • {activity.articlesRead.length} artikel dibaca
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
        <div className="mt-8 bg-sky-50 border border-sky-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-sky-500 flex-shrink-0" />
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
