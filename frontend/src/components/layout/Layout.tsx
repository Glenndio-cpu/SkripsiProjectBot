import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: React.ReactNode;
  hideAIAssistant?: boolean;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isConsultationPage = location.pathname === '/konsultasi';

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Close sidebar on route change (handled by Sidebar onClose)
  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute top-24 -right-32 w-96 h-96 rounded-full bg-teal-300/15 blur-3xl" />
      </div>
      {/* Sidebar — mobile only */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Overlay when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-20 transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        
        <main className="flex-grow">
          <div className={isConsultationPage ? 'px-0 py-2 lg:py-3' : 'px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7'}>
            <div className={isConsultationPage ? 'mx-auto max-w-[1500px]' : 'mx-auto max-w-7xl'}>
              {children || <Outlet />}
            </div>
          </div>
        </main>
        
        <Footer scrollToTop={scrollToTop} />
      </div>
    </div>
  );
};

export default Layout;