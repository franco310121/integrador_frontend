import { useState, useEffect, type FormEvent } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getPurchases, createPurchase, getSuppliers, createSupplier, calcularTotalesCompra } from '../services/compraService';
import type { ProductoDB } from '../types/producto';
import type { CompraDB, ProveedorDB, CarritoCompraItem } from '../types/compra';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { notifyStockUpdated } from '../utils/stockEvents';

const PAGE_SIZE = 10;

export default function Compras() {
  const { session } = useAuth();
  const [products, setProducts]   = useState<ProductoDB[]>([]);
  const [suppliers, setSuppliers] = useState<ProveedorDB[]>([]);
  const [purchases, setPurchases] = useState<CompraDB[]>([]);
  const [loading, setLoading]     = useState(true);

  const [suppMode, setSuppMode] = useState<'existing' | 'new'>('existing');
  const [suppId, setSuppId]     = useState('');
  const [newRazon, setNewRazon] = useState('');
  const [newRuc, setNewRuc]     = useState('');
  const [newTel, setNewTel]     = useState('');

  const [selectedProdId, setSelectedProdId] = useState('');
  const [cantidad, setCantidad]             = useState('');
  const [costo, setCosto]                   = useState('');
  const [carrito, setCarrito]               = useState<CarritoCompraItem[]>([]);

  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');
  const [page, setPage]       = useState(1);

  useEffect(() => {
    Promise.all([getProducts(), getSuppliers(), getPurchases()])
      .then(([p, s, pu]) => {
        setProducts(p);
        setSuppliers(s);
        setPurchases(pu);
      })
      .finally(() => setLoading(false));
  }, []);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleAddItem = () => {
    const qty = parseInt(cantidad, 10);
    const cost = parseFloat(costo);
    const prod = products.find(p => p.id === Number(selectedProdId));

    if (!prod) {
      showNotification('Seleccione un producto del catálogo.', 'danger');
      return;
    }
    if (!qty || qty < 1) {
      showNotification('La cantidad debe ser mayor a cero.', 'danger');
      return;
    }
    if (!cost || cost <= 0) {
      showNotification('El costo unitario ingresado no es válido.', 'danger');
      return;
    }

    const itemIndex = carrito.findIndex(i => i.productoId === prod.id);
    if (itemIndex >= 0) {
      const updated = [...carrito];
      updated[itemIndex].cantidad += qty;
      setCarrito(updated);
    } else {
      setCarrito(prev => [
        ...prev,
        {
          productoId:     prod.id!,
          productoNombre: prod.nombre,
          sku:            prod.sku,
          costoUnitario:  cost,
          cantidad:       qty,
        },
      ]);
    }
    setSelectedProdId('');
    setCantidad('');
    setCosto('');
  };

  const handleRemoveItem = (index: number) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearForm = () => {
    setCarrito([]);
    setSuppId('');
    setNewRazon('');
    setNewRuc('');
    setNewTel('');
    setSelectedProdId('');
    setCantidad('');
    setCosto('');
    setSuppMode('existing');
  };

  const { subtotal, igv, total } = calcularTotalesCompra(
    carrito.map(item => ({ costoUnitario: item.costoUnitario, cantidad: item.cantidad }))
  );

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    let providerId: number | null = suppId ? Number(suppId) : null;

    if (suppMode === 'new') {
      if (!newRazon.trim()) {
        showNotification('Debe ingresar la razón social del proveedor.', 'danger');
        return;
      }
      try {
        const createdSupplier = await createSupplier({
          razonSocial: newRazon.trim(),
          ruc: newRuc.trim() || null,
          telefono: newTel.trim() || null,
        });
        setSuppliers(prev => [...prev, createdSupplier]);
        providerId = createdSupplier.id!;
      } catch (err: any) {
        showNotification(err?.message || 'Error al registrar nuevo proveedor.', 'danger');
        return;
      }
    }

    if (!providerId) {
      showNotification('Debe seleccionar o registrar un proveedor.', 'danger');
      return;
    }
    if (carrito.length === 0) {
      showNotification('El detalle de compra se encuentra vacío.', 'danger');
      return;
    }
    if (!session?.userId) {
      showNotification('Sesión expirada o no autorizada.', 'danger');
      return;
    }

    try {
      const { compra } = await createPurchase({
        proveedorId: providerId,
        usuarioId: session.userId,
        items: carrito.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          costoUnitario: item.costoUnitario,
        })),
      });

      setProducts(prev =>
        prev.map(p => {
          const item = carrito.find(i => i.productoId === p.id);
          if (!item) return p;
          return { ...p, stock: Number(p.stock || 0) + item.cantidad };
        })
      );

      setPurchases(prev => [compra, ...prev]);
      notifyStockUpdated();
      handleClearForm();
      showNotification(`Orden de compra registrada exitosamente (${formatCurrency(compra.total)}).`, 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Ocurrió un error al guardar la orden de compra.', 'danger');
    }
  };

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pagedPurchases = purchases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Gestión de Compras</h1>
          <p className="text-muted mb-0 small">Emisión de órdenes de abastecimiento y recepción de mercadería</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Formulario de Compra */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <Truck size={18} className="text-primary" />
                <span className="fw-bold text-dark small text-uppercase">Nueva Orden de Compra</span>
              </div>
              {carrito.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none text-muted p-0 d-inline-flex align-items-center gap-1"
                  onClick={handleClearForm}
                >
                  <RotateCcw size={12} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
            <div className="card-body p-3 p-sm-4">
              <div className="btn-group w-100 mb-3" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${suppMode === 'existing' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSuppMode('existing')}
                >
                  Proveedor Habitual
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${suppMode === 'new' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSuppMode('new')}
                >
                  Nuevo Proveedor
                </button>
              </div>

              {suppMode === 'existing' ? (
                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Proveedor *
                  </label>
                  <select
                    className="form-select"
                    value={suppId}
                    onChange={e => setSuppId(e.target.value)}
                  >
                    <option value="">Seleccione una entidad proveedora</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.razon_social} {s.ruc ? `(${s.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="row g-2.5 mb-3">
                  <div className="col-8">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newRazon}
                      onChange={e => setNewRazon(e.target.value)}
                      placeholder="Empresa o Distribuidor"
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                      RUC
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newRuc}
                      onChange={e => setNewRuc(e.target.value)}
                      placeholder="11 dígitos"
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                  Producto *
                </label>
                <select
                  className="form-select"
                  value={selectedProdId}
                  onChange={e => {
                    setSelectedProdId(e.target.value);
                    const prod = products.find(p => p.id === Number(e.target.value));
                    if (prod && Number(prod.precio_compra || 0) > 0) {
                      setCosto(String(prod.precio_compra));
                    }
                  }}
                >
                  <option value="">Seleccione un producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2.5 mb-3">
                <div className="col-5">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={cantidad}
                    min="1"
                    onChange={e => setCantidad(e.target.value)}
                  />
                </div>
                <div className="col-5">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Costo Unit. (PEN) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={costo}
                    min="0"
                    onChange={e => setCosto(e.target.value)}
                  />
                </div>
                <div className="col-2 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 p-2 d-flex align-items-center justify-content-center"
                    onClick={handleAddItem}
                    title="Agregar al pedido"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {carrito.length > 0 && (
                <>
                  <div className="table-responsive mb-3 border rounded-3 overflow-hidden">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Ítem</th>
                          <th style={{ width: 60 }} className="text-center">Cant.</th>
                          <th style={{ width: 80 }} className="text-end">Costo</th>
                          <th style={{ width: 90 }} className="text-end">Subtotal</th>
                          <th style={{ width: 34 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carrito.map((item, index) => (
                          <tr key={index}>
                            <td className="small fw-semibold text-dark">{item.productoNombre}</td>
                            <td className="small text-center fw-bold">{item.cantidad}</td>
                            <td className="small text-end text-muted">{formatCurrency(item.costoUnitario)}</td>
                            <td className="small text-end fw-bold text-dark">
                              {formatCurrency(item.cantidad * item.costoUnitario)}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                                onClick={() => handleRemoveItem(index)}
                                title="Eliminar ítem"
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
                    className="btn btn-primary w-100 py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                    onClick={handleSubmitOrder}
                  >
                    <Receipt size={18} />
                    <span>Confirmar Orden de Compra</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Registro Histórico */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <Clock size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">
                Registro de Órdenes Recientes ({purchases.length})
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 80 }}>Folio</th>
                    <th>Proveedor</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">IGV</th>
                    <th className="text-end">Total</th>
                    <th>Fecha de Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPurchases.map(purchase => (
                    <tr key={purchase.id}>
                      <td className="text-muted small font-monospace fw-semibold">#{purchase.id}</td>
                      <td className="fw-semibold small text-dark">
                        {purchase.proveedores?.razon_social || `Proveedor #${purchase.proveedor_id}`}
                      </td>
                      <td className="text-muted small text-end">{formatCurrency(Number(purchase.subtotal || 0))}</td>
                      <td className="text-muted small text-end">{formatCurrency(Number(purchase.igv || 0))}</td>
                      <td className="text-end fw-bold text-primary small">
                        {formatCurrency(Number(purchase.total || 0))}
                      </td>
                      <td className="text-muted small">{formatDateTime(purchase.fecha_compra)}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5 small">
                        No se registran compras registradas en el período.
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
