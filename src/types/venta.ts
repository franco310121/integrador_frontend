export interface MetodoPagoDB {
  id: number;
  nombre: string;
}

export interface DetalleVentaDB {
  id?: number;
  venta_id?: number | null;
  ventaId?: number | null;
  producto_id?: number;
  productoId?: number;
  producto_nombre?: string;
  productoNombre?: string;
  sku?: string | null;
  cantidad: number;
  precio_unitario?: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaDB {
  id: number;
  numero_boleta?: string;
  numeroBoleta?: string;
  vendedor_id?: number | string;
  vendedorId?: number | string;
  vendedor_nombre?: string;
  vendedorNombre?: string;
  cliente: string;
  metodo_pago_id?: number | null;
  metodoPagoId?: number | null;
  metodo_pago_nombre?: string;
  metodoPagoNombre?: string;
  subtotal: number;
  igv: number;
  descuento?: number;
  total: number;
  estado: string;
  fecha_venta?: string;
  fechaVenta?: string;
  observaciones?: string | null;
  detalles?: DetalleVentaDB[];
}

export interface CarritoVentaItem {
  productoId: number;
  productoNombre: string;
  sku: string | null;
  cantidad: number;
  precioUnitario: number;
  stockDisponible: number;
  stockMax?: number;
}
