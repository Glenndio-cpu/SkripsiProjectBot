const clean = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const digitsOnly = (value: string): string => value.replace(/\D+/g, '');

const normalizePhoneHref = (value: string): string => value.replace(/[^+\d]/g, '');

export const formatPhoneDisplay = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;

  const digits = trimmed.replace(/\D+/g, '');
  if (!digits) return trimmed;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `+62${digits}`;

  return `+${digits}`;
};

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
  contactResponseTime: clean(import.meta.env.VITE_CONTACT_RESPONSE_TIME) || '1x24 jam kerja',
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
  const displayPhone = formatPhoneDisplay(publicInfo.phone || publicInfo.whatsapp || '');
  if (displayPhone) lines.push(`Telepon/WhatsApp: ${displayPhone}`);
  if (publicInfo.email) lines.push(`Email: ${publicInfo.email}`);
  if (publicInfo.address) lines.push(`Alamat: ${publicInfo.address}`);

  if (!lines.length) {
    return 'Kontak dukungan belum dikonfigurasi. Silakan hubungi administrator sistem.';
  }

  return lines.join('\n');
}