import type { RolUsuario, EstadoUsuario } from './auth';

export interface UsuarioItem {
  id: string;
  nombreCompleto: string;
  rol: RolUsuario;
  correo: string;
  avatarUrl: string | null;
  estado: EstadoUsuario;
  fechaCreacion: Date | null;
}

export interface CreateUserData {
  correo: string;
  password: string;
  nombreCompleto: string;
  rol: RolUsuario;
}

export interface UpdateUserData {
  nombreCompleto?: string;
  rol?: string;
  estado?: string;
  password?: string;
  avatarUrl?: string | null;
}
