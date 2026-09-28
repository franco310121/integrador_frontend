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
  Download,
  RotateCcw,
  ShoppingCart,
  Receipt,
  Package,
  Layers,
  TrendingDown,
  TrendingUp
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
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [movements, setMovements] = useState<MovimientoStockDB[]>([]);
  const [filtered, setFiltered] = useState<MovimientoStockDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de ajuste manual
  const [adjProdId, setAdjProdId] = useState('');
  const [adjTipo, setAdjTipo] = useState<TipoMovimiento>('ajuste');
  const [adjCant, setAdjCant] = useState('');
  const [adjMotivo, setAdjMotivo] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  // Filtros del historial
  const [fTipo, setFTipo] = useState('');
  const [fProd, setFProd] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
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
      list = list.filter((m) => {
        const t = (m.tipo || '').toLowerCase();
        if (fTipo === 'venta') return t === 'venta' || t === 'salida';
        if (fTipo === 'compra') return t === 'compra' || t === 'entrada';
        if (fTipo === 'devolucion') return t === 'devolucion';
        if (fTipo === 'ajuste') return t === 'ajuste';
        return t === fTipo;
      });
    }
    if (fProd.trim()) {
      const q = fProd.toLowerCase();
      list = list.filter(
        (m) =>
          (m.productoNombre || m.producto_nombre || '').toLowerCase().includes(q) ||
          (m.sku || '').toLowerCase().includes(q)
      );
    }
    if (fFrom) {
      list = list.filter((m) => {
        const fecha = (m.fechaMovimiento || m.fecha_movimiento || '').slice(0, 10);
        return fecha >= fFrom;
      });
    }
    if (fTo) {
      list = list.filter((m) => {
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
    setTimeout(() => setMsg(''), 4000);
  };

  const handleRegisterMovement = async (e: FormEvent) => {
    e.preventDefault();
    const cant = parseInt(adjCant, 10);
    if (!adjProdId) {
      showNotification('Seleccione un producto para registrar el movimiento.', 'danger');
      return;
    }
    if (isNaN(cant) || cant <= 0) {
      showNotification('La cantidad debe ser un número entero mayor a 0.', 'danger');
      return;
    }
    if (!adjMotivo.trim()) {
      showNotification('Ingrese la justificación u origen del movimiento.', 'danger');
      return;
    }

    setAdjLoading(true);
    try {
      const createdMovement = await createMovement({
        producto_id: Number(adjProdId),
        tipo: adjTipo,
        cantidad: cant,
        motivo: adjMotivo.trim(),
      });

      const delta = adjTipo === 'salida' ? -cant : cant;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === Number(adjProdId) ? { ...p, stock: Number(p.stock || 0) + delta } : p
        )
      );

      setMovements((prev) => [createdMovement, ...prev]);
      notifyStockUpdated();

      setAdjProdId('');
      setAdjCant('');
      setAdjMotivo('');
      setAdjTipo('ajuste');
      showNotification('✔ Movimiento registrado en Kardex con éxito.', 'success');
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
    const headers = ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'De Donde (Origen)', 'Responsable'];
    const rows = filtered.map((m) => {
      const t = (m.tipo || '').toLowerCase();
      const isVenta = t === 'venta' || t === 'salida' || m.cantidad < 0;
      const signoCant = isVenta ? `-${Math.abs(m.cantidad)}` : `+${Math.abs(m.cantidad)}`;
      return `"${m.id}","${m.fechaMovimiento || m.fecha_movimiento || ''}","${
        m.productoNombre || m.producto_nombre || ''
      }","${m.tipo}","${signoCant}","${m.deDonde || m.motivo || ''}","${
        m.usuarioNombre || m.usuario_nombre || 'Sistema'
      }"`;
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kardex_movimientos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Ayudante para renderizar el tipo de movimiento
  const renderTipoBadge = (tipo: string) => {
    const t = (tipo || '').toLowerCase();
    if (t === 'venta' || t === 'salida') {
      return (
        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1">
          <ArrowDownRight size={13} />
          <span>Venta</span>
        </span>
      );
    }
    if (t === 'compra' || t === 'entrada') {
      return (
        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1">
          <ArrowUpRight size={13} />
          <span>Compra</span>
        </span>
      );
    }
    if (t === 'devolucion') {
      return (
        <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1">
          <RotateCcw size={13} />
          <span>Devolución</span>
        </span>
      );
    }
    return (
      <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1">
        <ArrowLeftRight size={13} />
        <span>Ajuste</span>
      </span>
    );
  };

  // Ayudante para renderizar cantidad: si es venta '-' y si es devolucion o compra '+'
  const renderCantidad = (m: MovimientoStockDB) => {
    const t = (m.tipo || '').toLowerCase();
    const rawCant = m.cantidad;
    const isVenta = t === 'venta' || t === 'salida' || rawCant < 0;
    const absCant = Math.abs(rawCant);

    if (isVenta) {
      return (
        <span className="fw-bold text-danger fs-6 font-monospace">
          -{absCant}
        </span>
      );
    }
    return (
      <span className="fw-bold text-success fs-6 font-monospace">
        +{absCant}
      </span>
    );
  };

  // Métricas
  const totalVentasUnits = movements
    .filter((m) => {
      const t = (m.tipo || '').toLowerCase();
      return t === 'venta' || t === 'salida' || m.cantidad < 0;
    })
    .reduce((acc, m) => acc + Math.abs(m.cantidad), 0);

  const totalComprasUnits = movements
    .filter((m) => {
      const t = (m.tipo || '').toLowerCase();
      return t === 'compra' || t === 'entrada';
    })
    .reduce((acc, m) => acc + Math.abs(m.cantidad), 0);

  const totalDevolucionesUnits = movements
    .filter((m) => (m.tipo || '').toLowerCase() === 'devolucion')
    .reduce((acc, m) => acc + Math.abs(m.cantidad), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedMovements = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loader message="Cargando trazabilidad de movimientos (Kardex)..." />;

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Encabezado */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
            <ArrowLeftRight className="text-primary" size={24} />
            Movimientos de Stock (Kardex)
          </h1>
          <p className="text-muted mb-0 small">
            Trazabilidad automática de compras (+), ventas (-) y devoluciones (+) con referencia de origen.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 rounded-3 shadow-sm"
          onClick={exportCSV}
        >
          <Download size={14} />
          <span>Exportar Kardex CSV</span>
        </button>
      </div>

      {msg && (
        <div
          className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2`}
        >
          {msgType === 'success' ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <AlertCircle size={16} className="text-danger" />
          )}
          <span>{msg}</span>
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted small fw-semibold">Ventas Totales</span>
              <div className="p-2 bg-danger bg-opacity-10 text-danger rounded-3">
                <TrendingDown size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-danger mb-0 font-monospace">-{totalVentasUnits}</div>
            <small className="text-muted">Unidades despachadas</small>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted small fw-semibold">Compras Totales</span>
              <div className="p-2 bg-success bg-opacity-10 text-success rounded-3">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-success mb-0 font-monospace">+{totalComprasUnits}</div>
            <small className="text-muted">Unidades abastecidas</small>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted small fw-semibold">Devoluciones</span>
              <div className="p-2 bg-info bg-opacity-10 text-info rounded-3">
                <RotateCcw size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-info mb-0 font-monospace">+{totalDevolucionesUnits}</div>
            <small className="text-muted">Unidades reingresadas</small>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="text-muted small fw-semibold">Total Asientos</span>
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                <BookOpen size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-dark mb-0 font-monospace">{movements.length}</div>
            <small className="text-muted">Registros en el Kardex</small>
          </div>
        </div>
      </div>

      {/* Barra de Filtros del Kardex */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
        <div className="card-body p-3 d-flex flex-wrap gap-2.5 align-items-end">
          <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 300 }}>
            <label
              className="form-label small text-muted text-uppercase fw-semibold mb-1"
              style={{ fontSize: '.7rem' }}
            >
              Buscar Producto
            </label>
            <div className="position-relative">
              <Search
                size={14}
                className="position-absolute text-muted"
                style={{ top: '50%', transform: 'translateY(-50%)', left: 10 }}
              />
              <input
                type="text"
                className="form-control form-control-sm ps-4 bg-light"
                value={fProd}
                onChange={(e) => setFProd(e.target.value)}
                placeholder="Nombre o SKU del producto..."
              />
            </div>
          </div>

          <div>
            <label
              className="form-label small text-muted text-uppercase fw-semibold mb-1"
              style={{ fontSize: '.7rem' }}
            >
              Operación
            </label>
            <select
              className="form-select form-select-sm bg-light"
              value={fTipo}
              onChange={(e) => setFTipo(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">Todas las Operaciones</option>
              <option value="venta">Ventas (-)</option>
              <option value="compra">Compras (+)</option>
              <option value="devolucion">Devoluciones (+)</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>

          <div>
            <label
              className="form-label small text-muted text-uppercase fw-semibold mb-1"
              style={{ fontSize: '.7rem' }}
            >
              Desde
            </label>
            <input
              type="date"
              className="form-control form-control-sm bg-light"
              value={fFrom}
              onChange={(e) => setFFrom(e.target.value)}
            />
          </div>

          <div>
            <label
              className="form-label small text-muted text-uppercase fw-semibold mb-1"
              style={{ fontSize: '.7rem' }}
            >
              Hasta
            </label>
            <input
              type="date"
              className="form-control form-control-sm bg-light"
              value={fTo}
              onChange={(e) => setFTo(e.target.value)}
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
            <span>{filtered.length} movimientos filtrados</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Formulario de Ajuste Manual */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-3 p-sm-4">
            <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
              <Sliders size={18} className="text-primary" />
              <h6 className="fw-bold text-dark mb-0">Registrar Ajuste Manual</h6>
            </div>

            <form onSubmit={handleRegisterMovement}>
              <div className="mb-3">
                <label
                  className="form-label small text-muted text-uppercase fw-semibold"
                  style={{ fontSize: '.7rem' }}
                >
                  Tipo de Operación Manual
                </label>
                <div className="btn-group w-100" role="group">
                  {(['entrada', 'salida', 'ajuste'] as TipoMovimiento[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn btn-sm ${
                        adjTipo === t ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
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
                <label
                  className="form-label small text-muted text-uppercase fw-semibold"
                  style={{ fontSize: '.7rem' }}
                >
                  Producto *
                </label>
                <select
                  className="form-select form-select-sm"
                  value={adjProdId}
                  onChange={(e) => setAdjProdId(e.target.value)}
                  required
                >
                  <option value="">Seleccione un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label
                  className="form-label small text-muted text-uppercase fw-semibold"
                  style={{ fontSize: '.7rem' }}
                >
                  Cantidad Unitaria *
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={adjCant}
                  min="1"
                  onChange={(e) => setAdjCant(e.target.value)}
                  placeholder="Unidades"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  className="form-label small text-muted text-uppercase fw-semibold"
                  style={{ fontSize: '.7rem' }}
                >
                  De Dónde / Justificación *
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={adjMotivo}
                  onChange={(e) => setAdjMotivo(e.target.value)}
                  placeholder="Ejemplo: Conteo físico, descarte de merma, regularización..."
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                disabled={adjLoading}
              >
                <ArrowLeftRight size={16} />
                <span>{adjLoading ? 'Asentando en Kardex...' : 'Asentar Movimiento'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Tabla Kardex: Producto, De Dónde, Tipo Operación y Cantidad (+ / -) */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">
                  Libro de Movimientos ({filtered.length})
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th className="ps-3 py-3">Fecha y Hora</th>
                    <th>Producto</th>
                    <th>Operación</th>
                    <th>De Dónde (Origen)</th>
                    <th className="text-center">Cantidad</th>
                    <th className="pe-3">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMovements.map((m) => (
                    <tr key={m.id}>
                      <td className="ps-3 text-muted small">
                        {formatDateTime(m.fechaMovimiento || m.fecha_movimiento)}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">
                          {m.productoNombre || m.producto_nombre || `Producto #${m.productoId}`}
                        </div>
                        {m.sku && <small className="text-muted">SKU: {m.sku}</small>}
                      </td>
                      <td>{renderTipoBadge(m.tipo)}</td>
                      <td
                        className="small text-muted text-truncate"
                        style={{ maxWidth: 200 }}
                        title={m.deDonde || m.motivo || ''}
                      >
                        {m.deDonde || m.motivo || 'Operación directa'}
                      </td>
                      <td className="text-center">{renderCantidad(m)}</td>
                      <td className="pe-3 text-muted small">
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
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
