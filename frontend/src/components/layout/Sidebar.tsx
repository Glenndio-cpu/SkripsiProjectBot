
import React, { useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, Activity, Shield, MessageCircle, Phone, BarChart3, Users, Megaphone, UserPlus, User, LogOut, LogIn, Lock, X, FileEdit, Database, Bell, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { isAdminRole, isHeadRole, isStaffRole, roleLabel } from '../../lib/roles';
import { getUserInitial, useRealtimeUser } from '../../hooks/use-realtime-user';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useRealtimeUser();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userUpdated'));
    onClose();
    navigate('/login', { replace: true });
    void api.logout().catch(() => undefined);
  };

  const isActive = (path: string) => location.pathname === path;

  // Define exact navigation sets per role to keep mobile menu aligned with desktop
  const patientNav = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/tentang', icon: Info, label: 'Tentang' },
    { to: '/informasi', icon: Activity, label: 'Informasi' },
    { to: '/konsultasi', icon: MessageCircle, label: 'Konsultasi' },
    { to: '/jadwal-berobat', icon: Calendar, label: 'Jadwal Berobat' },
    { to: '/kontak', icon: Phone, label: 'Kontak' },
  ];

  const nurseNav = [
    { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { to: '/admin/pending-approvals', icon: FileEdit, label: 'Approval Pendaftaran' },
    { to: '/admin/announcements', icon: Bell, label: 'Informasi Kesehatan' },
    { to: '/admin/schedules', icon: Calendar, label: 'Jadwal Berobat/Posyandu' },
  ];

  const headNav = [
    { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { to: '/admin/patients', icon: Users, label: 'Data Pasien' },
    { to: '/admin/approval-informasi', icon: Bell, label: 'Approval Info & Jadwal' },
    { to: '/admin/broadcast', icon: Megaphone, label: 'Broadcast WA Resmi' },
  ];

  const adminNav = [
    { to: '/admin/users', icon: Users, label: 'Manajemen User' },
    { to: '/admin/ai', icon: Database, label: 'Konfigurasi RAG & LLM' },
    { to: '/admin/database', icon: Database, label: 'Kelola Database & Qdrant' },
  ];

  const adminItems = [
    { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard Staf' },
    { to: '/admin/pending-approvals', icon: FileEdit, label: 'Approval Pendaftaran' },
    { to: '/admin/patients', icon: Users, label: 'Monitoring Data Pasien' },
    { to: '/admin/approval-informasi', icon: Bell, label: 'Approval Info & Jadwal' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/schedules', icon: Calendar, label: 'Kelola Jadwal Posyandu' },
    { to: '/admin/broadcast', icon: Megaphone, label: 'Manajemen WA Gateway' },
    { to: '/admin/ai', icon: Database, label: 'Konfigurasi RAG & LLM' },
    { to: '/admin/database', icon: Database, label: 'Kelola Database & Qdrant' },
    { to: '/admin/announcements', icon: Bell, label: 'Informasi Kesehatan' },
  ];

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-100 shadow-xl shadow-emerald-100/35 z-30 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4">
        <h2 className="text-base font-bold text-white">Menu Navigasi</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          aria-label="Tutup menu"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">

        {/* User Profile */}
        {user && (
          <div className="mx-3 mb-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {getUserInitial(user.name, 'U')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${isStaffRole(user.role)
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-teal-100 text-teal-700'
                  }`}>
                  {roleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        {!isStaffRole(user?.role) && (
          <div className="px-3">
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu Utama</p>
            <nav className="space-y-0.5">
              {patientNav.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-emerald-600' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Admin Section */}
        {isStaffRole(user?.role) && (
          <div className="px-3 mt-4">
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu Utama</p>
            <nav className="space-y-0.5">
              {(isAdminRole(user?.role) ? adminNav : isHeadRole(user?.role) ? headNav : nurseNav).map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-emerald-600' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom: Account Actions */}
      <div className="border-t border-emerald-100 px-3 py-3">
        {user ? (
          <div className="space-y-0.5">
            <Link
              to="/profile"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${isActive('/profile')
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-150"
            >
              <LogIn className="w-[18px] h-[18px] flex-shrink-0" />
              Login
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-150"
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
