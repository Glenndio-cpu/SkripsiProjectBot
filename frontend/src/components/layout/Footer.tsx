import React from 'react';
import { Link } from 'react-router-dom';
import { FaClinicMedical } from 'react-icons/fa';
import { Mail, Phone, MapPin, ArrowUp, Heart } from 'lucide-react';

interface FooterProps {
  scrollToTop: () => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToTop }) => {
  const navLinks = [
    { to: '/', label: 'Beranda' },
    { to: '/tentang', label: 'Tentang' },
    { to: '/penyakit', label: 'Info Penyakit' },
    { to: '/pencegahan', label: 'Pencegahan' },
    { to: '/konsultasi', label: 'Konsultasi' },
    { to: '/kontak', label: 'Kontak' },
  ];

  const contactInfo = [
    { icon: Mail, text: import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com' },
    { icon: Phone, text: import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733' },
    { icon: MapPin, text: import.meta.env.VITE_PUSKESMAS_ADDRESS || 'Universitas Klabat, Manado' },
  ];

  return (
    <footer className="relative bg-slate-700 text-white overflow-hidden">
      {/* Decorative Top Line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-sky-500" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" onClick={scrollToTop} className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <FaClinicMedical className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold tracking-tight">Puskesmas Wori</span>
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
              Menyediakan layanan informasi kesehatan digital untuk masyarakat Desa Wori dan sekitarnya.
            </p>
            {/* SDGs badges */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://sdgs.un.org/goals/goal3"
                target="_blank"
                rel="noopener noreferrer"
                className="group/sdg flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg transition-colors duration-200"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
                <span className="text-xs text-slate-300 group-hover/sdg:text-white transition-colors">SDG 3</span>
              </a>
              <a
                href="https://sdgs.un.org/goals/goal12"
                target="_blank"
                rel="noopener noreferrer"
                className="group/sdg flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg transition-colors duration-200"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold">
                  12
                </div>
                <span className="text-xs text-slate-300 group-hover/sdg:text-white transition-colors">SDG 12</span>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Navigasi</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-300 hover:text-white hover:translate-x-1 inline-flex transition-all duration-200"
                    onClick={scrollToTop}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Kontak Kami</h4>
            <ul className="space-y-3.5">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500 transition-colors duration-200">
                    <item.icon className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors duration-200 pt-1">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Layanan</h4>
            <div className="space-y-3">
              <Link
                to="/konsultasi"
                onClick={scrollToTop}
                className="flex items-center gap-3 bg-slate-600 hover:bg-sky-500 px-4 py-3 rounded-xl transition-colors duration-200 group"
              >
                <Heart className="w-5 h-5 text-sky-400 group-hover:text-white transition-colors" />
                <div>
                  <p className="text-sm font-medium text-white">Chatbot AI</p>
                  <p className="text-xs text-slate-400 group-hover:text-sky-100">Konsultasi kesehatan</p>
                </div>
              </Link>
              <Link
                to="/penyakit"
                onClick={scrollToTop}
                className="flex items-center gap-3 bg-slate-600 hover:bg-sky-500 px-4 py-3 rounded-xl transition-colors duration-200 group"
              >
                <FaClinicMedical className="text-lg text-sky-400 group-hover:text-white transition-colors" />
                <div>
                  <p className="text-sm font-medium text-white">Info Penyakit</p>
                  <p className="text-xs text-slate-400 group-hover:text-sky-100">Database penyakit</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Chatbot Pendamping Puskesmas &mdash; Inovasi Layanan Kesehatan Desa Wori
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Menggunakan Whatsapp Gateway Terintegrasi RAG dan LLM &middot; Project Skripsi
              </p>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-xs text-slate-500">
                Made by Glenn, Dody, Ricko
              </p>
              {/* Scroll-to-top button */}
              <button
                onClick={scrollToTop}
                className="w-9 h-9 bg-slate-600 hover:bg-sky-500 rounded-lg flex items-center justify-center transition-colors duration-200 group"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;