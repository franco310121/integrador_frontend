import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getSales, createSale, getPaymentMethods, calcularTotalesVenta } from '../services/ventaService';
import type { ProductoDB } from '../types/producto';
import type { VentaDB, MetodoPagoDB, CarritoVentaItem } from '../types/venta';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

const PAGE_SIZE = 8;

export default function Ventas() {
  const { session } = useAuth();

  const [products, setProducts]       = useState<ProductoDB[]>([]);
  const [sales, setSales]             = useState<VentaDB[]>([]);
  const [payMethods, setPayMethods]   = useState<MetodoPagoDB[]>([]);
  const [loading, setLoading]         = useState(true);

  const [cliente, setCliente]         = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [descuento, setDescuento]     = useState('');
  const [observ, setObserv]           = useState('');

  const [searchTerm, setSearchTerm]     = useState('');
  const [showDrop, setShowDrop]         = useState(false);
  const [selectedProd, setSelectedProd] = useState<ProductoDB | null>(null);
  const [cantidad, setCantidad]         = useState(1);
  const [carrito, setCarrito]           = useState<CarritoVentaItem[]>([]);

  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const [histSearch, setHistSearch] = useState('');
  const [filtHist, setFiltHist]     = useState<VentaDB[]>([]);
  const [histPage, setHistPage]     = useState(1);

  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getProducts(), getSales(), getPaymentMethods()])
      .then(([p, s, mp]) => {
        setProducts(p);
        setSales(s);
        setFiltHist(s);
        setPayMethods(mp);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const filtProd = searchTerm.trim()
    ? products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleAddToCart = () => {
    if (!selectedProd || cantidad < 1) return;
    const stockAvailable = Number(selectedProd.stock || 0);
    const qty = Math.min(Number(cantidad), stockAvailable);

    const existingIndex = carrito.findIndex(i => i.productoId === selectedProd.id);
    if (existingIndex >= 0) {
      const newQty = carrito[existingIndex].cantidad + qty;
      if (newQty > stockAvailable) {
        showNotification('Stock disponible insuficiente para cubrir la cantidad solicitada.', 'danger');
        return;
      }
      const updated = [...carrito];
      updated[existingIndex].cantidad = newQty;
      setCarrito(updated);
    } else {
      setCarrito(prev => [
        ...prev,
        {
          productoId:      selectedProd.id!,
          productoNombre:  selectedProd.nombre,
          sku:             selectedProd.sku || null,
          precioUnitario:  Number(selectedProd.precio_venta || 0),
          cantidad:        qty,
          stockDisponible: stockAvailable,
          stockMax:        stockAvailable,
        },
      ]);
    }
    setSelectedProd(null);
    setSearchTerm('');
    setCantidad(1);
  };

  const handleUpdateQuantity = (idx: number, newQty: number) => {
    const item = carrito[idx];
    const maxStock = item.stockMax ?? item.stockDisponible;
    const clamped = Math.max(1, Math.min(Number(newQty) || 1, maxStock));
    const updated = [...carrito];
    updated[idx].cantidad = clamped;
    setCarrito(updated);
  };

  const handleRemoveFromCart = (idx: number) => {
    setCarrito(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    setCarrito([]);
    setCliente('');
    setPayMethodId('');
    setDescuento('');
    setObserv('');
    setSelectedProd(null);
    setSearchTerm('');
  };

  const { subtotal, igv, total } = calcularTotalesVenta(
    carrito.map(i => ({ precioUnitario: i.precioUnitario, cantidad: i.cantidad })),
    Number(descuento) || 0
  );

  const handleProcessSale = async () => {
    if (!cliente.trim()) {
      showNotification('Debe ingresar la identificación o razón social del cliente.', 'danger');
      return;
    }
    if (carrito.length === 0) {
      showNotification('El detalle de venta se encuentra vacío.', 'danger');
      return;
    }
    if (!session?.userId) {
      showNotification('Sesión de usuario no válida.', 'danger');
      return;
    }

    try {
      const { venta: nuevaVenta } = await createSale({
        vendedorId:   session.userId,
        cliente:      cliente.trim(),
        metodoPagoId: payMethodId ? Number(payMethodId) : null,
        descuento:    Number(descuento) || 0,
        observaciones: observ.trim() || null,
        items: carrito.map(i => ({
          productoId:     i.productoId,
          cantidad:       i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      });

      setProducts(prev =>
        prev.map(p => {
          const item = carrito.find(i => i.productoId === p.id);
          if (!item) return p;
          return { ...p, stock: Number(p.stock || 0) - item.cantidad };
        })
      );

      const updated = [nuevaVenta, ...sales];
      setSales(updated);
      setFiltHist(updated);
      notifyStockUpdated();
      handleClearCart();
      showNotification(`Comprobante ${nuevaVenta.numero_boleta} emitido exitosamente.`, 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Error al procesar la venta.', 'danger');
    }
  };

  useEffect(() => {
    if (!histSearch.trim()) {
      setFiltHist(sales);
    } else {
      const q = histSearch.toLowerCase();
      setFiltHist(sales.filter(v =>
        v.cliente.toLowerCase().includes(q) ||
        v.numero_boleta.toLowerCase().includes(q)
      ));
    }
    setHistPage(1);
  }, [histSearch, sales]);

  const histPages = Math.max(1, Math.ceil(filtHist.length / PAGE_SIZE));
  const pagedHist = filtHist.slice((histPage - 1) * PAGE_SIZE, histPage * PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Terminal Punto de Venta (POS)</h1>
          <p className="text-muted mb-0 small">Emisión transaccional de comprobantes con cálculo fiscal y rebaja de stock</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Terminal POS Column */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <Receipt size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">Emisión de Comprobante</span>
              </div>
              {carrito.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none text-muted p-0 d-inline-flex align-items-center gap-1"
                  onClick={handleClearCart}
                >
                  <RotateCcw size={12} />
                  <span>Limpiar pedido</span>
                </button>
              )}
            </div>
            <div className="card-body p-3 p-sm-4">
              {msg && (
                <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 rounded-3 mb-3 d-flex align-items-center gap-2`}>
                  {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
                  <span>{msg}</span>
                </div>
              )}

              {/* Cliente y Método de Pago */}
              <div className="row g-2.5 mb-3">
                <div className="col-7">
                  <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Cliente o Razón Social *
                  </label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control form-control-sm ps-4"
                      value={cliente}
                      onChange={e => setCliente(e.target.value)}
                      placeholder="Cliente / RUC / DNI"
                    />
                    <User size={13} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 10 }} />
                  </div>
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Forma de Pago
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={payMethodId}
                    onChange={e => setPayMethodId(e.target.value)}
                  >
                    <option value="">Efectivo</option>
                    {payMethods.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Buscador de artículos */}
              <div className="mb-3 position-relative" ref={dropRef}>
                <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                  Buscar y Agregar Artículo
                </label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm ps-4"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setShowDrop(true); setSelectedProd(null); }}
                    onFocus={() => setShowDrop(true)}
                    placeholder="Ingrese nombre, SKU o categoría..."
                  />
                  <Search size={14} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 10 }} />
                </div>

                {showDrop && searchTerm.trim() && (
                  <div className="list-group position-absolute w-100 shadow-lg mt-1 border rounded-3 overflow-hidden" style={{ zIndex: 1050, maxHeight: 240, overflowY: 'auto' }}>
                    {filtProd.length === 0 ? (
                      <div className="list-group-item text-muted small p-3 text-center">No se encontraron artículos</div>
                    ) : (
                      filtProd.map(p => {
                        const stock = Number(p.stock || 0);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3 ${stock === 0 ? 'disabled bg-light opacity-75' : ''}`}
                            onClick={() => {
                              if (stock > 0) {
                                setSelectedProd(p);
                                setSearchTerm(p.nombre);
                                setShowDrop(false);
                              }
                            }}
                          >
                            <div>
                              <div className="fw-semibold small text-dark">{p.nombre}</div>
                              <span className="text-muted" style={{ fontSize: '.72rem' }}>SKU: {p.sku || 'N/A'}</span>
                            </div>
                            <div className="text-end">
                              <div className="small fw-bold text-dark">{formatCurrency(Number(p.precio_venta || 0))}</div>
                              <span className={`badge py-0.5 px-2 rounded-pill ${stock === 0 ? 'badge-soft-danger' : 'badge-soft-success'}`} style={{ fontSize: '.68rem' }}>
                                {stock} disponibles
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {selectedProd && (
                <div className="p-3 mb-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold small text-dark">{selectedProd.nombre}</div>
                    <div className="text-muted small">{formatCurrency(Number(selectedProd.precio_venta || 0))} por unidad</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number"
                      className="form-control form-control-sm text-center fw-bold"
                      style={{ width: 64 }}
                      value={cantidad}
                      min={1}
                      max={Number(selectedProd.stock || 1)}
                      onChange={e => setCantidad(Number(e.target.value))}
                    />
                    <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-2.5" onClick={handleAddToCart}>
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Detalle del Pedido */}
              {carrito.length > 0 && (
                <>
                  <div className="table-responsive mb-3 border rounded-3 overflow-hidden">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Ítem</th>
                          <th style={{ width: 85 }} className="text-center">Cant.</th>
                          <th style={{ width: 95 }} className="text-end">Subtotal</th>
                          <th style={{ width: 34 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carrito.map((item, idx) => (
                          <tr key={idx}>
                            <td className="small fw-semibold text-dark">{item.productoNombre}</td>
                            <td>
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-light btn-sm p-0 d-flex align-items-center justify-content-center border"
                                  style={{ width: 20, height: 20 }}
                                  onClick={() => handleUpdateQuantity(idx, item.cantidad - 1)}
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="small fw-bold px-1">{item.cantidad}</span>
                                <button
                                  type="button"
                                  className="btn btn-light btn-sm p-0 d-flex align-items-center justify-content-center border"
                                  style={{ width: 20, height: 20 }}
                                  onClick={() => handleUpdateQuantity(idx, item.cantidad + 1)}
                                  disabled={item.cantidad >= (item.stockMax ?? item.stockDisponible)}
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="text-end small fw-bold text-dark">
                              {formatCurrency(item.cantidad * item.precioUnitario)}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                                onClick={() => handleRemoveFromCart(idx)}
                                title="Eliminar del pedido"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-light p-3 rounded-3 mb-3 border">
                    <div className="d-flex justify-content-between small text-muted mb-1.5">
                      <span>Subtotal imponible</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-muted mb-1.5">
                      <span>IGV (18%)</span>
                      <span>{formatCurrency(igv)}</span>
                    </div>
                    <hr className="my-2 border-secondary-subtle" />
                    <div className="d-flex justify-content-between fw-bold text-dark fs-6">
                      <span>Total Liquidado</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary w-100 py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                    onClick={handleProcessSale}
                  >
                    <CreditCard size={18} />
                    <span>Procesar Venta y Generar Comprobante</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Registro de Ventas Emitidas Column */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <Clock size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">Comprobantes Emitidos</span>
              </div>
              <div className="position-relative" style={{ maxWidth: 240, width: '100%' }}>
                <input
                  type="text"
                  className="form-control form-control-sm ps-4"
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                  placeholder="Filtrar por cliente o boleta..."
                />
                <Search size={13} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 10 }} />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 140 }}>Nº Boleta</th>
                    <th>Cliente</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">Total</th>
                    <th style={{ width: 130 }}>Estado</th>
                    <th style={{ width: 160 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHist.map(v => (
                    <tr key={v.id}>
                      <td className="text-muted small font-monospace fw-semibold">{v.numero_boleta}</td>
                      <td className="fw-semibold small text-dark">{v.cliente}</td>
                      <td className="text-muted small text-end">{formatCurrency(Number(v.subtotal || 0))}</td>
                      <td className="text-end fw-bold text-primary small">{formatCurrency(Number(v.total || 0))}</td>
                      <td>
                        <span className={`badge py-1 px-2.5 rounded-pill ${v.estado === 'completada' ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                          {v.estado === 'completada' ? 'Completada' : 'Anulada'}
                        </span>
                      </td>
                      <td className="text-muted small">{formatDateTime(v.fecha_venta)}</td>
                    </tr>
                  ))}
                  {filtHist.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5 small">
                        No se registran ventas para los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {histPages > 1 && (
              <div className="d-flex align-items-center justify-content-between p-3 border-top">
                <small className="text-muted">Página {histPage} de {histPages}</small>
                <div className="d-flex gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={histPage === 1}
                    onClick={() => setHistPage(p => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={histPage === histPages}
                    onClick={() => setHistPage(p => p + 1)}
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
