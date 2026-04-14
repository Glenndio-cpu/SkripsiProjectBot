import React from 'react';
import Layout from '../components/layout/Layout';
import { Target, Eye, MessageCircle, Pill, Apple, ShieldAlert, HeartPulse, Info, Stethoscope } from 'lucide-react';

const Tentang = () => {
  return (
    <Layout>
      {/* Header */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-700 mb-4">
            Tentang Kami
          </h1>
        </div>
      </section>


    </Layout>
  );
};

export default Tentang;