import api from './api';
import type { MovimientoStockDB } from '../types/movimiento';

function normalizeMovimiento(m: any): MovimientoStockDB {
  if (!m) return m;
  const fecha = m.fechaMovimiento ?? m.fecha_movimiento ?? m.date;
  return {
    ...m,
    id: m.id,
    productoId: m.productoId ?? m.producto_id,
    producto_id: m.productoId ?? m.producto_id,
    productoNombre: m.productoNombre ?? m.producto_nombre ?? m.productName,
    producto_nombre: m.productoNombre ?? m.producto_nombre ?? m.productName,
    sku: m.sku || null,
    usuarioId: m.usuarioId ?? m.usuario_id,
    usuario_id: m.usuarioId ?? m.usuario_id,
    usuarioNombre: m.usuarioNombre ?? m.usuario_nombre ?? m.user,
    usuario_nombre: m.usuarioNombre ?? m.usuario_nombre ?? m.user,
    tipo: m.tipo ?? m.type ?? 'ajuste',
    cantidad: m.cantidad ?? m.quantity ?? 0,
    motivo: m.motivo ?? m.reason ?? null,
    deDonde: m.deDonde ?? m.motivo ?? m.reason ?? null,
    fechaMovimiento: fecha,
    fecha_movimiento: fecha,
  };
}

export async function getMovements(params?: {
  productoId?: number;
  tipo?: string;
  from?: string;
  to?: string;
}): Promise<MovimientoStockDB[]> {
  const queryParams = new URLSearchParams();
  if (params?.productoId) queryParams.append('productoId', String(params.productoId));
  if (params?.tipo) queryParams.append('tipo', params.tipo);
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);

  const url = queryParams.toString() ? `/movimientos?${queryParams.toString()}` : '/movimientos';
  const { data } = await api.get(url);
  return (data || []).map(normalizeMovimiento);
}

export async function createMovement(movimiento: {
  productoId?: number;
  producto_id?: number;
  usuarioId?: number | string;
  tipo: string;
  cantidad: number;
  motivo?: string;
}): Promise<MovimientoStockDB> {
  const payload = {
    productoId: movimiento.productoId ?? movimiento.producto_id,
    tipo: movimiento.tipo.toLowerCase(),
    cantidad: movimiento.cantidad,
    motivo: movimiento.motivo || null,
  };

  const { data } = await api.post('/movimientos', payload);
  return normalizeMovimiento(data);
}
