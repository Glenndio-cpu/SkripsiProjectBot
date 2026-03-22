import React from 'react';
import Layout from '../components/layout/Layout';
import { Target, Eye, MessageCircle, Pill, Apple, ShieldAlert, HeartPulse, Info, Stethoscope } from 'lucide-react';

const Tentang = () => {
  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-700 mb-4">
            Tentang Puskesmas Wori
          </h1>
          <p className="text-slate-500 leading-relaxed">
            Puskesmas Wori Online adalah Chatbot yang dirancang untuk memberikan informasi pelayanan serta informasi kesehatan di masyarakat.
          </p>
        </div>
      </section>

      {/* Visi & Misi */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100">
            <Eye className="w-8 h-8 text-sky-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-3">Visi</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Menciptakan masyarakat yang lebih sehat dengan memberikan akses informasi kesehatan yang mudah dan terpercaya untuk semua orang.
            </p>
          </div>
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100">
            <Target className="w-8 h-8 text-sky-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-3">Misi</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Meningkatkan pengetahuan masyarakat tentang penyakit menular, mendorong pola hidup sehat, dan mendukung pencapaian Tujuan Pembangunan Berkelanjutan (SDGs).
            </p>
          </div>
        </div>
      </section>

      {/* Bagaimana Kami Bekerja */}
      <section className="py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-4">Bagaimana Kami Bekerja</h2>
          <p className="text-slate-500 text-center max-w-2xl mx-auto mb-12">
            Puskesmas Wori menggunakan teknologi AI Gemini 1.5 & Gemini 2.0 Flash untuk memproses pertanyaan Anda dan memberikan informasi yang relevan dan akurat.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: HeartPulse, title: 'Gejala Penyakit', desc: 'Informasi tentang gejala penyakit menular.' },
              { icon: Pill, title: 'Rekomendasi Obat', desc: 'Rekomendasi obat-obatan yang sesuai untuk kondisi kesehatan Anda.' },
              { icon: Apple, title: 'Panduan Makanan', desc: 'Panduan tentang makanan dan minuman yang sebaiknya dikonsumsi atau dihindari.' },
              { icon: ShieldAlert, title: 'Tips Pencegahan', desc: 'Tips pencegahan penyebaran penyakit menular.' },
              { icon: Info, title: 'Informasi Kesehatan', desc: 'Informasi umum seputar kesehatan dan penyakit menular.' },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-4 p-5 rounded-xl border border-slate-100 bg-white ${i === 4 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                <item.icon className="w-6 h-6 text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-slate-50 py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 sm:p-6 rounded-xl border border-sky-100 bg-sky-50">
            <Stethoscope className="w-6 h-6 text-sky-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm leading-relaxed">
              <strong>Perhatian:</strong> Puskesmas Wori Online tidak menggantikan konsultasi dengan profesional kesehatan. Selalu konsultasikan masalah kesehatan serius dengan dokter.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Tentang;