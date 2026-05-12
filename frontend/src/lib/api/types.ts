export type UserRole = 'patient' | 'admin' | 'head' | 'nurse';
export type AnnouncementCategory = 'health_info' | 'schedule';

export interface ChatMessagePayload {
    role: string;
    content: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    phone?: string;
    ktp?: string;
    ktpImage?: string;
    ktpWithOwnerImage?: string;
    gender: 'male' | 'female';
    age: number;
    medicalHistory: string;
    password: string;
}

export interface UpdateProfilePayload {
    email: string;
    name?: string;
    phone?: string;
    ktp?: string;
    ktpImage?: string;
    ktpWithOwnerImage?: string;
    profileImage?: string;
    medicalHistory?: string;
}

export interface PatientComplaint {
    id: number;
    complaint: string;
    complaintDate: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PatientComplaintListResponse {
    complaints: PatientComplaint[];
    latest?: PatientComplaint | null;
}

export interface UpdatePatientComplaintPayload {
    email: string;
    complaint: string;
    complaintDate?: string;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface PendingRegistrationUser {
    email: string;
    name: string;
    phone?: string;
    ktp?: string;
    ktpImage?: string;
    ktpWithOwnerImage?: string;
    gender?: string;
    age?: number;
    medicalHistory?: string;
    registrationStatus?: RegistrationStatus;
    registrationNote?: string;
    registrationReviewedBy?: string;
    registrationReviewedAt?: string;
    createdAt?: string;
    whatsappLink?: string;
}

export interface PendingRegistrationListResponse {
    pending: PendingRegistrationUser[];
    count: number;
}

export interface ReviewPendingRegistrationPayload {
    action: 'approve' | 'reject';
    note?: string;
}

export interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
    phone?: string;
    ktp?: string;
    ktpImage?: string;
    ktpWithOwnerImage?: string;
    gender?: 'male' | 'female';
    age?: number;
    medicalHistory?: string;
    role?: UserRole;
}

export interface ConsultationEmailPayload {
    user_name: string;
    user_email: string;
    symptoms: string;
    consultation_summary: string;
}

export interface ContactEmailPayload {
    from_name: string;
    from_email: string;
    subject: string;
    message: string;
    captcha_token?: string;
}

export interface CreateAnnouncementPayload {
    adminEmail?: string;
    category?: AnnouncementCategory;
    title: string;
    content: string;
    type?: string;
    priority?: number;
    expiresAt?: string | null;
    eventDate?: string | null;
    eventTime?: string | null;
    location?: string | null;
}

export interface UpdateAnnouncementPayload {
    adminEmail?: string;
    category?: AnnouncementCategory;
    title?: string;
    content?: string;
    type?: string;
    priority?: number;
    active?: boolean;
    expiresAt?: string | null;
    eventDate?: string | null;
    eventTime?: string | null;
    location?: string | null;
}

export interface PatientNotification {
    id: number;
    announcementId: number;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    readAt?: string | null;
}

export interface PatientNotificationListResponse {
    notifications: PatientNotification[];
    unreadCount: number;
}

export interface FonnteSendPayload {
    adminEmail?: string;
    target: string;
    message: string;
    delay?: string;
    url?: string;
    typing?: boolean;
}

export interface FonnteBroadcastPayload {
    adminEmail?: string;
    message: string;
    delay?: string;
    url?: string;
}

export interface FonnteSendIndividualPayload {
    adminEmail?: string;
    phone: string;
    message: string;
    name?: string;
}
