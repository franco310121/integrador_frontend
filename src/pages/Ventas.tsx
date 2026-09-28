import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  FileText,
  Printer,
  RotateCcw,
  Tag,
  Package,
  X,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { createSale, getPaymentMethods, calcularTotalesVenta } from '../services/ventaService';
import { getClients, createClient } from '../services/clienteService';
import type { ProductoDB } from '../types/producto';
import type { VentaDB, MetodoPagoDB, CarritoVentaItem } from '../types/venta';
import type { ClienteDB } from '../types/cliente';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

export default function Ventas() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);

  // Datos maestros
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [clients, setClients] = useState<ClienteDB[]>([]);
  const [payMethods, setPayMethods] = useState<MetodoPagoDB[]>([]);

  // Notificación flotante
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  // Filtros del catálogo de productos
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Carrito de ventas
  const [carrito, setCarrito] = useState<CarritoVentaItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clienteManual, setClienteManual] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [descuento, setDescuento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal de registro rápido de cliente
  const [showClientModal, setShowClientModal] = useState(false);
  const [qNombre, setQNombre] = useState('');
  const [qTipoDoc, setQTipoDoc] = useState('DNI');
  const [qNumDoc, setQNumDoc] = useState('');
  const [qTelefono, setQTelefono] = useState('');
  const [qCorreo, setQCorreo] = useState('');
  const [qDireccion, setQDireccion] = useState('');
  const [clientModalError, setClientModalError] = useState('');

  // Modal de comprobante emitido
  const [lastReceipt, setLastReceipt] = useState<VentaDB | null>(null);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4500);
  };

  const loadData = async () => {
    try {
      const [prodList, clientList, payList] = await Promise.all([
        getProducts(),
        getClients(),
        getPaymentMethods(),
      ]);
      setProducts(prodList.filter((p) => p.estado === 'activo'));
      setClients(clientList.filter((c) => c.estado === 'activo'));
      setPayMethods(payList);

      if (payList.length > 0 && !payMethodId) {
        setPayMethodId(String(payList[0].id));
      }
    } catch {
      showNotification('Error al cargar datos maestros del terminal de ventas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Categorías únicas
  const categories = [
    'todas',
    ...Array.from(new Set(products.map((p) => p.categoriaNombre || 'Sin Categoría'))),
  ];

  // Productos filtrados
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'todas' ||
      (p.categoriaNombre || 'Sin Categoría') === selectedCategory;

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.nombre.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q));

    return matchesCat && matchesSearch;
  });

  // Operaciones del Carrito
  const handleAddToCart = (product: ProductoDB) => {
    if (product.stock <= 0) {
      showNotification(`El producto "${product.nombre}" no cuenta con existencias disponibles.`, 'danger');
      return;
    }

    setCarrito((prev) => {
      const existing = prev.find((it) => it.producto.id === product.id);
      if (existing) {
        if (existing.cantidad + 1 > product.stock) {
          showNotification(`Existencias insuficientes para "${product.nombre}". Stock: ${product.stock}`, 'danger');
          return prev;
        }
        return prev.map((it) =>
          it.producto.id === product.id
            ? { ...it, cantidad: it.cantidad + 1, subtotal: (it.cantidad + 1) * it.precioUnitario }
            : it
        );
      }
      return [
        ...prev,
        {
          producto: product,
          cantidad: 1,
          precioUnitario: product.precioVenta,
          subtotal: product.precioVenta,
        },
      ];
    });
  };

  const handleUpdateQty = (productId: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((it) => {
          if (it.producto.id !== productId) return it;
          const newQty = it.cantidad + delta;
          if (newQty <= 0) return null;
          if (newQty > it.producto.stock) {
            showNotification(`Stock máximo alcanzado (${it.producto.stock}) para ${it.producto.nombre}`, 'danger');
            return it;
          }
          return {
            ...it,
            cantidad: newQty,
            subtotal: newQty * it.precioUnitario,
          };
        })
        .filter(Boolean) as CarritoVentaItem[]
    );
  };

  const handleRemoveItem = (productId: number) => {
    setCarrito((prev) => prev.filter((it) => it.producto.id !== productId));
  };

  const handleClearCart = () => {
    setCarrito([]);
  };

  // Cálculos financieros
  const descuentoNum = Math.max(0, parseFloat(descuento) || 0);
  const totales = calcularTotalesVenta(carrito, descuentoNum);

  // Registro rápido de cliente desde modal
  const handleQuickSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientModalError('');

    const cleanNombre = qNombre.trim();
    const cleanDoc = qNumDoc.trim();

    if (!cleanNombre) {
      setClientModalError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!cleanDoc) {
      setClientModalError('El número de documento (DNI o RUC) es obligatorio y no puede estar vacío.');
      return;
    }

    if (qTipoDoc === 'DNI' && !/^\d{8}$/.test(cleanDoc)) {
      setClientModalError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (qTipoDoc === 'RUC' && !/^\d{11}$/.test(cleanDoc)) {
      setClientModalError('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }

    const docDuplicado = clients.some(
      (c) => (c.numeroDocumento || c.numero_documento || '').trim() === cleanDoc
    );
    if (docDuplicado) {
      setClientModalError(`Ya existe un cliente registrado con el documento: ${cleanDoc}`);
      return;
    }

    try {
      const nuevo = await createClient({
        nombre: cleanNombre,
        tipoDocumento: qTipoDoc,
        numeroDocumento: cleanDoc,
        telefono: qTelefono.trim() || undefined,
        correo: qCorreo.trim() || undefined,
        direccion: qDireccion.trim() || undefined,
        estado: 'activo',
      });

      setClients((prev) => [...prev, nuevo]);
      setSelectedClientId(String(nuevo.id));
      setShowClientModal(false);
      showNotification(`Cliente "${nuevo.nombre}" registrado exitosamente.`);
    } catch (err: any) {
      setClientModalError(err?.response?.data?.message || err?.message || 'Error al guardar cliente.');
    }
  };

  // Procesar Venta / Emisión de Comprobante
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) {
      showNotification('El carrito se encuentra vacío. Añade productos para vender.', 'danger');
      return;
    }

    let finalClienteNombre = 'Público General';
    if (selectedClientId) {
      const c = clients.find((x) => String(x.id) === selectedClientId);
      if (c) {
        finalClienteNombre = `${c.nombre} (${c.tipoDocumento || 'DOC'}: ${c.numeroDocumento})`;
      }
    } else if (clienteManual.trim()) {
      finalClienteNombre = clienteManual.trim();
    }

    setSubmitting(true);
    try {
      const salePayload = {
        cliente: finalClienteNombre,
        metodoPagoId: payMethodId ? Number(payMethodId) : undefined,
        descuento: descuentoNum,
        observaciones: observaciones.trim() || undefined,
        items: carrito.map((it) => ({
          productoId: it.producto.id,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
      };

      const result = await createSale(salePayload);
      setLastReceipt(result);
      showNotification(`¡Comprobante ${result.numeroBoleta} emitido con éxito!`);

      // Limpiar terminal
      setCarrito([]);
      setDescuento('');
      setObservaciones('');
      setClienteManual('');
      setSelectedClientId('');

      notifyStockUpdated();
      await loadData();
    } catch (err: any) {
      showNotification(
        err?.response?.data?.message || err?.message || 'Error al emitir el comprobante',
        'danger'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Cargando terminal de ventas..." />;
  }

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Alerta flotante */}
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

      {/* Barra Superior de Control y Accesos Rápidos */}
      <div className="d-flex flex-column flex-md-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 d-flex align-items-center gap-2">
            <ShoppingCart className="text-primary" size={28} />
            Terminal de Ventas (POS)
          </h1>
          <p className="text-muted small mb-0">
            Catálogo interactivo separado con facturación instantánea y control de existencias.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/comprobantes"
            className="btn btn-outline-dark d-flex align-items-center gap-2 shadow-sm"
          >
            <Receipt size={17} />
            <span>Historial Comprobantes</span>
          </Link>
          <Link
            to="/devoluciones"
            className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm"
          >
            <RotateCcw size={17} />
            <span>Devoluciones</span>
          </Link>
          <Link
            to="/clientes"
            className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
          >
            <User size={17} />
            <span>Clientes</span>
          </Link>
        </div>
      </div>

      {/* DISEÑO SPLIT-VIEW POS */}
      <div className="row g-4">
        {/* COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS SEPARADO */}
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex flex-column flex-sm-row sm:align-items-center justify-content-between gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <Package className="text-primary" size={20} />
                <h5 className="fw-bold mb-0">Catálogo de Productos</h5>
                <span className="badge bg-light text-muted border rounded-pill">
                  {filteredProducts.length} disponibles
                </span>
              </div>

              {/* Buscador de productos */}
              <div className="input-group" style={{ maxWidth: '300px' }}>
                <span className="input-group-text bg-light border-end-0">
                  <Search size={15} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light border-start-0"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Chips de Categorías */}
            <div className="d-flex gap-2 overflow-x-auto pb-2 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm text-nowrap rounded-pill px-3 py-1 fw-semibold transition-all ${
                    selectedCategory === cat
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-muted border-0'
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'todas' ? '🏷 Todas las Categorías' : cat}
                </button>
              ))}
            </div>

            {/* Grid de Productos */}
            <div
              className="row g-3 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '380px' }}
            >
              {filteredProducts.length === 0 ? (
                <div className="col-12 text-center py-5 text-muted">
                  <Package size={42} className="mb-2 opacity-50 d-block mx-auto text-muted" />
                  <p className="fw-semibold mb-1">No se encontraron productos disponibles</p>
                  <small>Intenta cambiar los filtros o registra productos en el Inventario.</small>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const inCartItem = carrito.find((it) => it.producto.id === p.id);
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <div key={p.id} className="col-12 col-sm-6 col-md-4">
                      <div
                        className={`card h-100 border rounded-4 overflow-hidden transition-all ${
                          isOutOfStock ? 'opacity-50 bg-light' : 'hover-shadow-sm'
                        }`}
                        style={{ borderColor: inCartItem ? '#2563eb' : '#e2e8f0' }}
                      >
                        {/* Imagen o Placeholder */}
                        <div
                          className="position-relative bg-light d-flex align-items-center justify-content-center overflow-hidden"
                          style={{ height: '130px' }}
                        >
                          {p.imagenUrl ? (
                            <img
                              src={p.imagenUrl}
                              alt={p.nombre}
                              className="w-100 h-100 object-fit-cover"
                            />
                          ) : (
                            <div className="text-center text-muted">
                              <Package size={36} className="opacity-40 mb-1" />
                              <div style={{ fontSize: '.7rem' }}>Sin Imagen</div>
                            </div>
                          )}

                          {/* Badge de Stock */}
                          <div className="position-absolute top-0 start-0 m-2">
                            <span
                              className={`badge rounded-pill px-2 py-1 shadow-sm ${
                                p.stock > 10
                                  ? 'bg-success'
                                  : p.stock > 0
                                  ? 'bg-warning text-dark'
                                  : 'bg-danger'
                              }`}
                            >
                              {p.stock > 0 ? `${p.stock} en stock` : 'Agotado'}
                            </span>
                          </div>

                          {/* Indicador en carrito */}
                          {inCartItem && (
                            <div className="position-absolute top-0 end-0 m-2">
                              <span className="badge bg-primary rounded-pill px-2 py-1 shadow-sm">
                                {inCartItem.cantidad} en carrito
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Detalle del producto */}
                        <div className="card-body p-3 d-flex flex-column">
                          <small
                            className="text-muted text-uppercase fw-semibold mb-1"
                            style={{ fontSize: '.68rem' }}
                          >
                            {p.categoriaNombre || 'General'}
                          </small>
                          <h6
                            className="fw-bold text-dark mb-1 text-truncate"
                            title={p.nombre}
                          >
                            {p.nombre}
                          </h6>
                          {p.sku && (
                            <div className="text-muted small mb-2" style={{ fontSize: '.72rem' }}>
                              SKU: {p.sku}
                            </div>
                          )}

                          <div className="mt-auto d-flex align-items-center justify-content-between pt-2 border-top">
                            <div className="h5 fw-bold text-primary mb-0">
                              {formatCurrency(p.precioVenta)}
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-primary rounded-3 px-2.5 py-1 d-flex align-items-center gap-1 shadow-sm"
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(p)}
                            >
                              <Plus size={14} />
                              <span>Agregar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CAJA / CARRITO DE VENTA */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 bg-white sticky-top" style={{ top: '80px' }}>
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
              <div className="d-flex align-items-center gap-2">
                <Receipt className="text-primary" size={22} />
                <h5 className="fw-bold mb-0">Detalle de Caja</h5>
              </div>

              {carrito.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger text-decoration-none p-0 d-flex align-items-center gap-1"
                  onClick={handleClearCart}
                >
                  <Trash2 size={14} />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            <form onSubmit={handleCheckout}>
              {/* SELECTOR DE CLIENTE */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label small fw-semibold text-muted mb-0">
                    Cliente (DNI o RUC)
                  </label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1 text-primary fw-semibold"
                    onClick={() => {
                      setQNombre('');
                      setQTipoDoc('DNI');
                      setQNumDoc('');
                      setQTelefono('');
                      setClientModalError('');
                      setShowClientModal(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Nuevo Cliente</span>
                  </button>
                </div>

                <select
                  className="form-select form-select-sm mb-1"
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (e.target.value) setClienteManual('');
                  }}
                >
                  <option value="">Público General / Venta Mostrador</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} &bull; {c.tipoDocumento || 'DOC'}: {c.numeroDocumento}
                    </option>
                  ))}
                </select>

                {!selectedClientId && (
                  <input
                    type="text"
                    className="form-control form-control-sm bg-light"
                    placeholder="O ingresa nombre / razón social manual..."
                    value={clienteManual}
                    onChange={(e) => setClienteManual(e.target.value)}
                  />
                )}
              </div>

              {/* LISTA DE ÍTEMS EN CARRITO */}
              <div
                className="overflow-y-auto mb-3 border rounded-3 p-2 bg-light"
                style={{ maxHeight: '280px', minHeight: '160px' }}
              >
                {carrito.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <ShoppingCart size={32} className="opacity-40 mb-1 d-block mx-auto" />
                    <small>No hay productos en el carrito</small>
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div
                      key={item.producto.id}
                      className="d-flex align-items-center justify-content-between bg-white p-2 rounded-3 mb-2 shadow-sm"
                    >
                      <div className="overflow-hidden pe-2" style={{ maxWidth: '170px' }}>
                        <div className="fw-semibold text-truncate small text-dark">
                          {item.producto.nombre}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '.72rem' }}>
                          {formatCurrency(item.precioUnitario)} c/u
                        </div>
                      </div>

                      {/* Control de cantidad */}
                      <div className="d-flex align-items-center gap-1.5">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-1 rounded-2"
                          onClick={() => handleUpdateQty(item.producto.id, -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="fw-bold px-1.5 small">{item.cantidad}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-1 rounded-2"
                          onClick={() => handleUpdateQty(item.producto.id, 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-end ps-2">
                        <div className="fw-bold text-dark small">
                          {formatCurrency(item.subtotal)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0 border-0"
                          onClick={() => handleRemoveItem(item.producto.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* FORMA DE PAGO Y DESCUENTO */}
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Método de Pago
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={payMethodId}
                    onChange={(e) => setPayMethodId(e.target.value)}
                  >
                    {payMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-5">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Descuento (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-control form-control-sm text-end"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                  />
                </div>
              </div>

              {/* RESUMEN FINANCIERO */}
              <div className="card bg-light border-0 p-3 rounded-3 mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totales.subtotal)}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>IGV (18%):</span>
                  <span>{formatCurrency(totales.igv)}</span>
                </div>
                {descuentoNum > 0 && (
                  <div className="d-flex justify-content-between small text-danger mb-1">
                    <span>Descuento aplicado:</span>
                    <span>-{formatCurrency(descuentoNum)}</span>
                  </div>
                )}
                <hr className="my-2 opacity-25" />
                <div className="d-flex justify-content-between h4 fw-bold text-dark mb-0">
                  <span>Total:</span>
                  <span className="text-success">{formatCurrency(totales.total)}</span>
                </div>
              </div>

              {/* BOTÓN EMITIR COMPROBANTE */}
              <button
                type="submit"
                className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                disabled={submitting || carrito.length === 0}
              >
                {submitting && <span className="spinner-border spinner-border-sm" />}
                <Receipt size={18} />
                <span>Emitir Comprobante ({formatCurrency(totales.total)})</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL REGISTRO RÁPIDO DE CLIENTE */}
      {showClientModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <User size={18} />
                  <h6 className="modal-title fw-bold mb-0">Nuevo Cliente</h6>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white shadow-none"
                  onClick={() => setShowClientModal(false)}
                />
              </div>

              <form onSubmit={handleQuickSaveClient}>
                <div className="modal-body p-4 bg-light">
                  {clientModalError && (
                    <div className="alert alert-danger small py-2 mb-3">
                      {clientModalError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-sm-5">
                      <label className="form-label small fw-semibold">Tipo Documento</label>
                      <select
                        className="form-select form-select-sm"
                        value={qTipoDoc}
                        onChange={(e) => setQTipoDoc(e.target.value)}
                      >
                        <option value="DNI">DNI (8 dígitos)</option>
                        <option value="RUC">RUC (11 dígitos)</option>
                      </select>
                    </div>

                    <div className="col-12 col-sm-7">
                      <label className="form-label small fw-semibold">
                        Número de Documento <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={qTipoDoc === 'DNI' ? '8 dígitos' : '11 dígitos'}
                        maxLength={qTipoDoc === 'DNI' ? 8 : 11}
                        value={qNumDoc}
                        onChange={(e) => setQNumDoc(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        Nombre Completo / Razón Social <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ej. Juan Pérez o Inversiones S.A.C."
                        value={qNombre}
                        onChange={(e) => setQNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Teléfono</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ej. 987654321"
                        value={qTelefono}
                        onChange={(e) => setQTelefono(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Correo Electrónico</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        placeholder="cliente@ejemplo.com"
                        value={qCorreo}
                        onChange={(e) => setQCorreo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-white border-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowClientModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary">
                    Guardar y Seleccionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPROBANTE EMITIDO */}
      {lastReceipt && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-success text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <CheckCircle2 size={20} />
                  <h6 className="modal-title fw-bold mb-0">¡Comprobante Emitido con Éxito!</h6>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white shadow-none"
                  onClick={() => setLastReceipt(null)}
                />
              </div>

              <div className="modal-body p-4 bg-light">
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white text-center mb-3">
                  <div className="h5 fw-bold text-dark mb-0 font-monospace">
                    {lastReceipt.numeroBoleta}
                  </div>
                  <div className="text-muted small mb-2">
                    {lastReceipt.fechaVenta ? formatDateTime(lastReceipt.fechaVenta) : 'Hoy'}
                  </div>
                  <div className="h3 fw-bold text-success mb-1">
                    {formatCurrency(lastReceipt.total)}
                  </div>
                  <div className="small text-muted">
                    Cliente: <strong>{lastReceipt.cliente}</strong>
                  </div>
                </div>

                <div className="card border-0 shadow-sm rounded-3 p-2 bg-white small mb-3">
                  <div className="d-flex justify-content-between text-muted py-1 border-bottom">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(lastReceipt.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-muted py-1 border-bottom">
                    <span>IGV (18%):</span>
                    <span>{formatCurrency(lastReceipt.igv || 0)}</span>
                  </div>
                  {Number(lastReceipt.descuento || 0) > 0 && (
                    <div className="d-flex justify-content-between text-danger py-1 border-bottom">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(lastReceipt.descuento)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold text-dark py-1">
                    <span>Total Pagado:</span>
                    <span className="text-success">{formatCurrency(lastReceipt.total)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-white border-0 d-flex justify-content-between">
                <Link
                  to="/comprobantes"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => setLastReceipt(null)}
                >
                  Ir al Historial
                </Link>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    onClick={() => window.print()}
                  >
                    <Printer size={14} />
                    <span>Imprimir</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setLastReceipt(null)}
                  >
                    Nueva Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
