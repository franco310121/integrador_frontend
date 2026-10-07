import type { UserSession } from '../types/auth.ts';

// Accept the original nested design session and the flat REST login response.
export function normalizeSession(value: unknown): UserSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const user = data.user && typeof data.user === 'object' && !Array.isArray(data.user) ? data.user as Record<string, unknown> : {};
  const id = data.userId ?? data.id ?? user.id;
  if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '' || (typeof id === 'number' && !Number.isFinite(id))) return null;
  const text = (...values: unknown[]) => values.find(value => typeof value === 'string' && value.trim() !== '') as string | undefined;
  const correo = text(data.correo, data.email, user.correo, user.email) ?? '';
  const username = text(data.username, user.username) ?? (correo.split('@')[0] || String(id));
  const role = (text(data.rol, data.role, user.rol, user.role) ?? 'vendedor').trim().toLowerCase();
  return {
    userId: typeof id === 'string' ? id.trim() : id,
    correo, username,
    displayName: text(data.displayName, data.nombreCompleto, user.displayName, user.nombreCompleto, user.nombre) ?? username,
    rol: role, role,
    token: text(data.token, data.accessToken),
    accessToken: text(data.accessToken, data.token),
    avatarUrl: text(data.avatarUrl, data.avatar_url, user.avatarUrl) ?? null,
  };
}
