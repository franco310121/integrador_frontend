import { useState, useEffect, type FormEvent } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
  Search,
  Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getMovements, createMovement } from '../services/movimientoService';
import type { ProductoDB } from '../types/producto';
import type { MovimientoStockDB, TipoMovimiento } from '../types/movimiento';
import Loader from '../components/feedback/Loader';
import { formatDateTime } from '../utils/formatters';
import { notifyStockUpdated, STOCK_UPDATED_EVENT } from '../utils/stockEvents';

const PAGE_SIZE = 12;

export default function MovimientosStock() {
  const { session } = useAuth();
  const [products, setProducts]   = useState<ProductoDB[]>([]);
  const [movements, setMovements] = useState<MovimientoStockDB[]>([]);
  const [filtered, setFiltered]   = useState<MovimientoStockDB[]>([]);
  const [loading, setLoading]     = useState(true);

  // Formulario de ajuste
  const [adjProdId, setAdjProdId]   = useState('');
  const [adjTipo, setAdjTipo]       = useState<TipoMovimiento>('ajuste');
  const [adjCant, setAdjCant]       = useState('');
  const [adjMotivo, setAdjMotivo]   = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  // Filtros del historial
  const [fTipo, setFTipo] = useState('');
  const [fProd, setFProd] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo]     = useState('');
  const [page, setPage]   = useState(1);
  const [msg, setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const loadData = () => {
    Promise.all([getProducts(), getMovements()])
      .then(([p, m]) => {
        setProducts(p);
        setMovements(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Escuchar actualizaciones de stock en tiempo real
  useEffect(() => {
    const handleStockUpdate = () => loadData();
    window.addEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
    return () => window.removeEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
  }, []);

  // Filtrado reactivo
  useEffect(() => {
    let list = [...movements];
    if (fTipo) {
      list = list.filter(m => m.tipo === fTipo);
    }
    if (fProd.trim()) {
      const q = fProd.toLowerCase();
      list = list.filter(m =>
        (m.productoNombre || m.producto_nombre || '').toLowerCase().includes(q) ||
        (m.sku || '').toLowerCase().includes(q)
      );
    }
    if (fFrom) {
      list = list.filter(m => {
        const fecha = (m.fechaMovimiento || m.fecha_movimiento || '').slice(0, 10);
        return fecha >= fFrom;
      });
    }
    if (fTo) {
      list = list.filter(m => {
        const fecha = (m.fechaMovimiento || m.fecha_movimiento || '').slice(0, 10);
        return fecha <= fTo;
      });
    }
    setFiltered(list);
    setPage(1);
  }, [movements, fTipo, fProd, fFrom, fTo]);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
  };

  const handleRegisterMovement = async (e: FormEvent) => {
    e.preventDefault();
    const cant = parseInt(adjCant, 10);
    if (!adjProdId) {
      showNotification('Seleccione un producto para registrar el movimiento.', 'danger');
      return;
    }
    if (!cant || cant <= 0) {
      showNotification('La cantidad debe ser un valor entero positivo.', 'danger');
      return;
    }
    if (!adjMotivo.trim()) {
      showNotification('Debe ingresar un motivo o justificación técnica.', 'danger');
      return;
    }
    if (!session?.userId) {
      showNotification('Sesión no autorizada o expirada.', 'danger');
      return;
    }

    const prod = products.find(p => p.id === Number(adjProdId));
    if (adjTipo === 'salida' && prod && cant > Number(prod.stock || 0)) {
      showNotification(`Stock insuficiente. Cantidad disponible: ${prod.stock}`, 'danger');
      return;
    }

    setAdjLoading(true);
    try {
      const createdMovement = await createMovement({
        productoId: Number(adjProdId),
        usuarioId:  session.userId,
        tipo:       adjTipo,
        cantidad:   cant,
        motivo:     adjMotivo.trim(),
      });

      const delta = adjTipo === 'salida' ? -cant : cant;
      setProducts(prev =>
        prev.map(p => (p.id === Number(adjProdId) ? { ...p, stock: Number(p.stock || 0) + delta } : p))
      );

      const updated = [createdMovement, ...movements];
      setMovements(updated);

      // Disparar evento para actualizar Navbar, Sidebar y Dashboard en tiempo real
      notifyStockUpdated();

      setAdjProdId('');
      setAdjCant('');
      setAdjMotivo('');
      setAdjTipo('ajuste');
      showNotification('✔ Movimiento de almacén asentado con éxito.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Error al asentar el movimiento en el sistema.', 'danger');
    } finally {
      setAdjLoading(false);
    }
  };

  const clearFilters = () => {
    setFTipo('');
    setFProd('');
    setFFrom('');
    setFTo('');
  };

  const exportCSV = () => {
    const headers = ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Justificación', 'Usuario'];
    const rows = filtered.map(m =>
      `"${m.id}","${m.fechaMovimiento || m.fecha_movimiento || ''}","${m.productoNombre || m.producto_nombre || ''}","${m.tipo}",${m.cantidad},"${m.motivo || ''}","${m.usuarioNombre || m.usuario_nombre || ''}"`
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kardex_movimientos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedMovements = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">↕ Auditoría y Movimientos de Stock (Kardex)</h1>
          <p className="text-muted mb-0 small">Control y trazabilidad de existencias, ajustes de inventario y auditoría operativa</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 rounded-2"
          onClick={exportCSV}
        >
          <Download size={14} />
          <span>Exportar Kardex CSV</span>
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      {/* Barra de Filtros del Kardex */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3 d-flex flex-wrap gap-2.5 align-items-end">
          <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 300 }}>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Buscar Producto
            </label>
            <div className="position-relative">
              <Search size={14} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 10 }} />
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                value={fProd}
                onChange={e => setFProd(e.target.value)}
                placeholder="Nombre o SKU..."
              />
            </div>
          </div>

          <div>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Tipo
            </label>
            <select
              className="form-select form-select-sm"
              value={fTipo}
              onChange={e => setFTipo(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="">Todos los tipos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>

          <div>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Desde
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fFrom}
              onChange={e => setFFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Hasta
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fTo}
              onChange={e => setFTo(e.target.value)}
            />
          </div>

          {(fTipo || fProd || fFrom || fTo) && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-2"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          )}

          <div className="ms-auto text-muted small fw-medium">
            <span>{filtered.length} movimientos registrados</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Formulario de Asiento / Ajuste */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <Sliders size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Registrar Movimiento / Ajuste</span>
            </div>
            <div className="card-body p-3 p-sm-4">
              <form onSubmit={handleRegisterMovement}>
                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Tipo de Movimiento
                  </label>
                  <div className="btn-group w-100" role="group">
                    {(['entrada', 'ajuste', 'salida'] as TipoMovimiento[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`btn btn-sm ${adjTipo === t ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setAdjTipo(t)}
                      >
                        {t === 'entrada' && <ArrowUpRight size={13} className="me-1" />}
                        {t === 'salida' && <ArrowDownRight size={13} className="me-1" />}
                        {t === 'ajuste' && <ArrowLeftRight size={13} className="me-1" />}
                        <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Producto *
                  </label>
                  <select
                    className="form-select"
                    value={adjProdId}
                    onChange={e => setAdjProdId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione un producto</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock actual: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Cantidad Unitaria *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={adjCant}
                    min="1"
                    onChange={e => setAdjCant(e.target.value)}
                    placeholder="Unidades"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Justificación / Motivo *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={adjMotivo}
                    onChange={e => setAdjMotivo(e.target.value)}
                    placeholder="Ejemplo: Conteo físico, merma, ingreso inicial..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                  disabled={adjLoading}
                >
                  <ArrowLeftRight size={16} />
                  <span>{adjLoading ? 'Asentando en Kardex...' : 'Asentar Movimiento'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Tabla Kardex de Auditoría */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">
                  Libro Diario de Kardex ({filtered.length})
                </span>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-center">Variación</th>
                    <th>Justificación</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMovements.map(m => (
                    <tr key={m.id}>
                      <td className="text-muted small">{formatDateTime(m.fechaMovimiento || m.fecha_movimiento)}</td>
                      <td className="fw-semibold small text-dark">{m.productoNombre || m.producto_nombre || `Ítem #${m.productoId}`}</td>
                      <td>
                        <span
                          className={`badge py-1 px-2.5 rounded-pill ${
                            m.tipo === 'entrada'
                              ? 'badge-soft-success'
                              : m.tipo === 'salida'
                              ? 'badge-soft-danger'
                              : 'badge-soft-warning'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="text-center small fw-bold">
                        <span className={m.tipo === 'salida' ? 'text-danger' : m.tipo === 'entrada' ? 'text-success' : 'text-primary'}>
                          {m.tipo === 'salida' ? `-${m.cantidad}` : `+${m.cantidad}`}
                        </span>
                      </td>
                      <td className="text-muted small text-truncate" style={{ maxWidth: 160 }} title={m.motivo || ''}>
                        {m.motivo || '—'}
                      </td>
                      <td className="text-muted small">
                        {m.usuarioNombre || m.usuario_nombre || 'Sistema'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted text-center py-4 small">
                        No se registran movimientos para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="card-footer bg-white py-3 border-top d-flex justify-content-between align-items-center">
                <span className="small text-muted">
                  Página {page} de {totalPages}
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
