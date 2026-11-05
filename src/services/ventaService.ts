import api from './api';
import type { VentaDB, MetodoPagoDB, DetalleVentaDB } from '../types/venta';
import { IGV_RATE } from '../utils/constants';

function normalizeVenta(v: any): VentaDB {
  if (!v) return v;
  const fecha = v.fechaVenta ?? v.fecha_venta ?? v.date;
  const mappedDetalles: DetalleVentaDB[] = (v.detalles || v.items || []).map((d: any) => ({
    ...d,
    id: d.id,
    ventaId: d.ventaId ?? d.venta_id,
    venta_id: d.ventaId ?? d.venta_id,
    productoId: d.productoId ?? d.producto_id,
    producto_id: d.productoId ?? d.producto_id,
    productoNombre: d.productoNombre ?? d.producto_nombre ?? d.productName ?? '',
    producto_nombre: d.productoNombre ?? d.producto_nombre ?? d.productName ?? '',
    sku: d.sku,
    cantidad: d.cantidad,
    precioUnitario: Number(d.precioUnitario ?? d.precio_unitario ?? d.unitPrice ?? 0),
    precio_unitario: Number(d.precioUnitario ?? d.precio_unitario ?? d.unitPrice ?? 0),
    subtotal: Number(d.subtotal || 0),
  }));
  const metodoNombre = v.metodoPagoNombre ?? v.metodo_pago_nombre ?? v.metodoPago;
  return {
    ...v,
    id: v.id,
    numeroBoleta: v.numeroBoleta ?? v.numero_boleta,
    numero_boleta: v.numeroBoleta ?? v.numero_boleta,
    vendedorId: v.vendedorId ?? v.vendedor_id,
    vendedor_id: v.vendedorId ?? v.vendedor_id,
    vendedorNombre: v.vendedorNombre ?? v.vendedor_nombre,
    vendedor_nombre: v.vendedorNombre ?? v.vendedor_nombre,
    cliente: v.cliente ?? v.customerName ?? '',
    metodoPagoId: v.metodoPagoId ?? v.metodo_pago_id,
    metodo_pago_id: v.metodoPagoId ?? v.metodo_pago_id,
    metodoPagoNombre: metodoNombre,
    metodo_pago_nombre: metodoNombre,
    metodoPago: metodoNombre,
    subtotal: Number(v.subtotal || 0),
    igv: Number(v.igv || 0),
    descuento: Number(v.descuento || 0),
    total: Number(v.total || 0),
    estado: v.estado || 'completada',
    fechaVenta: fecha,
    fecha_venta: fecha,
    observaciones: v.observaciones,
    detalles: mappedDetalles,
    items: mappedDetalles,
  };
}

export function calcularTotalesVenta(
  items: { precioUnitario: number; cantidad: number }[],
  descuento = 0
): { subtotal: number; igv: number; total: number } {
  const sumaItems = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);
  const total = Math.max(0, sumaItems - descuento);
  const subtotal = total / (1 + IGV_RATE);
  const igv = total - subtotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    igv: Math.round(igv * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export async function getSales(): Promise<VentaDB[]> {
  const { data } = await api.get('/ventas');
  return (data || []).map(normalizeVenta);
}

export async function getSaleById(id: number): Promise<VentaDB> {
  const { data } = await api.get(`/ventas/${id}`);
  return normalizeVenta(data);
}

export async function getSaleDetail(ventaId: number): Promise<DetalleVentaDB[]> {
  const venta = await getSaleById(ventaId);
  return venta.detalles || [];
}

export async function createSale(params: {
  vendedorId?: number | string;
  cliente: string;
  metodoPagoId?: number | null;
  descuento?: number;
  observaciones?: string | null;
  items: { productoId: number; cantidad: number; precioUnitario: number }[];
}): Promise<VentaDB & { venta: VentaDB; numeroBoleta: string }> {
  const payload = {
    cliente: params.cliente,
    metodoPagoId: params.metodoPagoId || null,
    descuento: params.descuento || 0,
    observaciones: params.observaciones || null,
    items: params.items.map(i => ({
      productoId: i.productoId,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
    })),
  };

  const { data } = await api.post('/ventas', payload);
  const normalized = normalizeVenta(data);
  return {
    ...normalized,
    venta: normalized,
    numeroBoleta: normalized.numeroBoleta || normalized.numero_boleta || '',
  };
}

export async function anularSale(id: number): Promise<VentaDB> {
  const { data } = await api.patch(`/ventas/${id}/anular`);
  return normalizeVenta(data);
}

export async function getPaymentMethods(): Promise<MetodoPagoDB[]> {
  const { data } = await api.get('/metodos-pago');
  return data || [];
}
