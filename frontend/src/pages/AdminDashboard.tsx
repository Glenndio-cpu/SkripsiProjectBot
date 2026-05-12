import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getAllUsers } from '../lib/userBroadcast';
import { getAllUserStats } from '../lib/userActivityTracking';
import api from '../lib/api';
import { UsersRound, MessageCircle, Zap, BarChart3, Megaphone, Lightbulb, Database, Calendar } from 'lucide-react';
import { isAdminRole, isHeadRole, isStaffRole } from '../lib/roles';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalConsultations: 0,
    activeToday: 0,
    activeNow: 0,
    newThisWeek: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    const allUsers = await getAllUsers();
    const allActivities = await getAllUserStats();
    const activeResp = await api.getActivePatients(1440);
    const activeNow = (activeResp && (activeResp as any).activePatients) || 0;

    const userMap = new Map(
      allUsers.map((user) => [user.email, user])
    );

    const patients = allUsers.filter(u => u.role === 'patient');
    const patientActivities = allActivities.filter((activity: any) => {
      const profile = userMap.get(activity.email);
      return profile?.role === 'patient';
    });

    // Calculate statistics
    const totalConsultations = patientActivities.reduce((sum: number, a: any) => sum + (a.consultationCount || 0), 0);

    // Active today
    const today = new Date().toISOString().split('T')[0];
    const activeToday = patientActivities.filter((a: any) => a.activeDays?.includes(today)).length;

    // New this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = patients.filter(p => {
      const createdDate = new Date(p.createdAt);
      return createdDate >= weekAgo;
    }).length;

    setStats({
      totalUsers: allUsers.length,
      totalPatients: patients.length,
      totalConsultations,
      activeToday,
      activeNow,
      newThisWeek
    });

    const recent = patientActivities
      .filter((a: any) => (a.consultationCount || 0) > 0 || (a.activeDays?.length || 0) > 0)
      .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 10)
      .map((activity: any) => {
        const profile = userMap.get(activity.email) || {};
        return {
          ...activity,
          name: profile.name || activity.email,
          profileImage: profile.profileImage || '',
        };
      });

    setRecentActivity(recent);
  }, []);

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
      void loadDashboardData();
    } catch {
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const streamUrl = api.getPatientComplaintsStreamUrl({ interval: 4 });
    const source = new EventSource(streamUrl, { withCredentials: true });

    const handleRefresh = () => {
      void loadDashboardData();
    };

    source.addEventListener('patient-complaints-updated', handleRefresh);

    const pollingInterval = window.setInterval(() => {
      void loadDashboardData();
    }, 5000);

    return () => {
      source.close();
      window.clearInterval(pollingInterval);
    };
  }, [loadDashboardData]);

  const StatCard = ({ icon: Icon, title, value, subtitle }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-emerald-600 text-sm font-semibold uppercase tracking-wide">{title}</p>
          <h3 className="text-4xl font-bold text-emerald-900 mt-3">{value}</h3>
          {subtitle && <p className="text-emerald-600/70 text-xs mt-2">{subtitle}</p>}
        </div>
        <div className="text-emerald-200">{Icon && <Icon className="w-12 h-12" />}</div>
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
            Dashboard
          </h1>
        </div>



        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={UsersRound}
            title="Total User"
            value={stats.totalUsers}
            subtitle="Semua akun terdaftar"
          />

          <StatCard
            icon={UsersRound}
            title="Total Pasien"
            value={stats.totalPatients}
            subtitle={`${stats.newThisWeek} pasien baru minggu ini`}
          />

          <StatCard
            icon={MessageCircle}
            title="Total Konsultasi"
            value={stats.totalConsultations}
            subtitle="Semua konsultasi pasien"
          />

          <StatCard
            icon={Zap}
            title="PASIEN YANG SEDANG AKTIF"
            value={stats.activeNow}
            subtitle="Pasien aktif (24 jam terakhir)"
          />

          <StatCard
            icon={BarChart3}
            title="Rata-rata Konsultasi"
            value={Math.round((stats.totalConsultations / stats.totalPatients) || 0)}
            subtitle="Per pasien"
          />
        </div>

        {/* Admin Features Menu - only visible to Admin users */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Menu Fitur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-lg transition-colors font-semibold"
                >
                  <UsersRound className="w-6 h-6" />
                  <span>User Management</span>
                </button>
                <button
                  onClick={() => navigate('/admin/ai')}
                  className="flex items-center justify-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-4 rounded-lg transition-colors font-semibold"
                >
                  <Database className="w-6 h-6" />
                  <span>Kelola AI</span>
                </button>
              </>
            </div>
          </div>
        )}

        {isHead && (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Aktivitas Terbaru</h2>

            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada aktivitas pasien</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                  >
                    <div className="flex items-center gap-4">
                      {activity.profileImage ? (
                        <img
                          src={activity.profileImage}
                          alt={activity.name || activity.email}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-100"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {(activity.name || activity.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-emerald-900">{activity.name || activity.email}</p>
                        <p className="text-xs text-emerald-600">{activity.email}</p>
                        <p className="text-sm text-emerald-700">
                          {activity.consultationCount} konsultasi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 font-semibold">
                        Terakhir aktif
                      </p>
                      <p className="text-sm text-emerald-900 font-semibold">
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
        )}

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
