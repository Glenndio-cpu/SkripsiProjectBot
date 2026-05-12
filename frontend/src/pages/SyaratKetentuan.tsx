import Layout from '../components/layout/Layout';

const SyaratKetentuan = () => {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Syarat & Ketentuan</h1>
          <p className="mt-2 text-sm text-slate-600">Berlaku untuk penggunaan layanan Puskesbot dan pendaftaran pasien online.</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">1. Akurasi Data</h2>
          <p className="text-sm text-slate-600">Pengguna wajib mengisi data identitas dan kesehatan secara benar. Data palsu dapat menyebabkan pendaftaran ditolak.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">2. Foto Verifikasi</h2>
          <p className="text-sm text-slate-600">Foto KTP dan foto KTP bersama pemilik wajib diambil langsung dari kamera perangkat saat registrasi.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">3. Approval Tenaga Medis</h2>
          <p className="text-sm text-slate-600">Akun pasien baru akan aktif setelah diverifikasi oleh tenaga medis. Puskesmas berhak menolak pendaftaran bila data tidak valid.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">4. Penggunaan Layanan</h2>
          <p className="text-sm text-slate-600">Layanan ditujukan untuk informasi dan administrasi kesehatan. Dalam kondisi gawat darurat, segera hubungi fasilitas kesehatan terdekat.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">5. Perubahan Ketentuan</h2>
          <p className="text-sm text-slate-600">Ketentuan dapat diperbarui sewaktu-waktu. Versi terbaru akan ditampilkan pada halaman ini.</p>
        </section>
      </div>
    </Layout>
  );
};

export default SyaratKetentuan;
