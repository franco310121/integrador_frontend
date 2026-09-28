export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';

export interface MovimientoStockDB {
  id?: number;
  producto_id?: number;
  productoId?: number;
  producto_nombre?: string;
  productoNombre?: string;
  sku?: string | null;
  usuario_id?: string | number;
  usuarioId?: string | number;
  usuario_nombre?: string;
  usuarioNombre?: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string | null;
  fecha_movimiento?: string | null;
  fechaMovimiento?: string | null;
  productos?: { nombre?: string; sku?: string } | null;
  perfiles?: { nombre_completo?: string } | null;
}
