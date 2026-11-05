import api from './api';
import type { EmpresaBackendRequest, EmpresaBackendResponse } from '../types/finanzas';

export interface Empresa {
  razonSocial: string;
  nombreComercial: string;
  ruc: string;
  actividad: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  correo: string;
  telefono: string;
  representante: string;
}

export const emptyEmpresa: Empresa = {
  razonSocial: '', nombreComercial: '', ruc: '', actividad: '', direccion: '',
  departamento: '', provincia: '', distrito: '', correo: '', telefono: '', representante: '',
};

interface StoredEmpresa { empresa: Empresa; updatedAt: string }
const storageKey = (userId: string) => `finvora:empresa:v1:${encodeURIComponent(userId)}`;

export function loadEmpresa(userId: string): StoredEmpresa | null {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!data?.empresa || Object.keys(emptyEmpresa).some(key => typeof data.empresa[key] !== 'string') || typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt))) {
    throw new Error('Datos locales inválidos');
  }
  return { empresa: Object.fromEntries(Object.keys(emptyEmpresa).map(key => [key, data.empresa[key]])) as unknown as Empresa, updatedAt: data.updatedAt };
}

export function saveEmpresa(userId: string, empresa: Empresa): StoredEmpresa {
  const record = { empresa, updatedAt: new Date().toISOString() };
  // Propagate storage failures so the interface never reports an unsuccessful save as successful.
  localStorage.setItem(storageKey(userId), JSON.stringify(record));
  return record;
}

export async function fetchEmpresaFromApi(): Promise<EmpresaBackendResponse | null> {
  try {
    const { data } = await api.get<EmpresaBackendResponse>('/empresa');
    return data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function saveEmpresaToApi(empresa: Empresa): Promise<EmpresaBackendResponse> {
  const ubicacionExtra = [empresa.distrito, empresa.provincia, empresa.departamento]
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ');
  const direccionCompleta = ubicacionExtra && !empresa.direccion.includes(ubicacionExtra)
    ? `${empresa.direccion.trim()} (${ubicacionExtra})`
    : empresa.direccion.trim();

  const payload: EmpresaBackendRequest = {
    nombreMype: empresa.razonSocial.trim() || empresa.nombreComercial.trim(),
    ruc: empresa.ruc.trim(),
    direccion: direccionCompleta,
    telefono: empresa.telefono.trim() || undefined,
    correo: empresa.correo.trim() || undefined,
    sectorComercial: empresa.actividad.trim() || undefined,
  };
  const { data } = await api.put<EmpresaBackendResponse>('/empresa', payload);
  return data;
}
