import api from './api';
import type { ProductoDB, CategoriaDB } from '../types/producto';

function normalizeProduct(p: any): ProductoDB {
  if (!p) return p;
  const categoriaId = p.categoriaId ?? p.categoria_id ?? null;
  const categoriaNombre = p.categoriaNombre ?? p.categoria_nombre ?? p.category ?? null;
  return {
    ...p,
    id: p.id,
    nombre: p.nombre || p.name || '',
    sku: p.sku || '',
    categoria_id: categoriaId,
    categoriaId: categoriaId,
    categoria_nombre: categoriaNombre,
    categoriaNombre: categoriaNombre,
    precio_compra: p.precioCompra ?? p.precio_compra ?? p.costPrice ?? 0,
    precioCompra: p.precioCompra ?? p.precio_compra ?? p.costPrice ?? 0,
    precio_venta: p.precioVenta ?? p.precio_venta ?? p.price ?? 0,
    precioVenta: p.precioVenta ?? p.precio_venta ?? p.price ?? 0,
    stock: p.stock ?? 0,
    stock_minimo: p.stockMinimo ?? p.stock_minimo ?? p.minStock ?? 5,
    stockMinimo: p.stockMinimo ?? p.stock_minimo ?? p.minStock ?? 5,
    estado: p.estado || 'activo',
    imagen_url: p.imagenUrl ?? p.imagen_url ?? p.image ?? null,
    imagenUrl: p.imagenUrl ?? p.imagen_url ?? p.image ?? null,
    fecha_creacion: p.fechaCreacion ?? p.fecha_creacion ?? null,
    fechaCreacion: p.fechaCreacion ?? p.fecha_creacion ?? null,
    fecha_actualizacion: p.fechaActualizacion ?? p.fecha_actualizacion ?? null,
    fechaActualizacion: p.fechaActualizacion ?? p.fecha_actualizacion ?? null,
    categorias: p.categorias || (categoriaId ? { id: categoriaId, nombre: categoriaNombre } : null),
  };
}

function normalizeCategory(c: any): CategoriaDB {
  if (!c) return c;
  return {
    ...c,
    id: c.id,
    nombre: c.nombre || '',
    descripcion: c.descripcion || null,
    fecha_creacion: c.fechaCreacion ?? c.fecha_creacion ?? null,
    fechaCreacion: c.fechaCreacion ?? c.fecha_creacion ?? null,
  };
}

export async function getProducts(): Promise<ProductoDB[]> {
  const { data } = await api.get('/productos');
  return (data || []).map(normalizeProduct);
}

export async function getAllProducts(): Promise<ProductoDB[]> {
  const { data } = await api.get('/productos?all=true');
  return (data || []).map(normalizeProduct);
}

export async function getProductById(id: number): Promise<ProductoDB> {
  const { data } = await api.get(`/productos/${id}`);
  return normalizeProduct(data);
}

export async function searchProducts(query: string): Promise<ProductoDB[]> {
  const { data } = await api.get(`/productos/search?q=${encodeURIComponent(query)}`);
  return (data || []).map(normalizeProduct);
}

export async function getLowStockProducts(): Promise<ProductoDB[]> {
  const { data } = await api.get('/productos/low-stock');
  return (data || []).map(normalizeProduct);
}

export async function createProduct(producto: Partial<ProductoDB>): Promise<ProductoDB> {
  const payload = {
    categoriaId: producto.categoriaId ?? producto.categoria_id,
    sku: producto.sku || null,
    nombre: producto.nombre,
    descripcion: producto.descripcion || null,
    imagenUrl: producto.imagenUrl ?? producto.imagen_url ?? null,
    precioCompra: Number(producto.precioCompra ?? producto.precio_compra ?? 0),
    precioVenta: Number(producto.precioVenta ?? producto.precio_venta ?? 0),
    stock: Number(producto.stock ?? 0),
    stockMinimo: Number(producto.stockMinimo ?? producto.stock_minimo ?? 5),
    estado: producto.estado || 'activo',
  };
  const { data } = await api.post('/productos', payload);
  return normalizeProduct(data);
}

export async function updateProduct(id: number, campos: Partial<ProductoDB>): Promise<ProductoDB> {
  const payload = {
    categoriaId: campos.categoriaId ?? campos.categoria_id,
    sku: campos.sku,
    nombre: campos.nombre,
    descripcion: campos.descripcion,
    imagenUrl: campos.imagenUrl ?? campos.imagen_url,
    precioCompra: campos.precioCompra !== undefined || campos.precio_compra !== undefined
      ? Number(campos.precioCompra ?? campos.precio_compra)
      : undefined,
    precioVenta: campos.precioVenta !== undefined || campos.precio_venta !== undefined
      ? Number(campos.precioVenta ?? campos.precio_venta)
      : undefined,
    stock: campos.stock !== undefined ? Number(campos.stock) : undefined,
    stockMinimo: campos.stockMinimo !== undefined || campos.stock_minimo !== undefined
      ? Number(campos.stockMinimo ?? campos.stock_minimo)
      : undefined,
    estado: campos.estado,
  };
  const { data } = await api.put(`/productos/${id}`, payload);
  return normalizeProduct(data);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/productos/${id}`);
}

// ── Categorías ──────────────────────────────────────────

export async function getCategories(): Promise<CategoriaDB[]> {
  const { data } = await api.get('/categorias');
  return (data || []).map(normalizeCategory);
}

export async function getCategoryById(id: number): Promise<CategoriaDB> {
  const { data } = await api.get(`/categorias/${id}`);
  return normalizeCategory(data);
}

export async function createCategory(
  catOrName: { nombre: string; descripcion?: string | null } | string,
  desc?: string | null
): Promise<CategoriaDB> {
  const payload = typeof catOrName === 'string' ? { nombre: catOrName, descripcion: desc || null } : catOrName;
  const { data } = await api.post('/categorias', payload);
  return normalizeCategory(data);
}

export async function updateCategory(
  id: number,
  catOrName: { nombre: string; descripcion?: string | null } | string,
  desc?: string | null
): Promise<CategoriaDB> {
  const payload = typeof catOrName === 'string' ? { nombre: catOrName, descripcion: desc || null } : catOrName;
  const { data } = await api.put(`/categorias/${id}`, payload);
  return normalizeCategory(data);
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categorias/${id}`);
}
