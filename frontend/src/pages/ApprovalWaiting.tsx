import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { CheckCircle2, Clock3, MessageCircleWarning, ShieldCheck } from 'lucide-react';
import { publicInfo } from '../lib/publicInfo';
import api from '../lib/api';

type WaitingState = {
  identifier?: string;
  name?: string;
  email?: string;
  phone?: string;
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  registrationNote?: string;
};

function normalizePhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

const ApprovalWaiting = () => {
  const location = useLocation();
  const state = (location.state || {}) as WaitingState;

  const [name, setName] = useState(state.name || 'Masyarakat');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(state.registrationStatus || 'pending');
  const [note, setNote] = useState(state.registrationNote || '');
  const [email, setEmail] = useState(state.email || '');
  const [phone, setPhone] = useState(state.phone || '');
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState('');

  const identifier = (state.identifier || state.email || state.phone || '').trim();

  const whatsappLink = useMemo(() => {
    // Direct users awaiting approval to the Puskesmas admin WhatsApp number
    const adminRaw = publicInfo.whatsapp || publicInfo.phone || '';
    const normalizedAdmin = normalizePhone(adminRaw);
    if (!normalizedAdmin) return '';
    const text = encodeURIComponent(
      `Halo petugas Puskesmas Wori, saya ${name} ingin menanyakan status approval pendaftaran akun saya.`
    );
    return `https://wa.me/${normalizedAdmin}?text=${text}`;
  }, [name]);

  useEffect(() => {
    if (!identifier || status !== 'pending') {
      return;
    }

    let mounted = true;

    const checkRegistrationStatus = async (silent = true) => {
      if (!silent) {
        setIsChecking(true);
      }

      try {
        const data = await api.getRegistrationStatus(identifier);
        if (!mounted) {
          return;
        }

        const nextStatus = (data?.registrationStatus || 'pending') as 'pending' | 'approved' | 'rejected';
        const nextNote = String(data?.registrationNote || '').trim();

        if (data?.name) {
          setName(String(data.name));
        }
        if (data?.email) {
          setEmail(String(data.email));
        }
        if (data?.phone) {
          setPhone(String(data.phone));
        }

        setStatus(nextStatus);

        if (nextStatus === 'approved') {
          setNote(nextNote || 'Akun Anda sudah diverifikasi oleh tenaga medis. Silakan login untuk mulai menggunakan layanan.');
        } else {
          setNote(nextNote);
        }

        setLastCheckedAt(new Date().toLocaleTimeString('id-ID'));
      } catch {
        if (mounted) {
          setLastCheckedAt(new Date().toLocaleTimeString('id-ID'));
        }
      } finally {
        if (mounted && !silent) {
          setIsChecking(false);
        }
      }
    };

    void checkRegistrationStatus(false);
    const pollingId = window.setInterval(() => {
      void checkRegistrationStatus(true);
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(pollingId);
    };
  }, [identifier, status]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl py-10">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
          {status === 'approved' ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sudah Diverifikasi
            </div>
          ) : (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <Clock3 className="h-3.5 w-3.5" />
              Menunggu Approval
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            {status === 'approved' ? 'Akun Anda Sudah Diverifikasi' : 'Pendaftaran Anda Sedang Diverifikasi'}
          </h1>

          {status === 'approved' ? (
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Halo {name}, akun anda sudah diverifikasi oleh tenaga medis. Silakan lanjut login untuk mulai menggunakan layanan.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Halo {name}, akun Anda sudah tercatat dan saat ini menunggu validasi KTP oleh tenaga medis.
              Anda akan bisa login setelah status pendaftaran disetujui.
            </p>
          )}

          {status === 'approved' && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Akun anda sudah diverifikasi</p>
              <p className="mt-1">{note || 'Silakan klik tombol Login untuk masuk ke akun Anda.'}</p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">Pendaftaran belum disetujui</p>
              <p className="mt-1">{note || 'Silakan periksa kembali data KTP Anda atau hubungi petugas.'}</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <p>
                  Proses validasi dilakukan untuk memastikan pasien berdomisili di wilayah Kecamatan Wori atau sesuai kebijakan layanan. Halaman ini update otomatis secara realtime.
                </p>
              </div>
            </div>
          )}

          {status === 'pending' && (
            <p className="mt-3 text-xs text-slate-500">
              {isChecking ? 'Mengecek status terbaru...' : 'Status diperbarui otomatis setiap 5 detik.'}
              {lastCheckedAt ? ` Terakhir dicek: ${lastCheckedAt}` : ''}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {status === 'approved' ? 'Login Sekarang' : 'Kembali ke Login'}
            </Link>

            {whatsappLink && status !== 'approved' && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <MessageCircleWarning className="h-4 w-4" />
                Hubungi via WhatsApp
              </a>
            )}
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Email: {email || state.email || '-'}
            {phone ? ` | WA: ${phone}` : ''}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default ApprovalWaiting;
