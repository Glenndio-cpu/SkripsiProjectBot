import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

interface LayoutProps {
  children?: React.ReactNode;
  hideAIAssistant?: boolean;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="p-4">
            <div className="max-w-7xl mx-auto">
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