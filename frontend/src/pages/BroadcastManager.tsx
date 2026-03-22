import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import {
  getBroadcastContacts,
  downloadContactsCSV,
  copyPhonestoClipboard,
  getUserStats,
  formatPhoneDisplay,
  type BroadcastContact
} from '../lib/userBroadcast';
import api from '../lib/api';
import {
  FaDownload,
  FaCopy,
  FaWhatsapp,
  FaUsers,
  FaPhone,
  FaEnvelope,
  FaPaperPlane,
  FaBroadcastTower,
  FaCheckCircle,
  FaTimesCircle,
  FaHistory,
  FaPlug,
} from 'react-icons/fa';
import { Info, Send, RefreshCw, MessageSquare, Loader2 } from 'lucide-react';

interface BroadcastLog {
  id: number;
  adminEmail: string;
  message: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  status: string;
  createdAt: string;
}

interface FonnteStatusData {
  connected: boolean;
  configured: boolean;
  message?: string;
  detail?: string;
  quota?: number | null;
  device?: Record<string, unknown>;
}

function getAdminEmail(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.role === 'nurse') return user.email;
    }
  } catch { /* ignore */ }
  return '';
}

const BroadcastManager = () => {
  const [contacts, setContacts] = useState<BroadcastContact[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersWithPhone: 0,
    usersWithoutPhone: 0,
    registrationRate: '0'
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fonnte state
  const [fonnteStatus, setFonnteStatus] = useState<FonnteStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastDelay, setBroadcastDelay] = useState('2-5');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; detail: string; count?: number } | null>(null);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Individual send
  const [selectedContact, setSelectedContact] = useState<BroadcastContact | null>(null);
  const [individualMsg, setIndividualMsg] = useState('');
  const [sendingIndividual, setSendingIndividual] = useState(false);
  const [individualResult, setIndividualResult] = useState<{ success: boolean; detail: string } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'broadcast' | 'individual' | 'contacts' | 'logs'>('broadcast');

  const adminEmail = getAdminEmail();

  useEffect(() => {
    loadData();
    checkFonnteStatus();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    const broadcastContacts = await getBroadcastContacts();
    setContacts(broadcastContacts);
    const userStats = await getUserStats();
    setStats(userStats);
  };

  const checkFonnteStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await api.fonnteStatus(adminEmail);
      setFonnteStatus(data);
    } catch (err: unknown) {
      setFonnteStatus({ connected: false, configured: false, message: String(err) });
    } finally {
      setStatusLoading(false);
    }
  }, [adminEmail]);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.fonnteLogs(adminEmail, 30);
      setLogs(data.logs || []);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };

  const handleDownloadCSV = async () => {
    await downloadContactsCSV();
    alert('File CSV berhasil didownload!');
  };

  const handleCopyPhones = async () => {
    const success = await copyPhonestoClipboard();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } else {
      alert('Gagal menyalin nomor telepon');
    }
  };

  // Broadcast to all patients
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      alert('Pesan broadcast tidak boleh kosong!');
      return;
    }
    if (!confirm(`Kirim broadcast ke ${stats.usersWithPhone} pasien?\n\nPesan:\n${broadcastMsg.substring(0, 200)}...`)) {
      return;
    }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const data = await api.fonnteBroadcast({
        adminEmail,
        message: broadcastMsg,
        delay: broadcastDelay,
      });
      setBroadcastResult({
        success: data.success,
        detail: data.detail || (data.success ? 'Broadcast berhasil dikirim!' : 'Broadcast gagal'),
        count: data.recipientCount,
      });
      if (data.success) {
        loadLogs();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBroadcastResult({ success: false, detail: msg });
    } finally {
      setBroadcasting(false);
    }
  };

  // Send individual
  const handleSendIndividual = async () => {
    if (!selectedContact || !individualMsg.trim()) {
      alert('Pilih kontak dan isi pesan!');
      return;
    }

    setSendingIndividual(true);
    setIndividualResult(null);
    try {
      const data = await api.fonnteSendIndividual({
        adminEmail,
        phone: selectedContact.phone,
        message: individualMsg,
        name: selectedContact.name,
      });
      setIndividualResult({
        success: data.success,
        detail: data.detail || (data.success ? 'Pesan terkirim!' : 'Gagal mengirim'),
      });
      if (data.success) {
        loadLogs();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIndividualResult({ success: false, detail: msg });
    } finally {
      setSendingIndividual(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-700 mb-2">
            <FaWhatsapp className="inline mr-2 text-green-600" />
            Manajemen Broadcast WhatsApp
          </h1>
          <p className="text-gray-600">
            Kirim notifikasi kesehatan langsung via WhatsApp menggunakan Fonnte Gateway
          </p>
        </div>

        {/* Fonnte Connection Status */}
        <div className={`mb-6 rounded-lg p-4 border ${
          fonnteStatus?.connected
            ? 'bg-green-50 border-green-300'
            : fonnteStatus?.configured
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaPlug className={`text-xl ${
                fonnteStatus?.connected ? 'text-green-600' : fonnteStatus?.configured ? 'text-yellow-600' : 'text-red-500'
              }`} />
              <div>
                <p className="font-semibold text-sm">
                  Status Fonnte:{' '}
                  {statusLoading ? (
                    <span className="text-gray-500">Memeriksa...</span>
                  ) : fonnteStatus?.connected ? (
                    <span className="text-green-700">Terhubung ✓</span>
                  ) : fonnteStatus?.configured ? (
                    <span className="text-yellow-700">Tidak Terhubung — {fonnteStatus.message || fonnteStatus.detail || 'Device mungkin offline'}</span>
                  ) : (
                    <span className="text-red-700">Belum Dikonfigurasi — Tambahkan FONNTE_TOKEN di .env</span>
                  )}
                </p>
                {fonnteStatus?.quota != null && (
                  <p className="text-xs text-gray-600 mt-1">Sisa quota: {fonnteStatus.quota} pesan</p>
                )}
              </div>
            </div>
            <button
              onClick={checkFonnteStatus}
              disabled={statusLoading}
              className="text-sm px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total User</p>
                <p className="text-3xl font-bold text-blue-800">{stats.totalUsers}</p>
              </div>
              <FaUsers className="text-4xl text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">User dengan No. HP</p>
                <p className="text-3xl font-bold text-green-800">{stats.usersWithPhone}</p>
              </div>
              <FaPhone className="text-4xl text-green-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Tanpa No. HP</p>
                <p className="text-3xl font-bold text-yellow-800">{stats.usersWithoutPhone}</p>
              </div>
              <FaEnvelope className="text-4xl text-yellow-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">% Registrasi Lengkap</p>
                <p className="text-3xl font-bold text-purple-800">{stats.registrationRate}%</p>
              </div>
              <FaWhatsapp className="text-4xl text-purple-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {([
            { key: 'broadcast', label: 'Broadcast Massal', icon: <FaBroadcastTower className="mr-2" /> },
            { key: 'individual', label: 'Kirim Personal', icon: <FaPaperPlane className="mr-2" /> },
            { key: 'contacts', label: 'Daftar Kontak', icon: <FaUsers className="mr-2" /> },
            { key: 'logs', label: 'Riwayat Kirim', icon: <FaHistory className="mr-2" /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ TAB: BROADCAST MASSAL ============ */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaBroadcastTower className="text-green-600" />
                Kirim Broadcast ke Semua Pasien
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Pesan akan dikirim ke <strong>{stats.usersWithPhone}</strong> pasien yang memiliki nomor telepon.
                Gunakan <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> untuk menyisipkan nama pasien secara otomatis.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pesan Broadcast <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    rows={6}
                    placeholder={`Contoh:\n\nHalo {name}! 👋\n\nIni adalah pemberitahuan dari Puskesmas Wori.\nJangan lupa jadwal imunisasi anak Anda minggu ini.\n\nTerima kasih! 🙏\n- Tim Puskesmas Wori`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-400">{broadcastMsg.length} / 60.000 karakter</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay antar pesan (detik)
                  </label>
                  <input
                    type="text"
                    value={broadcastDelay}
                    onChange={(e) => setBroadcastDelay(e.target.value)}
                    placeholder="2-5"
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Format: &quot;2-5&quot; berarti random 2–5 detik antar pesan, hindari spam
                  </p>
                </div>

                {/* Preview */}
                {broadcastMsg && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 mb-2">📱 Preview Pesan:</p>
                    <div className="bg-green-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap max-w-md">
                      {broadcastMsg.replace(/\{name\}/g, 'John Doe')}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBroadcast}
                  disabled={broadcasting || !broadcastMsg.trim() || !fonnteStatus?.configured}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors w-full md:w-auto ${
                    broadcasting || !broadcastMsg.trim() || !fonnteStatus?.configured
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {broadcasting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim Broadcast...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Kirim Broadcast ke {stats.usersWithPhone} Pasien
                    </>
                  )}
                </button>

                {!fonnteStatus?.configured && (
                  <p className="text-sm text-red-600">
                    ⚠️ Fonnte belum dikonfigurasi. Tambahkan FONNTE_TOKEN di .env.
                  </p>
                )}

                {fonnteStatus?.configured && !fonnteStatus?.connected && (
                  <p className="text-sm text-yellow-600">
                    ⚠️ Device Fonnte sedang offline. Pesan tetap akan diantrekan dan terkirim saat device kembali online.
                  </p>
                )}

                {/* Result */}
                {broadcastResult && (
                  <div className={`p-4 rounded-lg border ${
                    broadcastResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {broadcastResult.success ? (
                        <FaCheckCircle className="text-green-600 text-lg" />
                      ) : (
                        <FaTimesCircle className="text-red-600 text-lg" />
                      )}
                      <p className={`font-medium ${broadcastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {broadcastResult.detail}
                      </p>
                    </div>
                    {broadcastResult.count && (
                      <p className="text-sm mt-1 text-gray-600">
                        Dikirim ke {broadcastResult.count} penerima
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📝 Template Cepat</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Pemberitahuan Jadwal',
                    text: 'Halo {name}! 👋\n\nIni pemberitahuan dari Puskesmas Wori.\nMohon untuk datang sesuai jadwal yang telah ditentukan.\n\nTerima kasih! 🙏\n- Tim Puskesmas Wori',
                  },
                  {
                    title: 'Imunisasi Anak',
                    text: 'Halo {name}! 💉\n\nJangan lupa jadwal imunisasi anak Anda di Puskesmas Wori.\nPastikan membawa buku KIA.\n\nInfo lebih lanjut: https://woricare.online\n\n- Tim Puskesmas Wori',
                  },
                  {
                    title: 'Pengumuman Umum',
                    text: 'Halo {name}! 📢\n\nPuskesmas Wori menginformasikan bahwa:\n[ISI PENGUMUMAN]\n\nUntuk informasi lengkap kunjungi https://woricare.online\n\nTerima kasih! 🙏',
                  },
                  {
                    title: 'Tips Kesehatan',
                    text: 'Halo {name}! 🏥\n\nTips kesehatan dari Puskesmas Wori:\n\n✅ Jaga pola makan sehat\n✅ Olahraga teratur\n✅ Istirahat cukup\n✅ Minum air putih minimal 8 gelas/hari\n\nSehat bersama! 💪',
                  },
                ].map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setBroadcastMsg(tpl.text)}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800">{tpl.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.text.substring(0, 80)}...</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: KIRIM PERSONAL ============ */}
        {activeTab === 'individual' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="text-green-600 w-5 h-5" />
                Kirim Pesan Personal
              </h2>

              {/* Select Contact */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Penerima</label>
                <select
                  value={selectedContact ? selectedContact.phone : ''}
                  onChange={(e) => {
                    const c = contacts.find(ct => ct.phone === e.target.value);
                    setSelectedContact(c || null);
                    setIndividualResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">-- Pilih kontak --</option>
                  {contacts.map((c, i) => (
                    <option key={i} value={c.phone}>
                      {c.name} — {formatPhoneDisplay(c.phone)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedContact && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm">
                    <strong>Kepada:</strong> {selectedContact.name}
                    <br />
                    <strong>No. WA:</strong> {formatPhoneDisplay(selectedContact.phone)}
                    <br />
                    <strong>Email:</strong> {selectedContact.email}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                <textarea
                  value={individualMsg}
                  onChange={(e) => setIndividualMsg(e.target.value)}
                  rows={5}
                  placeholder="Tulis pesan untuk pasien..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                />
              </div>

              <button
                onClick={handleSendIndividual}
                disabled={sendingIndividual || !selectedContact || !individualMsg.trim() || !fonnteStatus?.configured}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                  sendingIndividual || !selectedContact || !individualMsg.trim() || !fonnteStatus?.configured
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {sendingIndividual ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Kirim Pesan
                  </>
                )}
              </button>

              {individualResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  individualResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {individualResult.success ? (
                      <FaCheckCircle className="text-green-600" />
                    ) : (
                      <FaTimesCircle className="text-red-600" />
                    )}
                    <p className={`font-medium text-sm ${individualResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {individualResult.detail}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB: DAFTAR KONTAK ============ */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            {/* Export Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Export Data Kontak
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center justify-center gap-3 bg-sky-500 text-white px-6 py-3 rounded-lg hover:bg-sky-600 transition-colors"
                >
                  <FaDownload />
                  Download File CSV
                </button>
                <button
                  onClick={handleCopyPhones}
                  className={`flex items-center justify-center gap-3 px-6 py-3 rounded-lg transition-colors ${
                    copySuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  <FaCopy />
                  {copySuccess ? ' Tersalin!' : 'Copy Semua Nomor'}
                </button>
              </div>
            </div>

            {/* Contact Table */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Cari nama, nomor HP, atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor WhatsApp</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{contact.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <a
                              href={`https://wa.me/${contact.phone.replace(/[\s\-()+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 flex items-center gap-2"
                            >
                              <FaWhatsapp />
                              {formatPhoneDisplay(contact.phone)}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{contact.email}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setActiveTab('individual');
                                setIndividualResult(null);
                              }}
                              className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1"
                            >
                              <FaPaperPlane className="text-[10px]" />
                              Kirim
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          {searchTerm ? 'Tidak ada hasil yang ditemukan' : 'Belum ada user yang terdaftar'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Menampilkan {filteredContacts.length} dari {contacts.length} kontak
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: RIWAYAT KIRIM ============ */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <FaHistory className="text-gray-500" />
                Riwayat Broadcast
              </h2>
              <button
                onClick={loadLogs}
                disabled={logsLoading}
                className="text-sm px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Memuat riwayat...
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className={`border rounded-lg p-4 ${
                    log.status === 'sent' ? 'border-green-200 bg-green-50/50' :
                    log.status === 'partial' ? 'border-yellow-200 bg-yellow-50/50' :
                    'border-red-200 bg-red-50/50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {log.status === 'sent' ? (
                            <FaCheckCircle className="text-green-600 text-sm" />
                          ) : (
                            <FaTimesCircle className="text-red-600 text-sm" />
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            log.status === 'sent' ? 'bg-green-200 text-green-800' :
                            log.status === 'partial' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {log.status === 'sent' ? 'Terkirim' : log.status === 'partial' ? 'Sebagian' : 'Gagal'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{log.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.recipientCount} penerima · Berhasil: {log.successCount} · Gagal: {log.failCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaHistory className="text-4xl mx-auto mb-2 text-gray-300" />
                <p>Belum ada riwayat broadcast</p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong><Info className="w-4 h-4 inline mr-1" /> Informasi Penting:</strong>
          </p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• Data nomor telepon hanya untuk keperluan broadcast informasi kesehatan Puskesmas Wori</li>
            <li>• Pastikan pesan broadcast bermanfaat dan tidak spam</li>
            <li>• Gunakan delay antar pesan (2-5 detik) untuk menghindari blokir WhatsApp</li>
            <li>• Hormati privasi user dengan tidak membagikan data ke pihak ketiga</li>
            <li>• Berikan opsi opt-out dalam setiap broadcast message</li>
            <li>• Token Fonnte didapatkan dari <a href="https://md.fonnte.com" target="_blank" rel="noopener noreferrer" className="underline text-yellow-800 font-medium">md.fonnte.com</a> → Devices → Token</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default BroadcastManager;
