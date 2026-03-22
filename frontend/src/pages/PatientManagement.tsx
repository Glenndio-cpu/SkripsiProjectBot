import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getAllUsers, type UserData } from '../lib/userBroadcast';
import { getAllUserStats } from '../lib/userActivityTracking';
import api from '../lib/api';
import { Download, Users, Search } from 'lucide-react';

interface UserActivity {
  email: string;
  consultationCount: number;
  articlesRead: string[];
  activeDays: string[];
  lastUpdated: string;
}

function maskKtp(ktp?: string): string {
  if (!ktp) return '-';
  const clean = ktp.replace(/\D/g, '');
  if (!clean) return '-';
  if (clean.length <= 4) return clean;
  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

const PatientManagement = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<UserData[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<UserData | null>(null);
  const [patientActivity, setPatientActivity] = useState<UserActivity | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [allActivities, setAllActivities] = useState<UserActivity[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'with-phone' | 'active' | 'new'>('all');

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

    loadPatients();
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterType, patients, allActivities]);

  const loadPatients = async () => {
    const [usersData, activitiesData] = await Promise.all([
      getAllUsers(),
      getAllUserStats()
    ]);
    const patientList = usersData.filter((u: any) => u.role !== 'nurse');
    setPatients(patientList as any);
    setFilteredPatients(patientList as any);
    setAllActivities(activitiesData as any);
  };

  const applyFilters = () => {
    let filtered = [...patients];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(term)) ||
        (p.ktp && p.ktp.includes(term))
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'with-phone':
        filtered = filtered.filter(p => p.phone && p.phone.length > 0);
        break;
      case 'active': {
        const today = new Date().toISOString().split('T')[0];
        const activeEmails = allActivities
          .filter((a: any) => a.activeDays?.includes(today))
          .map((a: any) => a.email);
        filtered = filtered.filter(p => activeEmails.includes(p.email));
        break;
      }
      case 'new': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(p => {
          const createdDate = new Date(p.createdAt);
          return createdDate >= weekAgo;
        });
        break;
      }
    }

    setFilteredPatients(filtered);
  };

  const handleViewDetails = (patient: UserData) => {
    setSelectedPatient(patient);
    
    const activity = allActivities.find((a: any) => a.email === patient.email);
    setPatientActivity(activity || {
      email: patient.email,
      consultationCount: 0,
      articlesRead: [],
      activeDays: [],
      lastUpdated: new Date().toISOString()
    });
    
    setShowDetailModal(true);
  };

  const handleDeletePatient = async (patient: UserData) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pasien ${patient.name}?`)) {
      return;
    }

    try {
      const adminData = localStorage.getItem('user');
      const adminEmail = adminData ? JSON.parse(adminData).email : '';
      await api.deleteAccount(patient.email, '__admin_delete__', adminEmail);
      alert(`Pasien ${patient.name} berhasil dihapus`);
      loadPatients();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Delete patient error:', error);
      alert('Gagal menghapus pasien');
    }
  };

  const exportToCSV = () => {
    let csv = 'Nama,Email,Nomor HP,Nomor KTP,Tanggal Daftar,Konsultasi,Artikel Dibaca,Hari Aktif\n';
    
    filteredPatients.forEach(patient => {
      const activity = allActivities.find((a: any) => a.email === patient.email);
      csv += `"${patient.name}","${patient.email}","${patient.phone || '-'}","${patient.ktp || '-'}","${new Date(patient.createdAt).toLocaleDateString('id-ID')}",${activity?.consultationCount || 0},${activity?.articlesRead?.length || 0},${activity?.activeDays?.length || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pasien-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-700 mb-2">Kelola Pasien</h1>
              <p className="text-gray-600">
                Total {filteredPatients.length} dari {patients.length} pasien
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Pasien
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nama, email, atau nomor HP..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Filter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="all">Semua Pasien</option>
                <option value="with-phone">Dengan Nomor HP</option>
                <option value="active">Aktif Hari Ini</option>
                <option value="new">Pendaftar Baru (7 Hari)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400" />
              <p className="text-gray-500 mt-4">Tidak ada pasien yang ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pasien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KTP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Daftar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktivitas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient, index) => {
                    const activity = allActivities.find((a: any) => a.email === patient.email);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {patient.profileImage ? (
                              <img
                                src={patient.profileImage}
                                alt={patient.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center">
                                <span className="text-sky-500 font-bold">
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                              <p className="text-sm text-gray-500">{patient.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {patient.phone || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{maskKtp(patient.ktp)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {new Date(patient.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-3 text-xs">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Konsultasi: {activity?.consultationCount || 0}
                            </span>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Artikel: {activity?.articlesRead.length || 0}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              Hari Aktif: {activity?.activeDays.length || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewDetails(patient)}
                            className="text-sky-500 hover:text-slate-800 font-medium"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedPatient && patientActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Detail Pasien</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-4">
                  {selectedPatient.profileImage ? (
                    <img
                      src={selectedPatient.profileImage}
                      alt={selectedPatient.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-sky-50"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center border-4 border-sky-200">
                      <span className="text-sky-500 font-bold text-3xl">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h3>
                    <p className="text-gray-600">{selectedPatient.email}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Nomor HP</p>
                    <p className="font-medium text-gray-800">
                      {selectedPatient.phone || 'Tidak ada'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Nomor KTP</p>
                    <p className="font-medium text-gray-800">
                      {maskKtp(selectedPatient.ktp)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Tanggal Daftar</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedPatient.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Activity Statistics */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Statistik Aktivitas</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{patientActivity.consultationCount}</p>
                      <p className="text-sm text-gray-600 mt-1">Konsultasi</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-purple-600">{patientActivity.articlesRead.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Artikel Dibaca</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">{patientActivity.activeDays.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Hari Aktif</p>
                    </div>
                  </div>
                </div>

                {/* Articles Read */}
                {patientActivity.articlesRead.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Artikel yang Dibaca</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {patientActivity.articlesRead.map((article, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-gray-200"
                          >
                            {article}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Activity */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Terakhir Aktif:</strong>{' '}
                    {new Date(patientActivity.lastUpdated).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (selectedPatient.phone) {
                        window.open(`https://wa.me/${selectedPatient.phone}`, '_blank');
                      } else {
                        alert('Pasien tidak memiliki nomor WhatsApp');
                      }
                    }}
                    disabled={!selectedPatient.phone}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                     Chat WhatsApp
                  </button>
                  <button
                    onClick={() => handleDeletePatient(selectedPatient)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                     Hapus Pasien
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientManagement;
