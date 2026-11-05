export interface CategoriaDB {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  fecha_creacion?: string | null;
  fechaCreacion?: string | null;
}

export interface ProductoDB {
  id: number;
  categoria_id?: number | null;
  categoriaId?: number | null;
  categoria_nombre?: string | null;
  categoriaNombre?: string | null;
  sku?: string | null;
  nombre: string;
  name?: string;
  descripcion?: string | null;
  precio_compra?: number;
  precioCompra: number;
  precio_venta?: number;
  precioVenta: number;
  stock: number;
  stock_minimo?: number;
  stockMinimo?: number;
  estado?: string;
  imagen_url?: string | null;
  imagenUrl?: string | null;
  margen?: number | null;
  margenGanancia?: number | null;
  stockLabel?: string | null;
  fecha_creacion?: string | null;
  fechaCreacion?: string | null;
  fecha_actualizacion?: string | null;
  fechaActualizacion?: string | null;
  categorias?: { id?: number; nombre?: string } | null;
}

export interface ProductoItem {
  id: number;
  categoriaId: number | null;
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  estado: string;
  imagenUrl: string | null;
  fechaCreacion: Date | null;
  fechaActualizacion: Date | null;
  categoriaNombre: string | null;
}
