import api from './api';
import type { UserSession, LoginResult } from '../types/auth';
import { STORAGE_KEYS } from '../utils/constants';
import { normalizeSession } from '../utils/session';

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export async function login(correo: string, password: string): Promise<LoginResult> {
  try {
    const { data } = await api.post('/auth/login', {
      correo: correo.trim(),
      password,
    });

    if (!data?.token) {
      return { success: false, error: 'Respuesta inválida del servidor de autenticación.' };
    }

    const session = normalizeSession({ ...data, correo: data.correo || data.user?.correo || data.user?.email || correo });
    if (!session) return { success: false, error: 'El servidor no devolvió un identificador válido de la cuenta.' };

    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    return { success: true, session };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Credenciales incorrectas o el servicio no se encuentra disponible.';
    return { success: false, error: message };
  }
}

export async function logout(): Promise<void> {
  clearSession();
}

export async function updateDisplayName(userId: number | string, nombreCompleto: string): Promise<void> {
  const { data } = await api.put(`/usuarios/${userId}`, { nombreCompleto });
  const session = getSession();
  if (session) {
    localStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({ ...session, displayName: data.nombreCompleto || nombreCompleto })
    );
  }
}

export async function changePassword(userId: number | string, newPassword: string): Promise<void> {
  await api.put(`/usuarios/${userId}`, { password: newPassword });
}
