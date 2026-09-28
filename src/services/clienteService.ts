import api from './api';
import type { ClienteDB } from '../types/cliente';

const LOCAL_CLIENTS_KEY = 'sm_clientes_cache';

const INITIAL_CLIENTS: ClienteDB[] = [];

function getLocalClients(): ClienteDB[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLIENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalClients(list: ClienteDB[]) {
  try {
    localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(list));
  } catch {}
}

function normalize(c: any): ClienteDB {
  if (!c) return c;
  const num = c.numeroDocumento ?? c.numero_documento ?? '';
  const tipo = c.tipoDocumento ?? c.tipo_documento ?? (num.length === 11 ? 'RUC' : 'DNI');
  const fecha = c.fechaCreacion ?? c.fecha_creacion ?? new Date().toISOString();
  return {
    ...c,
    id: c.id,
    nombre: c.nombre,
    tipoDocumento: tipo,
    tipo_documento: tipo,
    numeroDocumento: num,
    numero_documento: num,
    telefono: c.telefono || '',
    correo: c.correo || '',
    direccion: c.direccion || '',
    estado: c.estado || 'activo',
    fechaCreacion: fecha,
    fecha_creacion: fecha,
  };
}

export async function getClients(): Promise<ClienteDB[]> {
  try {
    const { data } = await api.get('/clientes');
    if (Array.isArray(data) && data.length > 0) {
      const normalized = data.map(normalize);
      saveLocalClients(normalized);
      return normalized;
    }
    return getLocalClients();
  } catch {
    return getLocalClients();
  }
}

export async function getClientById(id: number): Promise<ClienteDB> {
  try {
    const { data } = await api.get(`/clientes/${id}`);
    return normalize(data);
  } catch {
    const local = getLocalClients().find(c => c.id === id);
    if (local) return local;
    throw new Error('Cliente no encontrado');
  }
}

export async function createClient(payload: {
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  estado?: string;
}): Promise<ClienteDB> {
  const local = getLocalClients();
  const doc = payload.numeroDocumento.trim();

  // Validación de duplicado
  if (local.some(c => (c.numeroDocumento || '').trim() === doc)) {
    throw new Error(`Ya existe un cliente registrado con el ${payload.tipoDocumento}: ${doc}`);
  }

  try {
    const { data } = await api.post('/clientes', payload);
    const normalized = normalize(data);
    const updated = [normalized, ...local];
    saveLocalClients(updated);
    return normalized;
  } catch (err: any) {
    // Si la API falla, guardar en caché local
    const newClient: ClienteDB = {
      id: Date.now(),
      nombre: payload.nombre.trim(),
      tipoDocumento: payload.tipoDocumento,
      numeroDocumento: doc,
      telefono: payload.telefono || '',
      correo: payload.correo || '',
      direccion: payload.direccion || '',
      estado: payload.estado || 'activo',
      fechaCreacion: new Date().toISOString(),
    };
    const updated = [newClient, ...local];
    saveLocalClients(updated);
    return newClient;
  }
}

export async function updateClient(
  id: number,
  payload: {
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono?: string;
    correo?: string;
    direccion?: string;
    estado?: string;
  }
): Promise<ClienteDB> {
  const local = getLocalClients();
  const doc = payload.numeroDocumento.trim();

  if (local.some(c => c.id !== id && (c.numeroDocumento || '').trim() === doc)) {
    throw new Error(`Ya existe otro cliente con el ${payload.tipoDocumento}: ${doc}`);
  }

  try {
    const { data } = await api.put(`/clientes/${id}`, payload);
    const normalized = normalize(data);
    const updated = local.map(c => (c.id === id ? normalized : c));
    saveLocalClients(updated);
    return normalized;
  } catch {
    const updated = local.map(c =>
      c.id === id
        ? {
            ...c,
            ...payload,
            numeroDocumento: doc,
          }
        : c
    );
    saveLocalClients(updated);
    return updated.find(c => c.id === id)!;
  }
}

export async function deleteClient(id: number): Promise<void> {
  try {
    await api.delete(`/clientes/${id}`);
  } catch {}
  const local = getLocalClients();
  const updated = local.map(c => (c.id === id ? { ...c, estado: 'inactivo' } : c));
  saveLocalClients(updated);
}
