export interface DevolucionItem {
  id?: number;
  productoId: number;
  productoNombre?: string;
  sku?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DevolucionDB {
  id: number;
  numeroDevolucion: string;
  numero_devolucion?: string;
  ventaId: number;
  venta_id?: number;
  numeroBoleta: string;
  numero_boleta?: string;
  cliente: string;
  usuarioNombre?: string;
  usuario_nombre?: string;
  motivo: string;
  destinoStock: 'reingreso' | 'merma';
  destino_stock?: 'reingreso' | 'merma';
  metodoReembolso: 'efectivo' | 'nota_credito' | 'transferencia';
  metodo_reembolso?: 'efectivo' | 'nota_credito' | 'transferencia';
  montoTotal: number;
  monto_total?: number;
  estado: string;
  observaciones?: string | null;
  fechaDevolucion: string;
  fecha_devolucion?: string;
  items: DevolucionItem[];
}
