import api from './api';
import type { PerfilDB } from '../types/auth';
import type { CreateUserData, RolInfoResponse, UpdateUserData } from '../types/usuario';

function normalizeUser(u: any): PerfilDB {
  if (!u) return u;
  const nombre = u.nombreCompleto ?? u.nombre_completo ?? u.correo ?? '';
  const rol = (u.rol ?? u.role ?? 'vendedor').toLowerCase();
  const fecha = u.fechaCreacion ?? u.fecha_creacion ?? null;
  return {
    ...u,
    id: u.id,
    nombreCompleto: nombre,
    nombre_completo: nombre,
    correo: u.correo,
    rol,
    estado: u.estado || 'activo',
    avatarUrl: u.avatarUrl ?? u.avatar_url ?? null,
    avatar_url: u.avatarUrl ?? u.avatar_url ?? null,
    fechaCreacion: fecha,
    fecha_creacion: fecha,
  };
}

export async function getUsers(): Promise<PerfilDB[]> {
  const { data } = await api.get('/usuarios');
  return (data || []).map(normalizeUser);
}

export async function getRolesDisponibles(): Promise<RolInfoResponse[]> {
  const { data } = await api.get('/usuarios/roles');
  return data || [];
}

export async function getUserById(id: number | string): Promise<PerfilDB> {
  const { data } = await api.get(`/usuarios/${id}`);
  return normalizeUser(data);
}

export async function createUser(data: CreateUserData): Promise<PerfilDB> {
  const payload = {
    correo: data.correo.trim(),
    password: data.password,
    nombreCompleto: data.nombreCompleto.trim(),
    rol: data.rol.toUpperCase(),
  };
  const { data: res } = await api.post('/usuarios', payload);
  return normalizeUser(res);
}

export async function updateUser(id: number | string, data: UpdateUserData): Promise<PerfilDB> {
  const payload = {
    nombreCompleto: data.nombreCompleto?.trim(),
    rol: data.rol ? data.rol.toUpperCase() : undefined,
    estado: data.estado,
    password: data.password || undefined,
    avatarUrl: data.avatarUrl || undefined,
  };
  const { data: res } = await api.put(`/usuarios/${id}`, payload);
  return normalizeUser(res);
}

export async function changeUserRole(id: number | string, rol: string): Promise<PerfilDB> {
  const { data: res } = await api.patch(`/usuarios/${id}/rol`, {
    rol: rol.toUpperCase(),
  });
  return normalizeUser(res);
}

export async function activateUser(id: number | string): Promise<void> {
  await api.patch(`/usuarios/${id}/activar`);
}

export async function deactivateUser(id: number | string): Promise<void> {
  await api.patch(`/usuarios/${id}/desactivar`);
}
