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
