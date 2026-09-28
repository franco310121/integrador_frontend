import { useState, useEffect, type FormEvent } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  PackageCheck,
  AlertCircle,
  PackageX,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct } from '../services/productoService';
import type { ProductoDB, CategoriaDB } from '../types/producto';
import Loader from '../components/feedback/Loader';
import { formatCurrency } from '../utils/formatters';

const PAGE_SIZE = 10;

export default function Productos() {
  const { isAdmin } = useAuth();
  const [products, setProducts]     = useState<ProductoDB[]>([]);
  const [categories, setCategories] = useState<CategoriaDB[]>([]);
  const [loading, setLoading]       = useState<boolean>(true);
  const [msg, setMsg]               = useState('');
  const [msgType, setMsgType]       = useState<'success' | 'danger'>('success');

  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [filtered, setFiltered]       = useState<ProductoDB[]>([]);
  const [page, setPage]               = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState({
    nombre: '',
    categoria_id: '',
    sku: '',
    descripcion: '',
    precio_venta: '',
    precio_compra: '',
    stock: '',
    stock_minimo: '5',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }
    if (filterCat) list = list.filter(p => p.categoria_id === Number(filterCat));
    if (filterStock === 'ok')  list = list.filter(p => Number(p.stock || 0) > Number(p.stock_minimo || 5));
    if (filterStock === 'low') list = list.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stock_minimo || 5));
    if (filterStock === 'out') list = list.filter(p => Number(p.stock || 0) === 0);
    setFiltered(list);
    setPage(1);
  }, [products, search, filterCat, filterStock]);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      nombre: '',
      categoria_id: categories[0]?.id ? String(categories[0].id) : '',
      sku: '',
      descripcion: '',
      precio_venta: '',
      precio_compra: '',
      stock: '0',
      stock_minimo: '5',
    });
    setShowModal(true);
  };

  const openEdit = (p: ProductoDB) => {
    setEditingId(p.id!);
    setForm({
      nombre: p.nombre,
      categoria_id: p.categoria_id ? String(p.categoria_id) : '',
      sku: p.sku || '',
      descripcion: p.descripcion || '',
      precio_venta: String(p.precio_venta ?? ''),
      precio_compra: String(p.precio_compra ?? ''),
      stock: String(p.stock ?? 0),
      stock_minimo: String(p.stock_minimo ?? 5),
    });
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      showNotification('El nombre del producto es obligatorio.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<ProductoDB> = {
        nombre: form.nombre.trim(),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        sku: form.sku.trim() || null,
        descripcion: form.descripcion.trim() || null,
        precio_venta: Number(form.precio_venta) || 0,
        precio_compra: Number(form.precio_compra) || 0,
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 5,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        showNotification('Ficha de producto actualizada correctamente.', 'success');
      } else {
        await createProduct(payload);
        showNotification('Producto incorporado al catálogo exitosamente.', 'success');
      }
      setShowModal(false);
      const updated = await getProducts();
      setProducts(updated);
    } catch (err: any) {
      showNotification(err?.message || 'Error al persistir los cambios.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Confirma la desactivación lógica de este ítem?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification('El ítem fue desactivado del catálogo activo.', 'success');
    } catch {
      showNotification('Error al intentar desactivar el producto.', 'danger');
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Catálogo Maestro de Productos</h1>
          <p className="text-muted mb-0 small">Administración de inventario, precios de venta y umbrales de reabastecimiento</p>
        </div>
        {isAdmin() && (
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
            onClick={openNew}
          >
            <Plus size={16} />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <PackageCheck size={18} className="text-success" /> : <AlertCircle size={18} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3 d-flex flex-wrap gap-2.5 align-items-center">
          <div className="position-relative flex-grow-1" style={{ minWidth: 220, maxWidth: 320 }}>
            <Search size={16} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 12 }} />
            <input
              type="text"
              className="form-control form-control-sm ps-5"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
            />
          </div>

          <div className="d-flex align-items-center gap-2 flex-grow-1 flex-sm-grow-0">
            <select
              className="form-select form-select-sm"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              style={{ minWidth: 170 }}
            >
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <select
              className="form-select form-select-sm"
              value={filterStock}
              onChange={e => setFilterStock(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">Todos los estados</option>
              <option value="ok">Existencias óptimas</option>
              <option value="low">Stock crítico / bajo</option>
              <option value="out">Sin existencias</option>
            </select>
          </div>

          <div className="ms-auto text-muted small fw-medium">
            <SlidersHorizontal size={14} className="me-1" />
            <span>{filtered.length} ítems encontrados</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 80 }}>Código</th>
                <th>SKU</th>
                <th>Descripción del Ítem</th>
                <th>Categoría</th>
                <th className="text-end">Precio Venta</th>
                {isAdmin() && <th className="text-end">Costo Compra</th>}
                <th className="text-center">Existencias</th>
                <th style={{ width: 140 }}>Condición</th>
                {isAdmin() && <th className="text-end" style={{ width: 140 }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map(p => {
                const stock = Number(p.stock || 0);
                const min = Number(p.stock_minimo || 5);
                const isOut = stock === 0;
                const isLow = stock > 0 && stock <= min;

                return (
                  <tr key={p.id}>
                    <td className="text-muted small">#{p.id}</td>
                    <td className="text-muted small font-monospace">{p.sku || '—'}</td>
                    <td className="fw-semibold small text-dark">{p.nombre}</td>
                    <td className="small">
                      <span className="badge bg-light text-secondary border px-2 py-1">
                        {p.categorias?.nombre || 'General'}
                      </span>
                    </td>
                    <td className="fw-bold small text-end text-dark">{formatCurrency(Number(p.precio_venta || 0))}</td>
                    {isAdmin() && (
                      <td className="text-muted small text-end">{formatCurrency(Number(p.precio_compra || 0))}</td>
                    )}
                    <td className="small text-center fw-semibold">{stock}</td>
                    <td>
                      <span className={`badge py-1 px-2.5 rounded-pill ${isOut ? 'badge-soft-danger' : isLow ? 'badge-soft-warning' : 'badge-soft-success'}`}>
                        {isOut ? 'Agotado' : isLow ? 'Stock Crítico' : 'Disponible'}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm p-1.5 rounded-2 d-inline-flex align-items-center"
                            onClick={() => openEdit(p)}
                            title="Editar ficha de producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm p-1.5 rounded-2 d-inline-flex align-items-center"
                            onClick={() => handleDelete(p.id!)}
                            title="Desactivar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin() ? 9 : 8} className="text-center text-muted py-5 small">
                    <PackageX size={36} className="mx-auto mb-2 text-muted opacity-50 d-block" />
                    No se encontraron productos que coincidan con los criterios establecidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between p-3 border-top">
            <small className="text-muted">Página {page} de {totalPages}</small>
            <div className="d-flex gap-1.5">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Alta / Edición */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-bottom py-3 px-4">
                <h5 className="modal-title fs-6 fw-bold text-dark mb-0">
                  {editingId ? 'Actualizar Ficha de Producto' : 'Incorporar Nuevo Producto'}
                </h5>
                <button
                  type="button"
                  className="btn-close p-1"
                  onClick={() => setShowModal(false)}
                  aria-label="Cerrar modal"
                />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                      Nombre Comercial *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ejemplo: Monitor LED 24 pulgadas"
                      required
                    />
                  </div>
                  <div className="row g-2.5 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Categoría
                      </label>
                      <select
                        className="form-select"
                        value={form.categoria_id}
                        onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                      >
                        <option value="">Seleccione una categoría</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Código SKU
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.sku}
                        onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                        placeholder="Identificador SKU"
                      />
                    </div>
                  </div>
                  <div className="row g-2.5 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Precio de Venta (PEN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.precio_venta}
                        onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
                        min="0"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Costo de Compra (PEN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.precio_compra}
                        onChange={e => setForm(f => ({ ...f, precio_compra: e.target.value }))}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="row g-2.5 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Stock Inicial
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                        min="0"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                        Stock Mínimo Alerta
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.stock_minimo}
                        onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light border-top py-2.5 px-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3"
                    disabled={saving}
                  >
                    {saving ? 'Procesando...' : 'Guardar Ficha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
