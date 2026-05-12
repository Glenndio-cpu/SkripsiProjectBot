import api from './api';

export interface ConsultationEmailData {
  user_name: string;
  user_email: string;
  symptoms: string;
  consultation_summary: string;
}

export interface ContactEmailData {
  from_name: string;
  from_email: string;
  subject: string;
  message: string;
  captcha_token?: string;
}

export interface ContactEmailResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Kirim notifikasi email untuk konsultasi baru
 */
export const sendConsultationEmail = async (data: ConsultationEmailData): Promise<boolean> => {
  try {
    await api.sendConsultationEmail(data);
    console.log('Email konsultasi terkirim');
    return true;
  } catch (error) {
    console.error('Gagal mengirim email konsultasi:', error);
    return false;
  }
};

/**
 * Kirim email dari form kontak
 */
export const sendContactEmail = async (data: ContactEmailData): Promise<ContactEmailResult> => {
  try {
    await api.sendContactEmail(data);
    console.log('Email kontak terkirim');
    return { success: true };
  } catch (error) {
    console.error('Gagal mengirim email kontak:', error);

    const message = error instanceof Error ? error.message : 'Gagal mengirim email kontak';
    if (message.includes('HTTP 429') || message.toLowerCase().includes('terlalu banyak percobaan')) {
      return {
        success: false,
        error: 'Terlalu banyak percobaan pengiriman. Silakan tunggu beberapa menit lalu coba lagi.',
        statusCode: 429,
      };
    }

    if (message.toLowerCase().includes('belum dikonfigurasi')) {
      return {
        success: false,
        error: 'Layanan email sedang belum tersedia. Silakan hubungi kontak alternatif di samping.',
        statusCode: 503,
      };
    }

    if (message.toLowerCase().includes('captcha')) {
      return {
        success: false,
        error: 'Verifikasi CAPTCHA gagal atau sudah kedaluwarsa. Silakan verifikasi ulang lalu kirim kembali.',
        statusCode: 400,
      };
    }

    return { success: false, error: message };
  }
};

/**
 * Validasi apakah email service tersedia
 */
export const isEmailServiceAvailable = async (): Promise<boolean> => {
  try {
    const response = await api.emailStatus();
    return Boolean(response?.configured);
  } catch {
    return false;
  }
};
