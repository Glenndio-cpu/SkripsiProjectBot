import { isAdminRole, isHeadRole, isStaffRole } from './roles';

export interface NavLinkItem {
  to: string;
  label: string;
}

const patientNav: NavLinkItem[] = [
  { to: '/', label: 'Beranda' },
  { to: '/tentang', label: 'Tentang' },
  { to: '/informasi', label: 'Informasi' },
  { to: '/konsultasi', label: 'Konsultasi' },
  { to: '/jadwal-berobat', label: 'Jadwal Berobat' },
  { to: '/kontak', label: 'Kontak' },
];

const nurseNav: NavLinkItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/pending-approvals', label: 'Approval Pendaftaran' },
  { to: '/admin/announcements', label: 'Informasi Kesehatan' },
  { to: '/admin/schedules', label: 'Jadwal Berobat/Posyandu' },
];

const headNav: NavLinkItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/patients', label: 'Data Pasien' },
  { to: '/admin/approval-informasi', label: 'Approval Info & Jadwal' },
  { to: '/admin/broadcast', label: 'Broadcast WA Resmi' },
];

const adminNav: NavLinkItem[] = [
  { to: '/admin/users', label: 'Manajemen User' },
  { to: '/admin/ai', label: 'Konfigurasi RAG & LLM' },
  { to: '/admin/database', label: 'Kelola Database & Qdrant' },
];

export function getMainNavLinks(role?: string): NavLinkItem[] {
  if (!isStaffRole(role)) {
    return patientNav;
  }

  if (isHeadRole(role)) {
    return headNav;
  }

  if (isAdminRole(role)) {
    return adminNav;
  }

  return nurseNav;
}