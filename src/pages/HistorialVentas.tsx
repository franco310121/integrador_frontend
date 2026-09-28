import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Printer,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { getSales, anularSale } from '../services/ventaService';
import type { VentaDB } from '../types/venta';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

export default function HistorialVentas() {
  const [sales, setSales] = useState<VentaDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');

  // Modales
  const [selectedReceipt, setSelectedReceipt] = useState<VentaDB | null>(null);
  const [annulTarget, setAnnulTarget] = useState<VentaDB | null>(null);
  const [annulLoading, setAnnulLoading] = useState(false);

  // Feedback
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4500);
  };

  const loadData = async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch {
      showNotification('Error al cargar el historial de comprobantes.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAnnulSale = async () => {
    if (!annulTarget?.id) return;
    setAnnulLoading(true);
    try {
      await anularSale(annulTarget.id);
      showNotification(`Comprobante ${annulTarget.numeroBoleta} anulado correctamente. Stock restaurado al Kardex.`);
      setAnnulTarget(null);
      if (selectedReceipt?.id === annulTarget.id) {
        setSelectedReceipt(null);
      }
      notifyStockUpdated();
      await loadData();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || err?.message || 'Error al anular comprobante', 'danger');
    } finally {
      setAnnulLoading(false);
    }
  };

  // Filtrado de ventas
  const filteredSales = sales.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (s.numeroBoleta && s.numeroBoleta.toLowerCase().includes(q)) ||
      (s.cliente && s.cliente.toLowerCase().includes(q));

    const matchesEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'completada' && (s.estado === 'completada' || !s.estado)) ||
      (filterEstado === 'anulada' && s.estado === 'anulada');

    let matchesFecha = true;
    if (filterDesde && s.fechaVenta) {
      matchesFecha = matchesFecha && new Date(s.fechaVenta) >= new Date(filterDesde + 'T00:00:00');
    }
    if (filterHasta && s.fechaVenta) {
      matchesFecha = matchesFecha && new Date(s.fechaVenta) <= new Date(filterHasta + 'T23:59:59');
    }

    return matchesSearch && matchesEstado && matchesFecha;
  });

  // Métricas
  const totalCompletadas = sales.filter(s => s.estado !== 'anulada');
  const sumTotalEmitido = totalCompletadas.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalAnuladas = sales.filter(s => s.estado === 'anulada').length;
  const ticketPromedio = totalCompletadas.length > 0 ? sumTotalEmitido / totalCompletadas.length : 0;

  if (loading) {
    return <Loader message="Cargando historial de comprobantes..." />;
  }

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Notificación flotante */}
      {msg && (
        <div
          className={`alert alert-${msgType} d-flex align-items-center gap-2 shadow-sm rounded-3 mb-4`}
          role="alert"
        >
          {msgType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div className="flex-grow-1 small fw-semibold">{msg}</div>
          <button
            type="button"
            className="btn-close btn-sm shadow-none"
            onClick={() => setMsg('')}
            aria-label="Cerrar"
          />
        </div>
      )}

      {/* Encabezado y Navegación rápida */}
      <div className="d-flex flex-column flex-md-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 d-flex align-items-center gap-2">
            <Receipt className="text-primary" size={28} />
            Historial de Comprobantes
          </h1>
          <p className="text-muted small mb-0">
            Registro cronológico, auditoría de boletas emitidas y control de anulaciones.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/ventas" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
            <DollarSign size={16} />
            <span>Nueva Venta (POS)</span>
          </Link>
          <Link to="/devoluciones" className="btn btn-outline-secondary d-flex align-items-center gap-2">
            <RotateCcw size={16} />
            <span>Devoluciones</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">Total Facturado</span>
              <div className="p-2 bg-success bg-opacity-10 text-success rounded-3">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-dark mb-1">{formatCurrency(sumTotalEmitido)}</div>
            <div className="small text-muted">{totalCompletadas.length} comprobantes válidos</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">Comprobantes Emitidos</span>
              <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                <Receipt size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-dark mb-1">{sales.length}</div>
            <div className="small text-muted">{totalAnuladas} anulaciones registradas</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">Ticket Promedio</span>
              <div className="p-2 bg-info bg-opacity-10 text-info rounded-3">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-dark mb-1">{formatCurrency(ticketPromedio)}</div>
            <div className="small text-muted">Por comprobante efectivo</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">Tasa de Anulaciones</span>
              <div className="p-2 bg-danger bg-opacity-10 text-danger rounded-3">
                <RotateCcw size={18} />
              </div>
            </div>
            <div className="h4 fw-bold text-dark mb-1">
              {sales.length > 0 ? ((totalAnuladas / sales.length) * 100).toFixed(1) + '%' : '0.0%'}
            </div>
            <div className="small text-muted">{totalAnuladas} reversiones al Kardex</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Buscar por N° comprobante o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select bg-light"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="todos">Todos los Estados</option>
              <option value="completada">Completadas</option>
              <option value="anulada">Anuladas</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <input
              type="date"
              className="form-control bg-light"
              value={filterDesde}
              onChange={(e) => setFilterDesde(e.target.value)}
              title="Fecha desde"
            />
          </div>

          <div className="col-6 col-md-2">
            <input
              type="date"
              className="form-control bg-light"
              value={filterHasta}
              onChange={(e) => setFilterHasta(e.target.value)}
              title="Fecha hasta"
            />
          </div>

          <div className="col-6 col-md-1">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setSearchTerm('');
                setFilterEstado('todos');
                setFilterDesde('');
                setFilterHasta('');
              }}
              title="Limpiar filtros"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Comprobantes */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-muted small text-uppercase">
                <th className="ps-3 py-3">Comprobante</th>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Método Pago</th>
                <th className="text-end">Subtotal</th>
                <th className="text-end">IGV (18%)</th>
                <th className="text-end">Total</th>
                <th className="text-center">Estado</th>
                <th className="text-end pe-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    <Receipt size={40} className="mb-2 text-muted opacity-50 d-block mx-auto" />
                    <p className="mb-1 fw-semibold">No se encontraron comprobantes emitidos</p>
                    <small>Realiza una venta en el POS para generar tu primer comprobante.</small>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isAnulada = sale.estado === 'anulada';
                  return (
                    <tr key={sale.id} className={isAnulada ? 'opacity-75 bg-light' : ''}>
                      <td className="ps-3 py-3">
                        <span className="badge bg-dark bg-opacity-10 text-dark fw-bold px-2 py-1 font-monospace">
                          {sale.numeroBoleta}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {sale.fechaVenta ? formatDateTime(sale.fechaVenta) : '—'}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{sale.cliente}</div>
                        {sale.vendedorNombre && (
                          <div className="text-muted small" style={{ fontSize: '.75rem' }}>
                            Por: {sale.vendedorNombre}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          {sale.metodoPagoNombre || sale.metodoPago || 'Efectivo'}
                        </span>
                      </td>
                      <td className="text-end small text-muted">
                        {formatCurrency(sale.subtotal)}
                      </td>
                      <td className="text-end small text-muted">
                        {formatCurrency(sale.igv || 0)}
                      </td>
                      <td className="text-end fw-bold text-dark">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="text-center">
                        {isAnulada ? (
                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                            Anulada
                          </span>
                        ) : (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                            Completada
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => setSelectedReceipt(sale)}
                            title="Ver Comprobante Completo"
                          >
                            <Eye size={15} />
                          </button>
                          {!isAnulada && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => setAnnulTarget(sale)}
                              title="Anular comprobante y devolver stock"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE COMPROBANTE */}
      {selectedReceipt && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <Receipt size={20} className="text-warning" />
                  <h5 className="modal-title fw-bold mb-0">
                    Comprobante Electrónico {selectedReceipt.numeroBoleta}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white shadow-none"
                  onClick={() => setSelectedReceipt(null)}
                />
              </div>

              <div className="modal-body p-4 bg-light">
                {/* Cabecera del ticket */}
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-3">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="h5 fw-bold text-dark mb-1">
                        Stock<span className="text-warning">Master</span> Enterprise
                      </div>
                      <div className="text-muted small">RUC: 20601234567</div>
                      <div className="text-muted small">Av. Javier Prado Este 450, Lima, Perú</div>
                      <div className="text-muted small">Teléfono: (01) 456-7890</div>
                    </div>
                    <div className="col-12 col-md-6 text-md-end">
                      <div className="badge bg-secondary bg-opacity-10 text-dark border px-3 py-2 fs-6 font-monospace mb-2">
                        {selectedReceipt.numeroBoleta}
                      </div>
                      <div className="small text-muted">
                        Fecha: {selectedReceipt.fechaVenta ? formatDateTime(selectedReceipt.fechaVenta) : '—'}
                      </div>
                      <div className="small text-muted">
                        Estado:{' '}
                        <strong className={selectedReceipt.estado === 'anulada' ? 'text-danger' : 'text-success'}>
                          {(selectedReceipt.estado || 'completada').toUpperCase()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3 opacity-25" />

                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted">Cliente: </span>
                      <strong className="text-dark">{selectedReceipt.cliente}</strong>
                    </div>
                    <div className="col-6 text-end">
                      <span className="text-muted">Forma de Pago: </span>
                      <span className="badge bg-light text-dark border">
                        {selectedReceipt.metodoPagoNombre || selectedReceipt.metodoPago || 'Efectivo'}
                      </span>
                    </div>
                    {selectedReceipt.vendedorNombre && (
                      <div className="col-12">
                        <span className="text-muted">Atendido por: </span>
                        <span className="text-dark">{selectedReceipt.vendedorNombre}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de ítems vendidos */}
                <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr className="small text-muted">
                        <th className="ps-3 py-2">Ítem / Producto</th>
                        <th className="text-center">Cant.</th>
                        <th className="text-end">P. Unit.</th>
                        <th className="text-end pe-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                        selectedReceipt.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <div className="fw-semibold text-dark">{it.productoNombre}</div>
                              {it.sku && <small className="text-muted">SKU: {it.sku}</small>}
                            </td>
                            <td className="text-center fw-bold">{it.cantidad}</td>
                            <td className="text-end text-muted">{formatCurrency(it.precioUnitario)}</td>
                            <td className="text-end pe-3 fw-semibold">{formatCurrency(it.subtotal)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-3 text-muted">
                            Detalle consolidado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white ms-auto" style={{ maxWidth: 320 }}>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Subtotal Gravado:</span>
                    <span>{formatCurrency(selectedReceipt.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>IGV (18%):</span>
                    <span>{formatCurrency(selectedReceipt.igv || 0)}</span>
                  </div>
                  {Number(selectedReceipt.descuento || 0) > 0 && (
                    <div className="d-flex justify-content-between small text-danger mb-1">
                      <span>Descuento aplicado:</span>
                      <span>-{formatCurrency(selectedReceipt.descuento)}</span>
                    </div>
                  )}
                  <hr className="my-2 opacity-25" />
                  <div className="d-flex justify-content-between h5 fw-bold text-dark mb-0">
                    <span>Total Pagado:</span>
                    <span className="text-success">{formatCurrency(selectedReceipt.total)}</span>
                  </div>
                </div>

                {selectedReceipt.observaciones && (
                  <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mt-3 small text-muted">
                    <strong>Observaciones:</strong> {selectedReceipt.observaciones}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-white border-top-0 d-flex justify-content-between">
                <div>
                  {selectedReceipt.estado !== 'anulada' && (
                    <Link
                      to="/devoluciones"
                      className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
                      onClick={() => setSelectedReceipt(null)}
                    >
                      <RotateCcw size={14} />
                      <span>Procesar Devolución</span>
                    </Link>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} />
                    <span>Imprimir Ticket</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedReceipt(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
      {annulTarget && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-danger text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <AlertCircle size={20} />
                  <h5 className="modal-title fw-bold mb-0">Confirmar Anulación de Comprobante</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white shadow-none"
                  onClick={() => setAnnulTarget(null)}
                />
              </div>

              <div className="modal-body p-4 text-center">
                <p className="lead fw-semibold mb-2">
                  ¿Estás seguro de anular el comprobante{' '}
                  <span className="font-monospace text-danger">{annulTarget.numeroBoleta}</span>?
                </p>
                <p className="text-muted small mb-3">
                  Cliente: <strong>{annulTarget.cliente}</strong> &bull; Total:{' '}
                  <strong>{formatCurrency(annulTarget.total)}</strong>
                </p>

                <div className="alert alert-warning text-start small mb-0 d-flex gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Impacto en Kardex:</strong> Todos los productos incluidos en esta boleta serán
                    reingresados inmediatamente al stock con un movimiento de auditoría tipo <em>Entrada</em>.
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light border-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={annulLoading}
                  onClick={() => setAnnulTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-flex align-items-center gap-2"
                  disabled={annulLoading}
                  onClick={handleAnnulSale}
                >
                  {annulLoading && <span className="spinner-border spinner-border-sm" />}
                  <span>Confirmar y Revertir Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
