import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaClinicMedical, FaUser, FaSignOutAlt } from "react-icons/fa";
import { Megaphone, ChevronDown, LogIn, UserPlus, Menu, X } from 'lucide-react';
import api from '../../lib/api';
import { isHeadRole, isStaffRole, roleLabel } from '../../lib/roles';
import { getMainNavLinks } from '../../lib/navigation';
import { getUserInitial, useRealtimeUser } from '../../hooks/use-realtime-user';

interface HeaderProps {
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

const Header = ({ onMenuToggle, sidebarOpen = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useRealtimeUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Detect scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('user');
    setIsDropdownOpen(false);
    window.dispatchEvent(new Event('userUpdated'));
    navigate('/login', { replace: true });
    void api.logout().catch(() => undefined);
  };

  // Nav links for desktop – adjust based on role
  const navLinks = getMainNavLinks(user?.role);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b transition-shadow duration-300 ${scrolled ? 'shadow-md shadow-emerald-100/50 border-emerald-100/80' : 'shadow-none border-emerald-50'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-[4.25rem]">

          {/* Left: Hamburger (mobile only) + Logo */}
          <div className="flex items-center gap-2">
            {/* Hamburger Menu Button — mobile only */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-200/70">
                <FaClinicMedical className="text-white text-base" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-700 tracking-tight">
                Puskesmas Wori <span className="hidden sm:inline text-emerald-600">Online</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive(link.to)
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                  }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right: Auth (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-100"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {getUserInitial(user.name, 'U')}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black/5 py-1.5 z-50 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${isStaffRole(user.role)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-teal-100 text-teal-700'
                        }`}>
                        {roleLabel(user.role)}
                      </span>
                    </div>

                    {isHeadRole(user?.role) && (
                      <>
                        <Link
                          to="/admin/broadcast"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <Megaphone className="w-4 h-4" />
                          WA Gateway
                        </Link>
                        <div className="h-px bg-gray-100 mx-3" />
                      </>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <FaUser className="text-emerald-600" />
                      Akun Saya
                    </Link>
                    <div className="h-px bg-gray-100 mx-3" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <FaSignOutAlt />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg transition-colors duration-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Mendaftar
                </Link>
              </div>
            )}
          </div>



        </div>
      </div>
    </header>
  );
};

export default Header;