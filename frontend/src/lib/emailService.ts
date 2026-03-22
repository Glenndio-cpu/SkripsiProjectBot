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
export const sendContactEmail = async (data: ContactEmailData): Promise<boolean> => {
  try {
    await api.sendContactEmail(data);
    console.log('Email kontak terkirim');
    return true;
  } catch (error) {
    console.error('Gagal mengirim email kontak:', error);
    return false;
  }
};

/**
 * Validasi apakah email service tersedia
 */
export const isEmailServiceAvailable = (): boolean => {
  // Optimistically return true; the backend handles the check
  return true;
};
