import React from 'react';
import { Link } from 'react-router-dom';
import { FaClinicMedical } from 'react-icons/fa';
import { Mail, Phone, MapPin, ArrowUp, Heart } from 'lucide-react';
import { formatPhoneDisplay, publicInfo, publicLinks } from '../../lib/publicInfo';
import { getMainNavLinks } from '../../lib/navigation';
import { useRealtimeUser } from '../../hooks/use-realtime-user';

interface FooterProps {
  scrollToTop: () => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToTop }) => {
  const user = useRealtimeUser();
  const navLinks = getMainNavLinks(user?.role);

  const contactInfo = [
    {
      icon: Mail,
      text: publicInfo.email || 'Email belum dikonfigurasi',
      href: publicLinks.email || undefined,
    },
    {
      icon: Phone,
      text: formatPhoneDisplay(publicInfo.phone || publicInfo.whatsapp || '') || 'Telepon belum dikonfigurasi',
      href: publicLinks.phone || publicLinks.whatsapp || undefined,
    },
    {
      icon: MapPin,
      text: publicInfo.address || 'Alamat belum dikonfigurasi',
      href: undefined,
    },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-950 text-white overflow-hidden">
      {/* Decorative Top Line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" onClick={scrollToTop} className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
                <FaClinicMedical className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold tracking-tight">Puskesmas Wori</span>
            </Link>
            <p className="text-emerald-100/80 text-sm leading-relaxed max-w-xs">Layanan online.</p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70 mb-4">Menu</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-emerald-100/85 hover:text-white hover:translate-x-1 inline-flex transition-all duration-200"
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70 mb-4">Kontak</h4>
            <ul className="space-y-3.5">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 bg-emerald-900/45 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors duration-200">
                    <item.icon className="w-4 h-4 text-emerald-100/85 group-hover:text-white transition-colors duration-200" />
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="pt-1 text-sm text-emerald-100/85 transition-colors duration-200 group-hover:text-white"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="pt-1 text-sm text-emerald-100/85 transition-colors duration-200 group-hover:text-white">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70 mb-4">Layanan</h4>
            <div className="space-y-3">
              <Link
                to="/konsultasi"
                onClick={scrollToTop}
                className="flex items-center gap-3 bg-emerald-900/45 hover:bg-emerald-500 px-4 py-3 rounded-xl transition-colors duration-200 group"
              >
                <Heart className="w-5 h-5 text-emerald-200 group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Chat</p>
              </Link>
              <Link
                to="/penyakit"
                onClick={scrollToTop}
                className="flex items-center gap-3 bg-emerald-900/45 hover:bg-emerald-500 px-4 py-3 rounded-xl transition-colors duration-200 group"
              >
                <FaClinicMedical className="text-lg text-emerald-200 group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Penyakit</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-emerald-700/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Puskesmas Wori
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Scroll-to-top button */}
              <button
                onClick={scrollToTop}
                className="w-9 h-9 bg-emerald-900/45 hover:bg-emerald-500 rounded-lg flex items-center justify-center transition-colors duration-200 group"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-4 h-4 text-emerald-200 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;