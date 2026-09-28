export interface ProveedorDB {
  id?: number;
  razon_social: string;
  razonSocial?: string;
  nombre?: string;
  ruc?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  fecha_creacion?: string | null;
  fechaCreacion?: string | null;
}

export interface CompraDB {
  id?: number;
  proveedor_id?: number;
  proveedorId?: number;
  proveedor_nombre?: string;
  proveedorNombre?: string;
  usuario_id?: string | number;
  usuarioId?: string | number;
  usuario_nombre?: string;
  usuarioNombre?: string;
  subtotal: number;
  igv: number;
  total: number;
  fecha_compra?: string | null;
  fechaCompra?: string | null;
  proveedores?: { razon_social?: string; ruc?: string } | null;
  perfiles?: { nombre_completo?: string } | null;
  detalles?: DetalleCompraDB[];
}

export interface DetalleCompraDB {
  id?: number | null;
  compra_id?: number | null;
  compraId?: number | null;
  producto_id?: number;
  productoId?: number;
  producto_nombre?: string;
  productoNombre?: string;
  sku?: string | null;
  cantidad: number;
  costo_unitario?: number;
  costoUnitario?: number;
  subtotal: number;
  productos?: { nombre?: string; sku?: string } | null;
}

export interface CarritoCompraItem {
  productoId: number;
  productoNombre: string;
  sku?: string | null;
  costoUnitario: number;
  cantidad: number;
}
