import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import type { PendingRegistrationUser } from '../lib/api';
import { isStaffRole } from '../lib/roles';
import { CheckCircle2, Clock3, Eye, MessageCircleMore, RefreshCcw, XCircle } from 'lucide-react';

type ReviewAction = 'approve' | 'reject';

type ReviewModalState = {
  item: PendingRegistrationUser;
  action: ReviewAction;
  note: string;
};

type SessionUser = {
  email?: string;
  role?: string;
};

function normalizePhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

const PendingApprovals = () => {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<PendingRegistrationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyEmail, setBusyEmail] = useState('');
  const [error, setError] = useState('');
  const [reviewTarget, setReviewTarget] = useState<PendingRegistrationUser | null>(null);
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);

  const canReview = sessionUser?.role === 'nurse';

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPendingRegistrations(300);
      setItems(Array.isArray(data?.pending) ? data.pending : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal muat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      navigate('/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SessionUser;
      if (!isStaffRole(parsed?.role)) {
        navigate('/');
        return;
      }
      setSessionUser(parsed);
      void loadPending();
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const openReviewModal = (item: PendingRegistrationUser, action: ReviewAction) => {
    setError('');
    setReviewModal({ item, action, note: '' });
  };

  const submitReview = async () => {
    if (!reviewModal) return;

    setBusyEmail(reviewModal.item.email);
    try {
      await api.reviewPendingRegistration(reviewModal.item.email, {
        action: reviewModal.action,
        note: reviewModal.note.trim(),
      });
      setReviewModal(null);
      await loadPending();
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses approval.');
    } finally {
      setBusyEmail('');
    }
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    [items]
  );

  return (
    <Layout>
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Approval Pasien</h1>
              <p className="mt-1 text-sm text-slate-600">
                Cek KTP sebelum akun aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPending()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />
            Menunggu: {sortedItems.length}
          </div>

          {!canReview && (
            <p className="mt-3 text-xs text-slate-500">
              Aksi hanya untuk nurse.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Memuat data...
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Tidak ada data.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item) => {
              const normalizedPhone = normalizePhone(item.phone);
              const whatsappLink = item.whatsappLink
                || (normalizedPhone
                  ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Halo ${item.name || 'Pasien'}, pendaftaran akun Anda sedang kami proses.`)}`
                  : '');

              return (
                <div key={item.email} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-800">{item.name || '-'}</p>
                      <p className="text-xs text-slate-500">{item.email || '-'}</p>
                      <p className="text-xs text-slate-500">WA: {item.phone || '-'}</p>
                      <p className="text-xs text-slate-500">KTP: {item.ktp || '-'}</p>
                      <p className="text-xs text-slate-500">
                        Tanggal: {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <MessageCircleMore className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setReviewTarget(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Tinjau KTP
                      </button>

                      <button
                        type="button"
                        disabled={!canReview || busyEmail === item.email}
                        onClick={() => openReviewModal(item, 'approve')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Setujui
                      </button>

                      <button
                        type="button"
                        disabled={!canReview || busyEmail === item.email}
                        onClick={() => openReviewModal(item, 'reject')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Tinjau KTP</h2>
                  <p className="text-xs text-slate-500">{reviewTarget.name || reviewTarget.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">KTP</p>
                  {reviewTarget.ktpImage ? (
                    <img src={reviewTarget.ktpImage} alt="KTP" className="h-80 w-full rounded-lg object-contain bg-white" />
                  ) : (
                    <p className="text-sm text-slate-500">Tidak ada foto.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">KTP + Pemilik</p>
                  {reviewTarget.ktpWithOwnerImage ? (
                    <img src={reviewTarget.ktpWithOwnerImage} alt="KTP dan pemilik" className="h-80 w-full rounded-lg object-contain bg-white" />
                  ) : (
                    <p className="text-sm text-slate-500">Tidak ada foto.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {reviewModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
              <div className="space-y-1 border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {reviewModal.action === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
                </h2>
                <p className="text-sm text-slate-600">
                  {reviewModal.action === 'approve'
                    ? `Setujui pendaftaran ${reviewModal.item.name || reviewModal.item.email}?`
                    : `Tolak pendaftaran ${reviewModal.item.name || reviewModal.item.email}?`}
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Tekan <span className="font-semibold text-slate-800">Batal</span> jika Anda salah menekan tombol. Tidak ada perubahan yang dikirim sebelum Anda menekan tombol konfirmasi.
                </div>

                <div>
                  <label htmlFor="review-note" className="mb-2 block text-sm font-medium text-slate-700">
                    {reviewModal.action === 'approve' ? 'Catatan approval' : 'Alasan penolakan'} <span className="font-normal text-slate-400">(opsional)</span>
                  </label>
                  <textarea
                    id="review-note"
                    value={reviewModal.note}
                    onChange={(e) => setReviewModal((prev) => prev ? { ...prev, note: e.target.value } : prev)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder={reviewModal.action === 'approve' ? 'Tulis catatan jika perlu' : 'Tulis alasan jika perlu'}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReviewModal(null)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={busyEmail === reviewModal.item.email}
                    onClick={() => void submitReview()}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${reviewModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                  >
                    {busyEmail === reviewModal.item.email ? 'Memproses...' : reviewModal.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
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

export default PendingApprovals;
