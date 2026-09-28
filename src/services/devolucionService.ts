import api from './api';
import type { DevolucionDB } from '../types/devolucion';
import { notifyStockUpdated } from '../utils/stockEvents';
import { createMovement } from './movimientoService';

const LOCAL_DEV_KEY = 'sm_devoluciones_cache';

const INITIAL_DEVOLUCIONES: DevolucionDB[] = [];

function getLocalDevoluciones(): DevolucionDB[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEV_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalDevoluciones(list: DevolucionDB[]) {
  try {
    localStorage.setItem(LOCAL_DEV_KEY, JSON.stringify(list));
  } catch {}
}

function normalize(d: any): DevolucionDB {
  if (!d) return d;
  return {
    ...d,
    id: d.id,
    numeroDevolucion: d.numeroDevolucion ?? d.numero_devolucion ?? '',
    numero_devolucion: d.numeroDevolucion ?? d.numero_devolucion ?? '',
    ventaId: d.ventaId ?? d.venta_id,
    venta_id: d.ventaId ?? d.venta_id,
    numeroBoleta: d.numeroBoleta ?? d.numero_boleta ?? '',
    numero_boleta: d.numeroBoleta ?? d.numero_boleta ?? '',
    cliente: d.cliente || '',
    usuarioNombre: d.usuarioNombre ?? d.usuario_nombre ?? 'Administrador',
    usuario_nombre: d.usuarioNombre ?? d.usuario_nombre ?? 'Administrador',
    motivo: d.motivo || '',
    destinoStock: d.destinoStock ?? d.destino_stock ?? 'reingreso',
    destino_stock: d.destinoStock ?? d.destino_stock ?? 'reingreso',
    metodoReembolso: d.metodoReembolso ?? d.metodo_reembolso ?? 'efectivo',
    metodo_reembolso: d.metodoReembolso ?? d.metodo_reembolso ?? 'efectivo',
    montoTotal: Number(d.montoTotal ?? d.monto_total ?? 0),
    monto_total: Number(d.montoTotal ?? d.monto_total ?? 0),
    estado: d.estado || 'completada',
    observaciones: d.observaciones || '',
    fechaDevolucion: d.fechaDevolucion ?? d.fecha_devolucion ?? new Date().toISOString(),
    fecha_devolucion: d.fechaDevolucion ?? d.fecha_devolucion ?? new Date().toISOString(),
    items: (d.items || []).map((i: any) => ({
      ...i,
      id: i.id,
      productoId: i.productoId ?? i.producto_id,
      productoNombre: i.productoNombre ?? i.producto_nombre,
      sku: i.sku,
      cantidad: Number(i.cantidad || 1),
      precioUnitario: Number(i.precioUnitario ?? i.precio_unitario ?? 0),
      subtotal: Number(i.subtotal || 0),
    })),
  };
}

export async function getDevoluciones(): Promise<DevolucionDB[]> {
  try {
    const { data } = await api.get('/devoluciones');
    if (Array.isArray(data) && data.length > 0) {
      const normalized = data.map(normalize);
      saveLocalDevoluciones(normalized);
      return normalized;
    }
    return getLocalDevoluciones();
  } catch {
    return getLocalDevoluciones();
  }
}

export async function createDevolucion(payload: {
  ventaId: number;
  numeroBoleta?: string;
  cliente?: string;
  motivo: string;
  destinoStock: 'reingreso' | 'merma';
  metodoReembolso: 'efectivo' | 'nota_credito' | 'transferencia';
  observaciones?: string;
  items: {
    productoId: number;
    productoNombre?: string;
    sku?: string | null;
    cantidad: number;
    precioUnitario: number;
  }[];
}): Promise<DevolucionDB> {
  const local = getLocalDevoluciones();

  try {
    const { data } = await api.post('/devoluciones', payload);
    const normalized = normalize(data);
    saveLocalDevoluciones([normalized, ...local]);
    notifyStockUpdated();
    return normalized;
  } catch (err) {
    // Generar devolución local y registrar movimiento de stock correspondiente
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const numDev = `DEV-${dateStr}-${rand}`;

    const itemsCalculados = payload.items.map((it, idx) => ({
      id: Date.now() + idx,
      productoId: it.productoId,
      productoNombre: it.productoNombre || 'Producto',
      sku: it.sku || null,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
      subtotal: Math.round(it.cantidad * it.precioUnitario * 100) / 100,
    }));

    const total = itemsCalculados.reduce((acc, i) => acc + i.subtotal, 0);

    const nuevaDevolucion: DevolucionDB = {
      id: Date.now(),
      numeroDevolucion: numDev,
      ventaId: payload.ventaId,
      numeroBoleta: payload.numeroBoleta || 'B001-0000',
      cliente: payload.cliente || 'Cliente General',
      usuarioNombre: 'Administrador General',
      motivo: payload.motivo,
      destinoStock: payload.destinoStock,
      metodoReembolso: payload.metodoReembolso,
      montoTotal: Math.round(total * 100) / 100,
      estado: 'completada',
      observaciones: payload.observaciones || '',
      fechaDevolucion: new Date().toISOString(),
      items: itemsCalculados,
    };

    saveLocalDevoluciones([nuevaDevolucion, ...local]);

    // Registrar en Movimientos de Stock (Kardex)
    for (const item of payload.items) {
      try {
        await createMovement({
          productoId: item.productoId,
          tipo: payload.destinoStock === 'reingreso' ? 'entrada' : 'ajuste',
          cantidad: item.cantidad,
          motivo: `Devolución ${numDev} (Boleta ${payload.numeroBoleta || ''}) - ${payload.motivo}`,
        });
      } catch {}
    }

    notifyStockUpdated();
    return nuevaDevolucion;
  }
}
