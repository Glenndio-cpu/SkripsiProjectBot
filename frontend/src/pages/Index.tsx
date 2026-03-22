import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Pill, Apple, Activity, MessageCircle, ArrowRight, Stethoscope, Users, CheckCircle, Clock, Shield, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <Layout>
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Hero */}
      <section className="py-12 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-700 leading-tight mb-5">
              Puskesmas Wori <span className="text-sky-500">Online</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Chatbot Pendamping Puskesmas Sebagai Inovasi Layanan Kesehatan Desa Wori Menggunakan Whatsapp Gateway Terintegrasi RAG dan LLM
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link
                to="/konsultasi"
                className="inline-flex items-center justify-center gap-2 bg-sky-500 text-white px-7 py-3 rounded-xl font-semibold hover:bg-sky-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Layanan Chatbot
              </Link>
              <Link
                to="/penyakit"
                className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:border-sky-300 hover:text-sky-600 transition-colors"
              >
                Pelajari Lebih Lanjut
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-10 max-w-md mx-auto lg:mx-0">
              {[
                { value: '24/7', label: 'Layanan Online' },
                { value: 'AI', label: 'Chatbot Cerdas' },
                { value: 'Gratis', label: 'Untuk Semua' },
              ].map((stat, i) => (
                <div key={i} className="text-center lg:text-left">
                  <p className="text-2xl sm:text-3xl font-bold text-sky-500">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center order-1 lg:order-2">
            <img
              src="https://img.freepik.com/free-vector/doctors-concept-illustration_114360-1515.jpg"
              alt="Tim Dokter Puskesmas Wori"
              className="w-full max-w-sm sm:max-w-md lg:max-w-lg rounded-2xl shadow-lg border border-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Fitur Utama */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Fitur Utama</h2>
          <p className="text-slate-400 mt-2 text-center max-w-lg mx-auto mb-12">Temukan manfaat menggunakan Puskesmas Wori Online untuk kebutuhan kesehatan Anda</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Pill, title: 'Rekomendasi Obat', desc: 'Dapatkan rekomendasi obat yang sesuai dengan gejala dan kondisi kesehatan Anda secara cepat dan akurat.' },
              { icon: Apple, title: 'Saran Konsumsi', desc: 'Informasi makanan yang sebaiknya dikonsumsi atau dihindari saat Anda sedang dalam kondisi sakit.' },
              { icon: Activity, title: 'Info Penyakit', desc: 'Informasi lengkap tentang berbagai penyakit menular dan tidak menular, gejala, serta pencegahannya.' },
            ].map((item, i) => (
              <div key={i} className={`group bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 hover:border-sky-200 transition-colors ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                <div className="w-14 h-14 bg-sky-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-sky-500 transition-colors">
                  <item.icon className="w-7 h-7 text-sky-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Menggunakan */}
      <section className="py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Cara Menggunakan</h2>
          <p className="text-slate-400 mt-2 text-center max-w-lg mx-auto mb-12">Tiga langkah mudah untuk mulai menggunakan layanan kesehatan digital kami</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { step: '1', icon: Users, title: 'Daftar Akun', desc: 'Buat akun gratis untuk mengakses semua layanan kesehatan digital kami.' },
              { step: '2', icon: MessageCircle, title: 'Mulai Konsultasi', desc: 'Ceritakan keluhan Anda melalui chatbot AI yang tersedia 24/7.' },
              { step: '3', icon: Stethoscope, title: 'Dapatkan Saran', desc: 'Terima rekomendasi kesehatan berdasarkan analisis AI yang akurat.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-sky-500 text-sky-500 rounded-full text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mengapa Memilih Kami */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-4">Mengapa Memilih Layanan Kami?</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Kami menggabungkan teknologi AI terbaru dengan pengetahuan medis untuk memberikan layanan kesehatan yang mudah diakses oleh seluruh masyarakat Desa Wori.
            </p>
            <div className="space-y-4">
              {[
                { icon: CheckCircle, text: 'Informasi kesehatan terverifikasi dan akurat' },
                { icon: Clock, text: 'Tersedia 24 jam setiap hari tanpa batas waktu' },
                { icon: Shield, text: 'Data pengguna terjamin keamanannya' },
                { icon: Sparkles, text: 'Didukung teknologi AI Gemini terbaru' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <item.icon className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { number: '500+', label: 'Pengguna Aktif', icon: Users },
              { number: '1000+', label: 'Konsultasi AI', icon: MessageCircle },
              { number: '24/7', label: 'Dukungan Online', icon: Clock },
              { number: '100%', label: 'Gratis Diakses', icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 text-center">
                <stat.icon className="w-6 h-6 text-sky-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-slate-700">{stat.number}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDGs */}
      <section className="py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Mendukung SDGs</h2>
          <p className="text-slate-400 mt-2 text-center max-w-lg mx-auto mb-12">Kontribusi kami untuk Tujuan Pembangunan Berkelanjutan</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <a
              href="https://sdgs.un.org/goals/goal3"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 hover:border-sky-200 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">3</div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Good Health and Well-being</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Memastikan kehidupan yang sehat dan mendorong kesejahteraan bagi semua orang pada segala usia.</p>
                <span className="inline-flex items-center gap-1 text-sky-500 text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                  Pelajari Lebih Lanjut <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </a>
            <a
              href="https://sdgs.un.org/goals/goal12"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 hover:border-sky-200 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">12</div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Responsible Consumption & Production</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Memastikan pola konsumsi dan produksi yang berkelanjutan, termasuk dalam konteks layanan kesehatan.</p>
                <span className="inline-flex items-center gap-1 text-sky-500 text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                  Pelajari Lebih Lanjut <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;