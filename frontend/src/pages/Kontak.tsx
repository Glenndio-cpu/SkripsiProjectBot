import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { sendContactEmail, isEmailServiceAvailable } from '../lib/emailService';
import { Mail, Phone, MapPin, Send, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const Kontak = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setSubmitStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Semua field harus diisi!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Format email tidak valid!');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const emailSent = await sendContactEmail({
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message
      });

      if (emailSent) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com',
      href: `mailto:${import.meta.env.VITE_PUSKESMAS_EMAIL || 'puskesmas.desawori@gmail.com'}`
    },
    {
      icon: Phone,
      label: 'Telepon',
      value: import.meta.env.VITE_PUSKESMAS_PHONE || '+62 896-5739-8733',
      href: `tel:${import.meta.env.VITE_PUSKESMAS_PHONE || '+628965739873'}`
    },
    {
      icon: MapPin,
      label: 'Alamat',
      value: 'Puskesmas Desa Wori, Manado, Indonesia',
      href: null
    }
  ];

  const socialLinks = [
    { icon: FaFacebook, label: 'Facebook', href: '#' },
    { icon: FaInstagram, label: 'Instagram', href: '#' },
    { icon: FaXTwitter, label: 'X', href: '#' },
    { icon: FaYoutube, label: 'YouTube', href: '#' }
  ];

  return (
    <Layout>
      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-2">Kontak Kami</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">Punya pertanyaan atau masukan? Jangan ragu untuk menghubungi tim kami</p>
          </div>

          {/* Email Service Warning */}
          {!isEmailServiceAvailable() && (
            <div className="mb-6 flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl max-w-2xl mx-auto">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Email notification belum dikonfigurasi. Pesan akan tetap terkirim di form, tapi tidak akan dikirim ke email admin.
                Baca file <code className="bg-slate-100 px-1 rounded text-slate-600">SETUP_EMAIL.md</code> untuk setup.
              </p>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

            {/* Contact Form — Takes 3 columns */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-slate-100 rounded-xl p-5 sm:p-7">
                <h2 className="text-lg font-semibold text-slate-700 mb-1">Kirim Pesan</h2>
                <p className="text-xs text-slate-400 mb-6">Isi formulir di bawah dan kami akan segera merespons</p>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700">Pesan berhasil dikirim! Admin akan segera menghubungi Anda via email.</p>
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">Gagal mengirim pesan. Silakan coba lagi atau hubungi kami via WhatsApp.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-slate-600 mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                        placeholder="Nama Anda"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                        placeholder="nama@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-xs font-medium text-slate-600 mb-1.5">Subjek</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                      placeholder="Topik pesan Anda"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-medium text-slate-600 mb-1.5">Pesan</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none"
                      placeholder="Tulis pesan Anda di sini..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin w-4 h-4" /> Mengirim...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Kirim Pesan</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar — Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">

              {/* Contact Info */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-5">Informasi Kontak</h2>
                <div className="space-y-5">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-sky-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-0.5">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-slate-700 hover:text-sky-500 transition-colors">{item.value}</a>
                        ) : (
                          <p className="text-sm text-slate-700">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Ikuti Kami</h2>
                <div className="flex gap-3">
                  {socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-label={item.label}
                      className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                    >
                      <item.icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Kontak;
