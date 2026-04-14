const clean = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const digitsOnly = (value: string): string => value.replace(/\D+/g, '');

const normalizePhoneHref = (value: string): string => value.replace(/[^+\d]/g, '');

const normalizeWhatsappNumber = (value: string): string => {
  const normalized = digitsOnly(value);
  if (!normalized) return '';
  if (normalized.startsWith('62')) return normalized;
  if (normalized.startsWith('0')) return `62${normalized.slice(1)}`;
  return normalized;
};

const normalizeWebsiteUrl = (value: string): string => {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export const publicInfo = {
  name: clean(import.meta.env.VITE_PUSKESMAS_NAME),
  email: clean(import.meta.env.VITE_PUSKESMAS_EMAIL),
  phone: clean(import.meta.env.VITE_PUSKESMAS_PHONE),
  whatsapp: clean(import.meta.env.VITE_PUSKESMAS_WHATSAPP),
  address: clean(import.meta.env.VITE_PUSKESMAS_ADDRESS),
  openHours: clean(import.meta.env.VITE_PUSKESMAS_OPEN_HOURS),
  website: clean(import.meta.env.VITE_PUSKESMAS_WEBSITE),
};

const whatsappNumber = normalizeWhatsappNumber(publicInfo.whatsapp || publicInfo.phone);
const websiteUrl = normalizeWebsiteUrl(publicInfo.website);

export const publicLinks = {
  email: publicInfo.email ? `mailto:${publicInfo.email}` : '',
  phone: publicInfo.phone ? `tel:${normalizePhoneHref(publicInfo.phone)}` : '',
  whatsapp: whatsappNumber ? `https://wa.me/${whatsappNumber}` : '',
  website: websiteUrl,
};

export function buildSupportContactText(): string {
  const lines: string[] = [];
  if (publicInfo.phone) lines.push(`Telepon/WhatsApp: ${publicInfo.phone}`);
  if (publicInfo.email) lines.push(`Email: ${publicInfo.email}`);
  if (publicInfo.address) lines.push(`Alamat: ${publicInfo.address}`);

  if (!lines.length) {
    return 'Kontak dukungan belum dikonfigurasi. Silakan hubungi administrator sistem.';
  }

  return lines.join('\n');
}