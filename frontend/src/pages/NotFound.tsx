import React from 'react';
import Layout from '../components/layout/Layout';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFound = () => {
  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <SearchX className="w-24 h-24 mb-4 text-sky-400" />
        <h1 className="text-4xl font-bold mb-4 text-slate-600">404</h1>
        <p className="text-xl text-gray-600 mb-2">Halaman yang anda cari tidak ditemukan atau belum dibuat,</p>
		<p className="text-xl text-gray-600 mb-8">kami minta maaf atas ketidaknyamanan ini.</p>
        <Link 
          to="/" 
          className="bg-sky-500 text-white px-6 py-3 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </Layout>
  );
};

export default NotFound;