export const ROLE_PATIENT = 'patient';
export const ROLE_PUBLIC = 'public';
export const ROLE_ADMIN = 'admin';
export const ROLE_HEAD = 'head';
export const ROLE_NURSE = 'nurse';

export const STAFF_ROLES = [ROLE_ADMIN, ROLE_HEAD, ROLE_NURSE] as const;
export const EDITOR_ROLES = [ROLE_ADMIN, ROLE_NURSE] as const;

export function isStaffRole(role?: string): boolean {
  return !!role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export function isEditorRole(role?: string): boolean {
  return !!role && EDITOR_ROLES.includes(role as (typeof EDITOR_ROLES)[number]);
}

export function isAdminRole(role?: string): boolean {
  return role === ROLE_ADMIN;
}

export function isHeadRole(role?: string): boolean {
  return role === ROLE_HEAD;
}

export function isMonitorRole(role?: string): boolean {
  return !!role && [ROLE_ADMIN, ROLE_HEAD, ROLE_NURSE].includes(role as typeof ROLE_ADMIN | typeof ROLE_HEAD | typeof ROLE_NURSE);
}

export function roleLabel(role?: string): string {
  if (role === ROLE_PUBLIC) return 'Masyarakat';
  if (role === ROLE_ADMIN) return 'Admin IT Manager';
  if (role === ROLE_HEAD) return 'Kepala Puskesmas';
  if (role === ROLE_NURSE) return 'Tenaga Medis';
  return 'Pasien';
}

export function roleColor(role?: string): { bg: string; text: string } {
  if (role === ROLE_PUBLIC) return { bg: 'bg-teal-100', text: 'text-teal-700' };
  if (role === ROLE_ADMIN) return { bg: 'bg-red-100', text: 'text-red-700' };
  if (role === ROLE_HEAD) return { bg: 'bg-purple-100', text: 'text-purple-700' };
  if (role === ROLE_NURSE) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
}
