import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import { isHeadRole } from '../lib/roles';
import { CalendarDays, Loader2, CheckCircle, X, Clock3, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

function getActorEmail(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.email || '';
    }
  } catch { /* ignore */ }
  return '';
}

const ApprovalInformasi = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [infoList, setInfoList] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/login'); return; }
    const u = JSON.parse(raw);
    if (!isHeadRole(u.role)) { navigate('/'); return; }
    setRole(u.role || '');
    void loadAll();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const actor = getActorEmail();
      const health = await api.getAnnouncements(actor, 'health_info');
      const sched = await api.getAnnouncements(actor, 'schedule');
      
      // Filter only pending items for approval
      const pendingInfo = (health.announcements || []).filter((a:any) => a.approvalStatus === 'pending');
      const pendingSchedules = (sched.announcements || []).filter((a:any) => a.approvalStatus === 'pending');
      
      setInfoList(pendingInfo);
      setSchedules(pendingSchedules);
    } catch (err:any) {
      console.error(err);
      toast({
        title: 'Gagal memuat data',
        description: String(err?.message || ''),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id:number, status:'approved'|'rejected', title:string) => {
    try {
      await api.setAnnouncementApproval(id, status);
      
      // Show toast notification
      if (status === 'approved') {
        toast({
          title: 'Approved ✓',
          description: `"${title}" telah disetujui dan akan ditampilkan ke pasien & masyarakat.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Rejected',
          description: `"${title}" ditolak.`,
          variant: 'destructive',
        });
      }
      
      await loadAll();
    } catch (err:any) {
      toast({
        title: 'Gagal mengubah status',
        description: String(err?.message || ''),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-500">Memuat permintaan approval...</span>
        </div>
      </Layout>
    );
  }

  const totalPending = infoList.length + schedules.length;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-700">Approval Informasi</h1>
          <p className="text-slate-500 text-sm mt-1">
            Validasi permintaan publikasi informasi kesehatan dan jadwal layanan dari Tenaga Medis sebelum ditampilkan ke pasien dan masyarakat.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white border border-emerald-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{infoList.length}</p>
            <p className="text-xs text-slate-400 mt-1">Info Pending</p>
          </div>
          <div className="bg-white border border-emerald-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{schedules.length}</p>
            <p className="text-xs text-slate-400 mt-1">Jadwal Pending</p>
          </div>
          <div className="bg-white border border-emerald-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalPending}</p>
            <p className="text-xs text-slate-400 mt-1">Total Menunggu</p>
          </div>
        </div>

        {totalPending === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-emerald-700 font-semibold">Semua sudah divalidasi</p>
            <p className="text-emerald-600 text-sm mt-1">Tidak ada permintaan publikasi yang menunggu persetujuan Anda.</p>
          </div>
        )}

        {/* Informasi Kesehatan Pending */}
        {infoList.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-3">Permintaan Publikasi Informasi Kesehatan</h2>
            <div className="space-y-3">
              {infoList.map(ann => (
                <div key={ann.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-700">{ann.title}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">
                          Menunggu Persetujuan
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{ann.content}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Dibuat oleh: <span className="font-medium">{ann.createdBy}</span> pada {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleApproval(ann.id, 'approved', ann.title)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Setujui & Publikasikan
                    </button>
                    <button
                      onClick={() => handleApproval(ann.id, 'rejected', ann.title)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Approval Jadwal Berobat / Posyandu */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Approval Jadwal Berobat / Posyandu</h2>

          {schedules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-600 font-medium">Belum ada jadwal yang menunggu persetujuan.</p>
              <p className="text-slate-400 text-sm mt-1">
                Saat Tenaga Medis menginput jadwal baru, permintaan akan muncul di sini untuk Anda validasi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(sched => (
                <div key={sched.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-700">{sched.title}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">
                          Menunggu Persetujuan
                        </span>
                      </div>
                      {sched.content && <p className="text-sm text-slate-600 mb-2">{sched.content}</p>}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-4 h-4 text-emerald-600" />
                          {sched.eventDate || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="w-4 h-4 text-blue-600" />
                          {sched.eventTime ? `${sched.eventTime.slice(0, 5)} WITA` : '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-violet-600" />
                          {sched.location || '-'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Dibuat oleh: <span className="font-medium">{sched.createdBy}</span> pada {new Date(sched.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleApproval(sched.id, 'approved', sched.title)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Setujui & Publikasikan
                    </button>
                    <button
                      onClick={() => handleApproval(sched.id, 'rejected', sched.title)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default ApprovalInformasi;
