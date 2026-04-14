import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Pill, Apple, Activity, MessageCircle, ArrowRight, Stethoscope, Users, CheckCircle, Clock, Shield, Sparkles, Home, Info, Phone, CalendarDays, Megaphone } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const heroGallery = [
  {
    src: '/gallery/puskesmas-wori-1.jpg',
    alt: 'Puskesmas Wori tampak depan',
  },
  {
    src: '/gallery/puskesmas-wori-2.jpg',
    alt: 'Area depan Puskesmas Wori',
  },
  {
    src: '/gallery/puskesmas-wori-3.png',
    alt: 'Gedung Puskesmas Wori',
  },
];

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
              Puskesmas Wori <span className="text-emerald-500">Online</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Layanan kesehatan digital
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link
                to="/konsultasi"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-7 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Layanan Chatbot
              </Link>
              <Link
                to="/penyakit"
                className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:border-emerald-300 hover:text-emerald-600 transition-colors"
              >
                Pelajari Lebih Lanjut
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="flex justify-center order-1 lg:order-2">
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
              <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent>
                  {heroGallery.map((image) => (
                    <CarouselItem key={image.src}>
                      <div className="overflow-hidden rounded-2xl shadow-lg border border-slate-100 bg-white">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-[240px] sm:h-[300px] lg:h-[360px] object-cover"
                          loading="lazy"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 md:left-3 bg-white/90 border-slate-200 hover:bg-white" />
                <CarouselNext className="right-2 md:right-3 bg-white/90 border-slate-200 hover:bg-white" />
              </Carousel>
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Pasien */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Untuk Pasien</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {[
              { icon: Home, label: 'Akses Beranda' },
              { icon: Info, label: 'Akses Informasi' },
              { icon: Info, label: 'Akses Tentang' },
              { icon: Phone, label: 'Akses Kontak' },
              { icon: MessageCircle, label: 'Mengajukan Pertanyaan (Chatbot)' },
              { icon: CalendarDays, label: 'Menerima Informasi Jadwal Berobat' },
              { icon: Megaphone, label: 'Menerima Broadcast WhatsApp' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            Pasien tidak memiliki akses terhadap pengelolaan data maupun konfigurasi sistem.
          </div>
        </div>
      </section>

      {/* Fitur Utama */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Layanan</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-10">
            {[
              { icon: Pill, title: 'Rekomendasi Obat' },
              { icon: Apple, title: 'Panduan Makanan' },
              { icon: Activity, title: 'Info Penyakit' },
            ].map((item, i) => (
              <div key={i} className="group bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-500 transition-colors">
                  <item.icon className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Menggunakan */}
      <section className="py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center">Langkah Mudah</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mt-10">
            {[
              { step: '1', icon: Users, title: 'Daftar' },
              { step: '2', icon: MessageCircle, title: 'Konsultasi' },
              { step: '3', icon: Stethoscope, title: 'Dapatkan Saran' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-emerald-500 text-emerald-500 rounded-full text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;