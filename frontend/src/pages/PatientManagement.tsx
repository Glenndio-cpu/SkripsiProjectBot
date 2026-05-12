import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getAllUsers, type UserData } from '../lib/userBroadcast';
import { getAllUserStats } from '../lib/userActivityTracking';
import { isAdminRole, isHeadRole, isStaffRole } from '../lib/roles';
import api from '../lib/api';
import { Download, Users, Search } from 'lucide-react';

interface UserActivity {
  email: string;
  consultationCount: number;
  activeDays: string[];
  lastUpdated: string;
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface PatientComplaint {
  id: number;
  complaint: string;
  complaintDate: string;
  createdAt?: string;
  updatedAt?: string;
}

function maskKtp(ktp?: string): string {
  if (!ktp) return '-';
  const clean = ktp.replace(/\D/g, '');
  if (!clean) return '-';
  if (clean.length <= 4) return clean;
  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

function truncateText(value?: string, max = 60): string {
  const text = (value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
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
  const [currentRole, setCurrentRole] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', ktp: '' });
  const [patientComplaints, setPatientComplaints] = useState<PatientComplaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintSaving, setComplaintSaving] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    complaint: '',
    complaintDate: new Date().toISOString().slice(0, 10),
  });


  const loadPatients = useCallback(async (selectedEmail?: string) => {
    const [usersData, activitiesData] = await Promise.all([
      getAllUsers(),
      getAllUserStats()
    ]);
    const patientList = usersData.filter((u: any) => u.role === 'patient');
    setPatients(patientList as any);
    setFilteredPatients(patientList as any);
    setAllActivities(activitiesData as any);

    if (selectedEmail) {
      const updated = patientList.find((p: any) => p.email === selectedEmail);
      if (updated) {
        setSelectedPatient((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    }
  }, []);

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

  useEffect(() => {
    // Check if user is staff
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (!isStaffRole(user.role)) {
      navigate('/');
      return;
    }

    setCurrentRole(user.role || '');

    loadPatients();
  }, [loadPatients, navigate]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterType, patients, allActivities]);

  const handleViewDetails = (patient: UserData) => {
    setSelectedPatient(patient);
    setEditForm({
      name: patient.name || '',
      phone: patient.phone || '',
      ktp: patient.ktp || '',
    });
    setIsEditingPatient(false);
    loadPatientChatHistory(patient.email);
    loadPatientComplaints(patient.email, true, patient.medicalHistory || '');

    const activity = allActivities.find((a: any) => a.email === patient.email);
    setPatientActivity(activity || {
      email: patient.email,
      consultationCount: 0,
      activeDays: [],
      lastUpdated: new Date().toISOString()
    });

    setShowDetailModal(true);
  };

  const loadPatientChatHistory = async (email: string) => {
    setLoadingChatHistory(true);
    try {
      const res = await api.getChatHistory(email, 'consultation', 20);
      const messages = (res.messages || []) as ChatHistoryMessage[];
      setChatHistory(messages.filter((m) => m.role === 'user'));
    } catch {
      setChatHistory([]);
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const loadPatientComplaints = useCallback(async (
    email: string,
    syncForm = true,
    fallbackComplaint = ''
  ) => {
    setComplaintsLoading(true);
    try {
      const res = await api.getPatientComplaints(email, 10);
      const list = (res.complaints || []) as PatientComplaint[];
      setPatientComplaints(list);

      if (syncForm) {
        const latest = list[0];
        setComplaintForm({
          complaint: latest?.complaint || fallbackComplaint,
          complaintDate: latest?.complaintDate || new Date().toISOString().slice(0, 10),
        });
      }
    } catch {
      setPatientComplaints([]);
      if (syncForm) {
        setComplaintForm({
          complaint: fallbackComplaint,
          complaintDate: new Date().toISOString().slice(0, 10),
        });
      }
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStaffRole(currentRole)) return;
    if (typeof EventSource === 'undefined') return;

    const streamUrl = api.getPatientComplaintsStreamUrl({ interval: 4 });
    const source = new EventSource(streamUrl, { withCredentials: true });

    const handleRefresh = () => {
      const selectedEmail = selectedPatient?.email;
      void loadPatients(selectedEmail);
      if (selectedEmail) {
        void loadPatientComplaints(selectedEmail, false);
      }
    };

    source.addEventListener('patient-complaints-updated', handleRefresh);

    return () => {
      source.close();
    };
  }, [currentRole, loadPatients, loadPatientComplaints, selectedPatient?.email]);

  const handleSavePatientUpdate = async () => {
    if (!selectedPatient) return;
    try {
      await api.updateProfile({
        email: selectedPatient.email,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        ktp: editForm.ktp.trim(),
      });
      alert('Data pasien berhasil diperbarui');
      setIsEditingPatient(false);
      await loadPatients(selectedPatient.email);
      setSelectedPatient((prev) => prev ? {
        ...prev,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        ktp: editForm.ktp.trim(),
      } : prev);
    } catch (error: any) {
      alert(error?.message || 'Gagal memperbarui data pasien');
    }
  };

  const handleSaveComplaint = async () => {
    if (!selectedPatient) return;
    const trimmedComplaint = complaintForm.complaint.trim();
    if (!trimmedComplaint) {
      alert('Keluhan pasien wajib diisi');
      return;
    }

    setComplaintSaving(true);
    try {
      await api.updatePatientComplaint({
        email: selectedPatient.email,
        complaint: trimmedComplaint,
        complaintDate: complaintForm.complaintDate || undefined,
      });
      await loadPatients(selectedPatient.email);
      await loadPatientComplaints(selectedPatient.email, true, trimmedComplaint);
      setSelectedPatient((prev) => prev ? {
        ...prev,
        medicalHistory: trimmedComplaint,
      } : prev);
      alert('Keluhan pasien berhasil diperbarui');
    } catch (error: any) {
      alert(error?.message || 'Gagal memperbarui keluhan pasien');
    } finally {
      setComplaintSaving(false);
    }
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
    let csv = 'Nama,Email,Nomor HP,Nomor KTP,Tanggal Daftar,Keluhan Terakhir,Konsultasi,Hari Aktif\n';

    filteredPatients.forEach(patient => {
      const activity = allActivities.find((a: any) => a.email === patient.email);
      const complaint = (patient.medicalHistory || '-').replace(/"/g, '""');
      csv += `"${patient.name}","${patient.email}","${patient.phone || '-'}","${patient.ktp || '-'}","${new Date(patient.createdAt).toLocaleDateString('id-ID')}","${complaint}",${activity?.consultationCount || 0},${activity?.activeDays?.length || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pasien-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const isReadOnlyMonitor = isHeadRole(currentRole);
  const canOperatePatientData = isStaffRole(currentRole) && !isReadOnlyMonitor;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="figma-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="figma-heading mb-2">Kelola Pasien</h1>
              <p className="figma-caption">
                Total {filteredPatients.length} dari {patients.length} pasien
              </p>
            </div>
            {!isReadOnlyMonitor && (
              <button
                onClick={exportToCSV}
                className="figma-btn-primary"
              >
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {isReadOnlyMonitor && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Mode monitoring aktif. Kepala Puskesmas hanya dapat melihat data pasien dan laporan penggunaan chatbot tanpa penginputan/perubahan data.
          </div>
        )}

        {/* Filters */}
        <div className="figma-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Cari Pasien
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nama, email, atau nomor HP..."
                className="figma-input"
              />
            </div>

            {/* Filter Type */}
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Filter
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="figma-input"
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
        <div className="figma-card overflow-hidden">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-emerald-300" />
              <p className="text-emerald-700/70 mt-4">Tidak ada pasien yang ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-emerald-50/70 border-b border-emerald-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Pasien
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      KTP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Tanggal Daftar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Keluhan Terakhir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Aktivitas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-emerald-700 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-emerald-100">
                  {filteredPatients.map((patient, index) => {
                    const activity = allActivities.find((a: any) => a.email === patient.email);
                    return (
                      <tr key={index} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {patient.profileImage ? (
                              <img
                                src={patient.profileImage}
                                alt={patient.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                                <span className="text-emerald-500 font-bold">
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-emerald-900">{patient.name}</p>
                              <p className="text-sm text-emerald-700/70">{patient.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-emerald-800">
                            {patient.phone || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-emerald-800">{maskKtp(patient.ktp)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-emerald-800">
                            {new Date(patient.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-emerald-800">
                            {truncateText(patient.medicalHistory, 70)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-3 text-xs">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
                              Konsultasi: {activity?.consultationCount || 0}
                            </span>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                              Hari Aktif: {activity?.activeDays.length || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewDetails(patient)}
                            className="text-emerald-500 hover:text-slate-800 font-medium"
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
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="figma-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                      className="w-20 h-20 rounded-full object-cover border-4 border-emerald-50"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-200">
                      <span className="text-emerald-500 font-bold text-3xl">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    {isEditingPatient ? (
                      <div className="space-y-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="Nama pasien"
                        />
                        <p className="text-gray-600 text-sm">{selectedPatient.email}</p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h3>
                        <p className="text-gray-600">{selectedPatient.email}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Nomor HP</p>
                    {isEditingPatient ? (
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Nomor HP"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{selectedPatient.phone || 'Tidak ada'}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Nomor KTP</p>
                    {isEditingPatient ? (
                      <input
                        value={editForm.ktp}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, ktp: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="KTP 16 digit"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{maskKtp(selectedPatient.ktp)}</p>
                    )}
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

                {/* Keluhan Pasien */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Keluhan Pasien</h4>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
                    {complaintsLoading ? (
                      <p className="text-sm text-gray-500">Memuat keluhan pasien...</p>
                    ) : patientComplaints.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {selectedPatient.medicalHistory || 'Belum ada keluhan pasien yang tersimpan.'}
                      </p>
                    ) : (
                      patientComplaints.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-sm text-gray-700">{item.complaint}</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(item.complaintDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {canOperatePatientData && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Tanggal Keluhan
                          </label>
                          <input
                            type="date"
                            value={complaintForm.complaintDate}
                            onChange={(e) => setComplaintForm((prev) => ({
                              ...prev,
                              complaintDate: e.target.value,
                            }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Keluhan Terbaru
                          </label>
                          <textarea
                            value={complaintForm.complaint}
                            onChange={(e) => setComplaintForm((prev) => ({
                              ...prev,
                              complaint: e.target.value,
                            }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            rows={3}
                            placeholder="Tuliskan keluhan pasien saat ini"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveComplaint}
                        disabled={complaintSaving}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {complaintSaving ? 'Menyimpan...' : 'Simpan Keluhan'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Activity Statistics */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Statistik Aktivitas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{patientActivity.consultationCount}</p>
                      <p className="text-sm text-gray-600 mt-1">Konsultasi</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">{patientActivity.activeDays.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Hari Aktif</p>
                    </div>
                  </div>
                </div>

                {/* Chatbot Questions Log */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Log Pertanyaan Pasien (Chatbot)</h4>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3 max-h-56 overflow-y-auto">
                    {loadingChatHistory ? (
                      <p className="text-sm text-gray-500">Memuat log pertanyaan...</p>
                    ) : chatHistory.length === 0 ? (
                      <p className="text-sm text-gray-500">Belum ada pertanyaan chatbot dari pasien ini.</p>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-sm text-gray-700">{msg.content}</p>
                          {msg.createdAt && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              {new Date(msg.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

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
                  {canOperatePatientData && (
                    isEditingPatient ? (
                      <>
                        <button
                          onClick={handleSavePatientUpdate}
                          className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          Simpan Perubahan
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingPatient(false);
                            setEditForm({
                              name: selectedPatient.name || '',
                              phone: selectedPatient.phone || '',
                              ktp: selectedPatient.ktp || '',
                            });
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Batal Edit
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingPatient(true)}
                        className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Perbarui Data Pasien
                      </button>
                    )
                  )}
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
                  {isAdminRole(currentRole) && (
                    <button
                      onClick={() => handleDeletePatient(selectedPatient)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Hapus Pasien
                    </button>
                  )}
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
