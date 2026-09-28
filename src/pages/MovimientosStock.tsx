import { useState, useEffect, type FormEvent } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getMovements, createMovement } from '../services/movimientoService';
import type { ProductoDB } from '../types/producto';
import type { MovimientoStockDB, TipoMovimiento } from '../types/movimiento';
import Loader from '../components/feedback/Loader';
import { formatDateTime } from '../utils/formatters';

const PAGE_SIZE = 12;

export default function MovimientosStock() {
  const { session } = useAuth();
  const [products, setProducts]   = useState<ProductoDB[]>([]);
  const [movements, setMovements] = useState<MovimientoStockDB[]>([]);
  const [filtered, setFiltered]   = useState<MovimientoStockDB[]>([]);
  const [loading, setLoading]     = useState(true);

  const [adjProdId, setAdjProdId]   = useState('');
  const [adjTipo, setAdjTipo]       = useState<TipoMovimiento>('ajuste');
  const [adjCant, setAdjCant]       = useState('');
  const [adjMotivo, setAdjMotivo]   = useState('');
  const [adjLoading, setAdjLoading] = useState(false);

  const [fTipo, setFTipo] = useState('');
  const [page, setPage]   = useState(1);
  const [msg, setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  useEffect(() => {
    Promise.all([getProducts(), getMovements()])
      .then(([p, m]) => {
        setProducts(p);
        setMovements(m);
        setFiltered(m);
      })
      .finally(() => setLoading(false));
  }, []);

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
      setFiltered(fTipo ? updated.filter(m => m.tipo === fTipo) : updated);

      setAdjProdId('');
      setAdjCant('');
      setAdjMotivo('');
      setAdjTipo('ajuste');
      showNotification('Movimiento de almacén registrado con éxito.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Error al asentar el movimiento en el sistema.', 'danger');
    } finally {
      setAdjLoading(false);
    }
  };

  const handleFilterChange = (tipo: string) => {
    setFTipo(tipo);
    if (!tipo) {
      setFiltered(movements);
    } else {
      setFiltered(movements.filter(m => m.tipo === tipo));
    }
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedMovements = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Movimientos de Stock</h1>
          <p className="text-muted mb-0 small">Kardex de existencias, ajustes de inventario y trazabilidad</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <Sliders size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Registrar Ajuste / Movimiento</span>
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
                        {p.nombre} (Stock: {p.stock})
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
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Justificación / Motivo *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={adjMotivo}
                    onChange={e => setAdjMotivo(e.target.value)}
                    placeholder="Ejemplo: Conteo físico periódico..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                  disabled={adjLoading}
                >
                  <ArrowLeftRight size={16} />
                  <span>{adjLoading ? 'Procesando...' : 'Asentar Movimiento'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Historial Kardex */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">
                  Libro de Movimientos ({filtered.length})
                </span>
              </div>
              <select
                className="form-select form-select-sm"
                value={fTipo}
                onChange={e => handleFilterChange(e.target.value)}
                style={{ maxWidth: 160 }}
              >
                <option value="">Todos los tipos</option>
                <option value="entrada">Entradas</option>
                <option value="salida">Salidas</option>
                <option value="ajuste">Ajustes</option>
              </select>
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
                  </tr>
                </thead>
                <tbody>
                  {pagedMovements.map(m => (
                    <tr key={m.id}>
                      <td className="text-muted small">{formatDateTime(m.fecha_movimiento)}</td>
                      <td className="fw-semibold small text-dark">{m.productos?.nombre || `Ítem #${m.producto_id}`}</td>
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
                          {m.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-center fw-bold small text-dark">
                        {m.tipo === 'salida' ? `-${m.cantidad}` : `+${m.cantidad}`}
                      </td>
                      <td className="text-muted small">{m.motivo || '—'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-5 small">
                        No hay movimientos registrados para el filtro seleccionado.
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
        </div>
      </div>
    </>
  );
}
