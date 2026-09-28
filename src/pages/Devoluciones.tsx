import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  FileText,
  DollarSign,
  ArrowRight,
  Eye,
  X,
  TrendingDown,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { getDevoluciones, createDevolucion } from '../services/devolucionService';
import { getSales } from '../services/ventaService';
import type { DevolucionDB } from '../types/devolucion';
import type { VentaDB } from '../types/venta';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<DevolucionDB[]>([]);
  const [sales, setSales] = useState<VentaDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Pestaña activa: 'nueva' (flujo de registro) o 'historial' (listado)
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva');

  // Estados del flujo de registro
  const [searchBoleta, setSearchBoleta] = useState('');
  const [selectedSale, setSelectedSale] = useState<VentaDB | null>(null);
  const [motivo, setMotivo] = useState('Producto defectuoso / rotura');
  const [destinoStock, setDestinoStock] = useState<'reingreso' | 'merma'>('reingreso');
  const [metodoReembolso, setMetodoReembolso] = useState<'efectivo' | 'transferencia' | 'nota_credito'>('efectivo');
  const [observaciones, setObservaciones] = useState('');

  // Ítems a devolver
  const [returnItems, setReturnItems] = useState<{
    productoId: number;
    productoNombre: string;
    sku?: string | null;
    cantidadOriginal: number;
    cantidadDevolver: number;
    precioUnitario: number;
    selected: boolean;
  }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [modalDevolucion, setModalDevolucion] = useState<DevolucionDB | null>(null);

  // Feedback flotante
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4500);
  };

  const loadData = async () => {
    try {
      const [devList, salesList] = await Promise.all([getDevoluciones(), getSales()]);
      setDevoluciones(devList);
      setSales(salesList.filter(s => s.estado !== 'anulada'));
    } catch {
      showNotification('Error al cargar datos de devoluciones y ventas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Seleccionar comprobante para devolver
  const handleSelectSale = (sale: VentaDB) => {
    setSelectedSale(sale);
    if (sale.items && sale.items.length > 0) {
      setReturnItems(
        sale.items.map((it) => ({
          productoId: it.productoId,
          productoNombre: it.productoNombre,
          sku: it.sku,
          cantidadOriginal: it.cantidad,
          cantidadDevolver: 1,
          precioUnitario: it.precioUnitario,
          selected: true,
        }))
      );
    } else {
      setReturnItems([]);
    }
  };

  const handleToggleItem = (prodId: number) => {
    setReturnItems((prev) =>
      prev.map((it) => (it.productoId === prodId ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleUpdateItemQty = (prodId: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((it) => {
        if (it.productoId !== prodId) return it;
        const validQty = Math.max(1, Math.min(it.cantidadOriginal, qty));
        return { ...it, cantidadDevolver: validQty };
      })
    );
  };

  // Cálculo de reembolso total
  const selectedItemsToReturn = returnItems.filter((it) => it.selected);
  const totalReembolso = selectedItemsToReturn.reduce(
    (acc, it) => acc + it.cantidadDevolver * it.precioUnitario,
    0
  );

  const handleSubmitDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale?.id) {
      showNotification('Por favor selecciona una venta válida.', 'danger');
      return;
    }

    if (selectedItemsToReturn.length === 0) {
      showNotification('Selecciona al menos un producto para procesar la devolución.', 'danger');
      return;
    }

    if (!motivo.trim()) {
      showNotification('El motivo de la devolución es obligatorio.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ventaId: selectedSale.id,
        motivo: motivo.trim(),
        destinoStock,
        metodoReembolso,
        observaciones: observaciones.trim() || undefined,
        items: selectedItemsToReturn.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidadDevolver,
          precioUnitario: it.precioUnitario,
        })),
      };

      const result = await createDevolucion(payload);
      showNotification(`Devolución ${result.numeroDevolucion} registrada con éxito. Trazabilidad guardada en Kardex.`);
      setModalDevolucion(result);

      // Limpiar formulario
      setSelectedSale(null);
      setReturnItems([]);
      setSearchBoleta('');
      setObservaciones('');

      notifyStockUpdated();
      await loadData();
    } catch (err: any) {
      showNotification(
        err?.response?.data?.message || err?.message || 'Error al procesar la devolución',
        'danger'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Ventas coincidentes con la búsqueda
  const matchedSales = sales.filter((s) => {
    if (!searchBoleta.trim()) return true;
    const q = searchBoleta.toLowerCase();
    return (
      (s.numeroBoleta && s.numeroBoleta.toLowerCase().includes(q)) ||
      (s.cliente && s.cliente.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <Loader message="Cargando módulo de devoluciones..." />;
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

      {/* Encabezado */}
      <div className="d-flex flex-column flex-md-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 d-flex align-items-center gap-2">
            <RotateCcw className="text-warning" size={28} />
            Gestión de Devoluciones
          </h1>
          <p className="text-muted small mb-0">
            Reingreso a inventario o registro de merma con trazabilidad completa en Kardex.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/ventas" className="btn btn-outline-primary d-flex align-items-center gap-1.5">
            <DollarSign size={16} />
            <span>Punto de Venta</span>
          </Link>
          <Link to="/comprobantes" className="btn btn-outline-secondary d-flex align-items-center gap-1.5">
            <Receipt size={16} />
            <span>Historial Comprobantes</span>
          </Link>
        </div>
      </div>

      {/* Pestañas Superiores */}
      <div className="d-flex gap-2 border-bottom mb-4 pb-2">
        <button
          type="button"
          className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-3 ${
            activeTab === 'nueva' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
          }`}
          onClick={() => setActiveTab('nueva')}
        >
          <RotateCcw size={16} />
          <span>Procesar Nueva Devolución</span>
        </button>

        <button
          type="button"
          className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-3 ${
            activeTab === 'historial' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
          }`}
          onClick={() => setActiveTab('historial')}
        >
          <FileText size={16} />
          <span>Historial de Devoluciones ({devoluciones.length})</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA: NUEVA DEVOLUCIÓN */}
      {activeTab === 'nueva' && (
        <div className="row g-4">
          {/* PASO 1: SELECCIONAR VENTA ORIGINAL */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">Paso 1</span>
                  <h6 className="fw-bold mb-0">Seleccionar Comprobante</h6>
                </div>
                <small className="text-muted">{matchedSales.length} disponibles</small>
              </div>

              <div className="input-group mb-3">
                <span className="input-group-text bg-light border-end-0">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Buscar boleta (ej. B2026...) o cliente..."
                  value={searchBoleta}
                  onChange={(e) => setSearchBoleta(e.target.value)}
                />
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '550px' }}>
                {matchedSales.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    No se encontraron comprobantes activos para devolver.
                  </div>
                ) : (
                  matchedSales.slice(0, 15).map((sale) => {
                    const isSelected = selectedSale?.id === sale.id;
                    return (
                      <div
                        key={sale.id}
                        className={`card mb-2 p-2.5 border rounded-3 transition-all cursor-pointer ${
                          isSelected ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-light hover-bg-white'
                        }`}
                        onClick={() => handleSelectSale(sale)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="badge bg-dark bg-opacity-10 text-dark fw-bold font-monospace">
                            {sale.numeroBoleta}
                          </span>
                          <span className="fw-bold text-success small">{formatCurrency(sale.total)}</span>
                        </div>
                        <div className="mt-1 d-flex justify-content-between small text-muted">
                          <span>{sale.cliente}</span>
                          <span>{sale.fechaVenta ? formatDateTime(sale.fechaVenta).split(' ')[0] : ''}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* PASO 2 Y 3: ITEMS A DEVOLVER Y CONFIGURACIÓN */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 bg-white">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1">Paso 2</span>
                <h6 className="fw-bold mb-0">Configuración y Unidades a Devolver</h6>
              </div>

              {!selectedSale ? (
                <div className="text-center py-5 text-muted">
                  <Package size={44} className="mb-2 opacity-50 d-block mx-auto text-muted" />
                  <p className="fw-semibold mb-1">Ningún comprobante seleccionado</p>
                  <small>Haz clic en una boleta de la lista izquierda para cargar los productos vendidos.</small>
                </div>
              ) : (
                <form onSubmit={handleSubmitDevolucion}>
                  {/* Resumen de la venta seleccionada */}
                  <div className="alert alert-light border rounded-3 p-3 mb-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="small text-muted">Comprobante de Origen:</div>
                      <div className="fw-bold text-dark font-monospace fs-6">{selectedSale.numeroBoleta}</div>
                      <div className="small text-muted">Cliente: {selectedSale.cliente}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSelectedSale(null);
                        setReturnItems([]);
                      }}
                    >
                      Cambiar
                    </button>
                  </div>

                  {/* Tabla de ítems para devolución */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase">
                      Productos comprados (marca los que se devuelven):
                    </label>
                    <div className="table-responsive border rounded-3 overflow-hidden">
                      <table className="table table-hover table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr className="small text-muted">
                            <th style={{ width: 40 }} className="text-center">✓</th>
                            <th>Producto</th>
                            <th className="text-center">Comp.</th>
                            <th className="text-center" style={{ width: 110 }}>Devolver</th>
                            <th className="text-end pe-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnItems.map((it) => (
                            <tr key={it.productoId} className={it.selected ? 'table-warning bg-opacity-25' : ''}>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={it.selected}
                                  onChange={() => handleToggleItem(it.productoId)}
                                />
                              </td>
                              <td>
                                <div className="fw-semibold text-dark small">{it.productoNombre}</div>
                                {it.sku && <small className="text-muted">{it.sku}</small>}
                              </td>
                              <td className="text-center small text-muted">{it.cantidadOriginal}</td>
                              <td className="text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={it.cantidadOriginal}
                                  className="form-control form-control-sm text-center fw-bold"
                                  value={it.cantidadDevolver}
                                  disabled={!it.selected}
                                  onChange={(e) =>
                                    handleUpdateItemQty(it.productoId, parseInt(e.target.value) || 1)
                                  }
                                />
                              </td>
                              <td className="text-end pe-3 small fw-bold">
                                {it.selected
                                  ? formatCurrency(it.cantidadDevolver * it.precioUnitario)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Opciones de la Devolución */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">
                        Motivo de la Devolución <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        required
                      >
                        <option value="Producto defectuoso / rotura">Producto defectuoso / rotura</option>
                        <option value="Fecha de vencimiento próxima">Fecha de vencimiento próxima</option>
                        <option value="Error en despacho / ítem incorrecto">Error en despacho / ítem incorrecto</option>
                        <option value="Insatisfacción del cliente">Insatisfacción del cliente</option>
                        <option value="Cambio de opinión del comprador">Cambio de opinión del comprador</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">
                        Destino del Inventario <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={destinoStock}
                        onChange={(e) => setDestinoStock(e.target.value as any)}
                        required
                      >
                        <option value="reingreso">📦 Reingreso a Stock Disponible (Kardex: Entrada)</option>
                        <option value="merma">🗑 Merma / Producto Dañado (Kardex: Ajuste)</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Método de Reembolso</label>
                      <select
                        className="form-select form-select-sm"
                        value={metodoReembolso}
                        onChange={(e) => setMetodoReembolso(e.target.value as any)}
                      >
                        <option value="efectivo">💵 Reembolso en Efectivo</option>
                        <option value="transferencia">💳 Transferencia Bancaria</option>
                        <option value="nota_credito">📝 Nota de Crédito / Saldo a favor</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Observaciones (opcional)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Detalles sobre el estado del producto..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Resumen Final de Reembolso */}
                  <div className="card bg-light border-0 p-3 rounded-3 mb-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="text-muted small">Monto Total a Reembolsar:</div>
                        <div className="h4 fw-bold text-danger mb-0">{formatCurrency(totalReembolso)}</div>
                      </div>
                      <div className="text-end small text-muted">
                        <div>{selectedItemsToReturn.length} producto(s) seleccionados</div>
                        <div>Destino: <strong>{destinoStock.toUpperCase()}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de emisión */}
                  <button
                    type="submit"
                    className="btn btn-warning w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    disabled={submitting || selectedItemsToReturn.length === 0}
                  >
                    {submitting && <span className="spinner-border spinner-border-sm" />}
                    <RotateCcw size={18} />
                    <span>Confirmar Devolución ({formatCurrency(totalReembolso)})</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA: HISTORIAL DE DEVOLUCIONES */}
      {activeTab === 'historial' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-muted text-uppercase">
                  <th className="ps-3 py-3">N° Devolución</th>
                  <th>Fecha</th>
                  <th>Boleta Origen</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Destino</th>
                  <th>Reembolso</th>
                  <th className="text-end">Monto Total</th>
                  <th className="text-end pe-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      <RotateCcw size={36} className="mb-2 opacity-50 d-block mx-auto" />
                      <p className="fw-semibold mb-1">No hay devoluciones registradas</p>
                      <small>Las notas de devolución emitidas se archivarán en esta sección.</small>
                    </td>
                  </tr>
                ) : (
                  devoluciones.map((dev) => (
                    <tr key={dev.id}>
                      <td className="ps-3 py-3">
                        <span className="badge bg-warning bg-opacity-20 text-dark fw-bold font-monospace px-2 py-1">
                          {dev.numeroDevolucion}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {dev.fechaDevolucion ? formatDateTime(dev.fechaDevolucion) : '—'}
                      </td>
                      <td>
                        <span className="badge bg-dark bg-opacity-10 text-dark font-monospace">
                          {dev.numeroBoleta}
                        </span>
                      </td>
                      <td className="fw-semibold text-dark small">{dev.cliente}</td>
                      <td className="small text-muted">{dev.motivo}</td>
                      <td>
                        <span
                          className={`badge ${
                            dev.destinoStock === 'merma'
                              ? 'bg-danger bg-opacity-10 text-danger'
                              : 'bg-info bg-opacity-10 text-info'
                          }`}
                        >
                          {dev.destinoStock === 'merma' ? 'Merma / Descarte' : 'Reingreso Stock'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          {dev.metodoReembolso}
                        </span>
                      </td>
                      <td className="text-end fw-bold text-danger">
                        {formatCurrency(dev.montoTotal)}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setModalDevolucion(dev)}
                          title="Ver Detalle"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE DEVOLUCIÓN EMITIDA */}
      {modalDevolucion && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-warning text-dark py-3">
                <div className="d-flex align-items-center gap-2">
                  <RotateCcw size={20} />
                  <h5 className="modal-title fw-bold mb-0">
                    Nota de Devolución {modalDevolucion.numeroDevolucion}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setModalDevolucion(null)}
                />
              </div>

              <div className="modal-body p-4 bg-light">
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-3">
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted">Comprobante de Venta Ref: </span>
                      <strong className="text-dark font-monospace">{modalDevolucion.numeroBoleta}</strong>
                    </div>
                    <div className="col-6 text-end">
                      <span className="text-muted">Fecha: </span>
                      <strong>
                        {modalDevolucion.fechaDevolucion
                          ? formatDateTime(modalDevolucion.fechaDevolucion)
                          : '—'}
                      </strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Cliente: </span>
                      <strong>{modalDevolucion.cliente}</strong>
                    </div>
                    <div className="col-6 text-end">
                      <span className="text-muted">Destino Físico: </span>
                      <span className="badge bg-secondary">
                        {modalDevolucion.destinoStock.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-12 mt-2">
                      <span className="text-muted">Motivo: </span>
                      <strong className="text-danger">{modalDevolucion.motivo}</strong>
                    </div>
                  </div>
                </div>

                {/* Ítems devueltos */}
                <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th className="ps-3 py-2">Producto Devuelto</th>
                        <th className="text-center">Cant. Devuelta</th>
                        <th className="text-end">Precio Unit.</th>
                        <th className="text-end pe-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalDevolucion.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 py-2">
                            <div className="fw-semibold text-dark">{it.productoNombre}</div>
                            {it.sku && <small className="text-muted">SKU: {it.sku}</small>}
                          </td>
                          <td className="text-center fw-bold">{it.cantidad}</td>
                          <td className="text-end text-muted">{formatCurrency(it.precioUnitario)}</td>
                          <td className="text-end pe-3 fw-bold">{formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total reembolsado */}
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white ms-auto" style={{ maxWidth: 280 }}>
                  <div className="d-flex justify-content-between h5 fw-bold text-dark mb-0">
                    <span>Reembolso Total:</span>
                    <span className="text-danger">{formatCurrency(modalDevolucion.montoTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-white border-0">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalDevolucion(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
