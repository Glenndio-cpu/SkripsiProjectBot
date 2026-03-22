import api from './api';

export interface UserData {
  email: string;
  name: string;
  phone: string;
  ktp?: string;
  profileImage?: string;
  createdAt: string;
  role?: string;
}

export interface BroadcastContact {
  name: string;
  phone: string;
  email: string;
}

/**
 * Get admin email from localStorage session
 */
function getAdminEmail(): string | undefined {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user.role === 'nurse') return user.email;
    }
  } catch { /* ignore */ }
  return undefined;
}

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const adminEmail = getAdminEmail();
    const data = await api.getUsers(adminEmail);
    return data.users || [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

export async function getAllPhoneNumbers(): Promise<string[]> {
  const users = await getAllUsers();
  return users.map(user => user.phone).filter(phone => phone && phone.length > 0);
}

export async function getBroadcastContacts(): Promise<BroadcastContact[]> {
  try {
    const adminEmail = getAdminEmail();
    const data = await api.getContacts(adminEmail);
    return data.contacts || [];
  } catch (error) {
    console.error('Error loading contacts:', error);
    return [];
  }
}

export async function exportPhonesToCSV(): Promise<string> {
  const contacts = await getBroadcastContacts();
  let csv = 'Nama,Nomor WhatsApp,Email\n';
  contacts.forEach(contact => {
    csv += '"' + contact.name + '","' + contact.phone + '","' + contact.email + '"\n';
  });
  return csv;
}

export async function downloadContactsCSV(): Promise<void> {
  const csv = await exportPhonesToCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', 'puskesmas-wori-contacts-' + timestamp + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportPhonesForWhatsApp(): Promise<string> {
  const phones = await getAllPhoneNumbers();
  return phones
    .map(phone => {
      if (!phone.startsWith('+')) {
        if (phone.startsWith('08')) return '+62' + phone.substring(1);
        if (phone.startsWith('62')) return '+' + phone;
        return '+62' + phone;
      }
      return phone;
    })
    .join(',');
}

export async function copyPhonestoClipboard(): Promise<boolean> {
  try {
    const phones = await exportPhonesForWhatsApp();
    await navigator.clipboard.writeText(phones);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

export async function getUserStats() {
  const users = await getAllUsers();
  const usersWithPhone = users.filter(u => u.phone && u.phone.length > 0);
  return {
    totalUsers: users.length,
    usersWithPhone: usersWithPhone.length,
    usersWithoutPhone: users.length - usersWithPhone.length,
    registrationRate: users.length > 0
      ? ((usersWithPhone.length / users.length) * 100).toFixed(1)
      : '0'
  };
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  let formatted = phone;
  if (!formatted.startsWith('+')) {
    if (formatted.startsWith('0')) {
      formatted = '+62' + formatted.substring(1);
    } else if (formatted.startsWith('62')) {
      formatted = '+' + formatted;
    } else {
      formatted = '+62' + formatted;
    }
  }
  if (formatted.startsWith('+62')) {
    const number = formatted.substring(3);
    if (number.length >= 9) {
      return '+62 ' + number.substring(0, 3) + '-' + number.substring(3, 7) + '-' + number.substring(7);
    }
  }
  return formatted;
}

export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) return false;
  if (!/^[0-9]+$/.test(cleaned)) return false;
  if (!cleaned.startsWith('08') && !cleaned.startsWith('62') && !cleaned.startsWith('8')) return false;
  return true;
}
