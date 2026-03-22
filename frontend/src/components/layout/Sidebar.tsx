
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, Activity, Shield, MessageCircle, Phone, BarChart3, Users, Megaphone, UserPlus, User, LogOut, LogIn, Lock, X, FileEdit, Database, Bell } from 'lucide-react';
import api from '../../lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ name: string; email: string; phone?: string; profileImage?: string; role?: string } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // User state sync
  useEffect(() => {
    const updateUser = () => {
      const userData = localStorage.getItem('user');
      setUser(userData ? JSON.parse(userData) : null);
    };
    updateUser();
    window.addEventListener('userUpdated', updateUser);
    window.addEventListener('storage', updateUser);
    return () => {
      window.removeEventListener('userUpdated', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('userUpdated'));
    onClose();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: '/', icon: Home, label: 'Beranda', requiresAuth: false, showFor: 'all' as const },
    { to: '/tentang', icon: Info, label: 'Tentang', requiresAuth: false, showFor: 'all' as const },
    { to: '/penyakit', icon: Activity, label: 'Info Penyakit', requiresAuth: true, showFor: 'patient' as const },
    { to: '/pencegahan', icon: Shield, label: 'Pencegahan', requiresAuth: true, showFor: 'patient' as const },
    { to: '/konsultasi', icon: MessageCircle, label: 'Konsultasi', requiresAuth: true, showFor: 'patient' as const },
    { to: '/kontak', icon: Phone, label: 'Kontak', requiresAuth: false, showFor: 'all' as const },
  ];

  const adminItems = [
    { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard Admin' },
    { to: '/admin/patients', icon: Users, label: 'Kelola Pasien' },
    { to: '/admin/broadcast', icon: Megaphone, label: 'Broadcast WhatsApp' },
    { to: '/admin/rag', icon: Database, label: 'Kelola RAG & AI' },
    { to: '/admin/announcements', icon: Bell, label: 'Pengumuman' },
    { to: '/admin/register', icon: UserPlus, label: 'Tambah Admin' },
  ];

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-xl z-30 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-slate-700">Menu Navigasi</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Tutup menu"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">

        {/* User Profile */}
        {user && (
          <div className="mx-3 mb-3 p-3 bg-sky-50 rounded-xl">
            <div className="flex items-center gap-3">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-200"
                />
              ) : (
                <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  user.role === 'nurse'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-100 text-sky-700'
                }`}>
                  {user.role === 'nurse' ? 'Admin' : 'Pasien'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <div className="px-3">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
          <nav className="space-y-0.5">
            {navItems
              .filter((item) => {
                if (item.showFor === 'all') return true;
                if (!user) return true; // show for non-logged-in users (will redirect to login)
                if (item.showFor === 'patient' && user.role === 'nurse') return false;
                return true;
              })
              .map((item) => {
              const locked = item.requiresAuth && !user;
              const Icon = locked ? Lock : item.icon;
              const target = locked ? '/login' : item.to;
              const active = isActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={target}
                  onClick={onClose}
                  title={locked ? 'Silakan login untuk mengakses' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-sky-50 text-sky-600'
                      : locked
                        ? 'text-slate-400 hover:bg-slate-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-sky-500' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin Section */}
        {user?.role === 'nurse' && (
          <div className="px-3 mt-4">
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
            <nav className="space-y-0.5">
              {adminItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      active
                        ? 'bg-sky-50 text-sky-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-sky-500' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom: Account Actions */}
      <div className="border-t border-gray-100 px-3 py-3">
        {user ? (
          <div className="space-y-0.5">
            <Link
              to="/profile"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive('/profile')
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <User className="w-[18px] h-[18px] flex-shrink-0" />
              Akun Saya
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
            >
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              Keluar
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors duration-150"
            >
              <LogIn className="w-[18px] h-[18px] flex-shrink-0" />
              Login
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors duration-150"
            >
              <FileEdit className="w-[18px] h-[18px] flex-shrink-0" />
              Mendaftar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
