import Layout from '../components/layout/Layout';

const KebijakanPrivasi = () => {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kebijakan Privasi</h1>
          <p className="mt-2 text-sm text-slate-600">Penjelasan pengumpulan dan penggunaan data pasien pada sistem Puskesbot.</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">1. Data Yang Dikumpulkan</h2>
          <p className="text-sm text-slate-600">Kami mengumpulkan data identitas, kontak, data keluhan, serta foto verifikasi KTP untuk proses pendaftaran layanan kesehatan.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">2. Tujuan Penggunaan Data</h2>
          <p className="text-sm text-slate-600">Data digunakan untuk verifikasi pasien, pelayanan administrasi, komunikasi kesehatan, dan peningkatan kualitas layanan.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">3. Akses Data</h2>
          <p className="text-sm text-slate-600">Data hanya dapat diakses petugas berwenang sesuai peran dan kebutuhan operasional pelayanan.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">4. Perlindungan Data</h2>
          <p className="text-sm text-slate-600">Kami menerapkan kontrol akses dan pengamanan sistem untuk menjaga kerahasiaan data pasien.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">5. Hak Pengguna</h2>
          <p className="text-sm text-slate-600">Pengguna dapat mengajukan pembaruan data pribadi melalui petugas Puskesmas sesuai prosedur yang berlaku.</p>
        </section>
      </div>
    </Layout>
  );
};

export default KebijakanPrivasi;
