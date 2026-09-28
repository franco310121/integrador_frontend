import { useState, useEffect, type FormEvent } from 'react';
import { PlusCircle, CheckCircle2, AlertCircle, PackageCheck, Tag, DollarSign, Layers } from 'lucide-react';
import { getProducts, getCategories, updateProduct } from '../services/productoService';
import type { ProductoDB, CategoriaDB } from '../types/producto';
import Loader from '../components/feedback/Loader';
import { formatCurrency } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

export default function Register() {
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [categories, setCategories] = useState<CategoriaDB[]>([]);
  const [pendientes, setPendientes] = useState<ProductoDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    categoriaId: '',
    precioVenta: '',
    precioCompra: '',
    stock: '',
    stockMinimo: '5',
    sku: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const flash = (m: string, t: 'success' | 'danger') => {
    setMsg(m);
    setMsgType(t);
    setTimeout(() => setMsg(''), 4000);
  };

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
      const pendingList = p.filter(x => Number(x.precio_venta ?? x.precioVenta ?? 0) === 0);
      setPendientes(pendingList);
    } catch {
      flash('Error al sincronizar el catálogo de productos pendientes.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectPendiente = (p: ProductoDB) => {
    setSelectedId(p.id!);
    setForm({
      nombre: p.nombre,
      categoriaId: String(p.categoria_id || p.categoriaId || ''),
      precioVenta: p.precio_venta ? String(p.precio_venta) : '',
      precioCompra: p.precio_compra ? String(p.precio_compra) : '',
      stock: String(p.stock ?? 0),
      stockMinimo: String(p.stock_minimo ?? p.stockMinimo ?? 5),
      sku: p.sku || '',
    });
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    if (!form.nombre.trim() || !form.categoriaId || !form.precioVenta) {
      flash('Nombre, categoría y precio de venta son obligatorios.', 'danger');
      return;
    }
    if (Number(form.precioVenta) <= 0) {
      flash('El precio de venta debe ser superior a cero.', 'danger');
      return;
    }

    setSaving(true);
    try {
      await updateProduct(selectedId, {
        nombre: form.nombre.trim(),
        categoria_id: Number(form.categoriaId),
        precio_venta: parseFloat(form.precioVenta),
        precio_compra: parseFloat(form.precioCompra) || 0,
        stock: parseInt(form.stock, 10) || 0,
        stock_minimo: parseInt(form.stockMinimo, 10) || 5,
        sku: form.sku.trim() || null,
      });

      // Notificar cambio de stock global para que badges y KPI actualicen al instante
      notifyStockUpdated();

      setProducts(prev =>
        prev.map(p => (p.id === selectedId ? { ...p, precio_venta: parseFloat(form.precioVenta) } : p))
      );
      setPendientes(prev => prev.filter(p => p.id !== selectedId));
      setSelectedId(null);
      setForm({
        nombre: '',
        categoriaId: '',
        precioVenta: '',
        precioCompra: '',
        stock: '',
        stockMinimo: '5',
        sku: '',
      });
      flash('✔ Producto configurado y listo para comercialización.', 'success');
    } catch {
      flash('Error al guardar la configuración del producto.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const pVenta = Number(form.precioVenta) || 0;
  const pCompra = Number(form.precioCompra) || 0;
  const margen = pVenta > 0 && pCompra > 0 ? (((pVenta - pCompra) / pVenta) * 100).toFixed(1) : null;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">✚ Registrar / Configurar Producto</h1>
          <p className="text-muted mb-0 small">Asignación de precio de venta y SKU a mercancía recién ingresada</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Lista de productos sin precio */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <Layers size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">Pendientes de Precio ({pendientes.length})</span>
              </div>
              {pendientes.length > 0 && (
                <span className="badge badge-soft-warning rounded-pill px-2.5 py-1">
                  {pendientes.length} sin precio
                </span>
              )}
            </div>
            <div className="card-body p-2 p-sm-3">
              {pendientes.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <div className="rounded-circle bg-success-subtle text-success mx-auto d-flex align-items-center justify-content-center mb-3" style={{ width: 52, height: 52 }}>
                    <PackageCheck size={28} />
                  </div>
                  <h6 className="fw-bold text-dark mb-1">Todos los ítems están configurados</h6>
                  <p className="small text-muted mb-0">No hay productos en almacén pendientes de precio de venta.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush gap-1">
                  {pendientes.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start rounded-3 p-3 border ${
                        selectedId === p.id ? 'active border-primary bg-primary text-white' : 'bg-white'
                      }`}
                      onClick={() => selectPendiente(p)}
                    >
                      <div className="overflow-hidden">
                        <div className="fw-semibold text-truncate">{p.nombre}</div>
                        <small className={selectedId === p.id ? 'text-white-50' : 'text-muted'}>
                          {p.categorias?.nombre || 'General'}
                          {p.sku ? ` · SKU: ${p.sku}` : ''}
                        </small>
                      </div>
                      <div className="text-end flex-shrink-0 ms-2">
                        <div className="small fw-semibold">{p.stock} uds.</div>
                        <span className={`badge ${selectedId === p.id ? 'bg-white text-primary' : 'bg-secondary'} rounded-pill mt-1`}>
                          Sin precio
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulario de configuración */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <PlusCircle size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">
                {selectedId ? `Configurando: ${form.nombre}` : 'Seleccione un ítem pendiente'}
              </span>
            </div>
            <div className="card-body p-3 p-sm-4">
              <form onSubmit={guardar} className={!selectedId ? 'opacity-50 pe-none' : ''}>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-8">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      disabled={!selectedId}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-4">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Código SKU
                    </label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={form.sku}
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                      placeholder="Ej: PRD-001"
                      disabled={!selectedId}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Categoría *
                  </label>
                  <select
                    className="form-select"
                    value={form.categoriaId}
                    onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                    disabled={!selectedId}
                    required
                  >
                    <option value="">— Seleccionar categoría —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Precio Venta (S/) *
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">S/</span>
                      <input
                        type="number"
                        className="form-control"
                        value={form.precioVenta}
                        onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))}
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        disabled={!selectedId}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Costo Compra (S/)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">S/</span>
                      <input
                        type="number"
                        className="form-control"
                        value={form.precioCompra}
                        onChange={e => setForm(f => ({ ...f, precioCompra: e.target.value }))}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        disabled={!selectedId}
                      />
                    </div>
                  </div>
                </div>

                {margen !== null && (
                  <div className="alert alert-light border py-2.5 px-3 mb-3 d-flex justify-content-between align-items-center rounded-3">
                    <span className="small text-muted">Margen bruto estimado sobre venta:</span>
                    <span className={`fw-bold small ${Number(margen) > 0 ? 'text-success' : 'text-danger'}`}>
                      {margen}%
                    </span>
                  </div>
                )}

                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.stock}
                      onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                      min="0"
                      disabled={!selectedId}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.stockMinimo}
                      onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))}
                      min="0"
                      disabled={!selectedId}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-warning w-100 py-2.5 fw-bold text-dark rounded-3 shadow-sm"
                  disabled={!selectedId || saving}
                >
                  {saving ? 'Guardando configuración...' : '✔ Guardar Configuración del Producto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
