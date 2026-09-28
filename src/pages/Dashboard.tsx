import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Receipt,
  CheckCircle2,
  ArrowRight,
  ArrowLeftRight,
  Truck,
  Tags,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getSales } from '../services/ventaService';
import type { ProductoDB } from '../types/producto';
import type { VentaDB } from '../types/venta';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Dashboard() {
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [sales, setSales]       = useState<VentaDB[]>([]);
  const [loading, setLoading]   = useState<boolean>(true);

  useEffect(() => {
    Promise.all([getProducts(), getSales()])
      .then(([p, s]) => {
        setProducts(p);
        setSales(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const today = new Date().toISOString().slice(0, 10);
  const ventasHoy = sales.filter(s => {
    const f = s.fechaVenta || s.fecha_venta;
    return f && f.slice(0, 10) === today;
  });
  const ingresoHoy = ventasHoy.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalIngr  = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalIGV   = sales.reduce((a, s) => a + Number(s.igv || 0), 0);

  const lowStock = products.filter(p => {
    const st = Number(p.stock || 0);
    const min = Number(p.stockMinimo ?? p.stock_minimo ?? 5);
    return st > 0 && st <= min;
  });
  const outStock = products.filter(p => Number(p.stock || 0) === 0);

  const kpis = [
    {
      label: 'Facturación del Día',
      value: formatCurrency(ingresoHoy),
      meta: `${ventasHoy.length} ventas hoy`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-success-subtle text-success',
    },
    {
      label: 'Total de Ventas',
      value: String(sales.length),
      meta: 'Comprobantes emitidos',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-primary-subtle text-primary',
    },
    {
      label: 'Catálogo Activo',
      value: String(products.length),
      meta: 'Productos registrados',
      icon: Package,
      color: 'text-indigo-600',
      bg: 'bg-info-subtle text-info',
    },
    {
      label: 'Alertas de Stock',
      value: String(outStock.length + lowStock.length),
      meta: outStock.length > 0 ? `${outStock.length} sin existencias` : lowStock.length > 0 ? `${lowStock.length} nivel crítico` : 'Inventario óptimo',
      icon: AlertTriangle,
      color: outStock.length > 0 ? 'text-danger' : lowStock.length > 0 ? 'text-warning' : 'text-success',
      bg: outStock.length > 0 ? 'bg-danger-subtle text-danger' : lowStock.length > 0 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success',
    },
    ...(isAdmin() ? [
      {
        label: 'Ingresos Históricos',
        value: formatCurrency(totalIngr),
        meta: 'Monto bruto consolidado',
        icon: TrendingUp,
        color: 'text-primary',
        bg: 'bg-primary-subtle text-primary',
      },
      {
        label: 'IGV Recaudado',
        value: formatCurrency(totalIGV),
        meta: '18% tributario acumulado',
        icon: Receipt,
        color: 'text-purple-600',
        bg: 'bg-secondary-subtle text-dark',
      },
    ] : []),
  ];

  return (
    <>
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h4 mb-0 fw-bold text-dark">Bienvenido, {session?.displayName || session?.username}</h1>
            <span className="badge badge-soft-primary px-2.5 py-1 rounded-pill">
              <Sparkles size={12} className="me-1" />
              {isAdmin() ? 'Administrador' : 'Ventas'}
            </span>
          </div>
          <p className="text-muted mb-0 small">
            Supervisión integral de inventario, ventas y estado operacional en tiempo real
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
            onClick={() => navigate('/ventas')}
          >
            <ShoppingCart size={16} />
            <span>Punto de Venta</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="col-12 col-sm-6 col-md-4 col-xl-2">
              <div className="card h-100 p-3 border-0 shadow-sm rounded-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: '.68rem', letterSpacing: '.05em' }}>
                    {k.label}
                  </span>
                  <div
                    className={`rounded-2 d-flex align-items-center justify-content-center ${k.bg}`}
                    style={{ width: 32, height: 32 }}
                  >
                    <Icon size={16} />
                  </div>
                </div>
                <div className="h4 mb-1 fw-bold text-dark">{k.value}</div>
                <div className="text-muted" style={{ fontSize: '.74rem' }}>{k.meta}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Alerts + Quick Actions */}
      <div className="row g-4 mb-4">
        {/* Inventory Alerts */}
        <div className="col-12 col-lg-6">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <AlertTriangle size={18} className="text-warning" />
                <span className="fw-bold text-dark small text-uppercase">Novedades de Inventario</span>
              </div>
              {(outStock.length > 0 || lowStock.length > 0) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-2 d-inline-flex align-items-center gap-1"
                  onClick={() => navigate('/productos')}
                >
                  <span>Ver catálogo</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
            <div className="card-body p-3">
              {outStock.length === 0 && lowStock.length === 0 ? (
                <div className="text-center py-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success mx-auto d-flex align-items-center justify-content-center mb-2"
                    style={{ width: 44, height: 44 }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="fw-semibold text-dark small">Inventario en estado óptimo</div>
                  <div className="text-muted small mt-1">Todos los artículos registrados superan su stock mínimo.</div>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {outStock.map(p => (
                    <div
                      key={p.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-2 py-2.5 border-bottom border-light"
                    >
                      <div>
                        <div className="fw-semibold small text-dark">{p.nombre}</div>
                        <span className="text-muted" style={{ fontSize: '.72rem' }}>SKU: {p.sku || 'N/A'}</span>
                      </div>
                      <span className="badge badge-soft-danger px-2.5 py-1 rounded-pill fw-medium">
                        Sin existencias
                      </span>
                    </div>
                  ))}
                  {lowStock.map(p => (
                    <div
                      key={p.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-2 py-2.5 border-bottom border-light"
                    >
                      <div>
                        <div className="fw-medium small text-dark">{p.nombre}</div>
                        <span className="text-muted" style={{ fontSize: '.72rem' }}>SKU: {p.sku || 'N/A'}</span>
                      </div>
                      <span className="badge badge-soft-warning px-2.5 py-1 rounded-pill fw-medium">
                        {p.stock} unid. (Mín: {p.stockMinimo ?? p.stock_minimo ?? 5})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation Modules */}
        <div className="col-12 col-lg-6">
          <div className="card h-100 border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Acceso Directo a Módulos</span>
            </div>
            <div className="card-body p-3">
              <div className="row g-2.5">
                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                    onClick={() => navigate('/ventas')}
                  >
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <ShoppingCart size={20} className="text-primary" />
                      <ArrowRight size={14} className="text-muted" />
                    </div>
                    <div>
                      <div className="fw-bold small text-dark">Punto de Venta</div>
                      <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Emisión de boletas</small>
                    </div>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                    onClick={() => navigate('/productos')}
                  >
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <Package size={20} className="text-secondary" />
                      <ArrowRight size={14} className="text-muted" />
                    </div>
                    <div>
                      <div className="fw-bold small text-dark">Catálogo</div>
                      <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Precios y stock</small>
                    </div>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                    onClick={() => navigate('/movimientos')}
                  >
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <ArrowLeftRight size={20} className="text-secondary" />
                      <ArrowRight size={14} className="text-muted" />
                    </div>
                    <div>
                      <div className="fw-bold small text-dark">Kardex</div>
                      <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Entradas y salidas</small>
                    </div>
                  </button>
                </div>

                {isAdmin() && (
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                      onClick={() => navigate('/compras')}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <Truck size={20} className="text-secondary" />
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-bold small text-dark">Compras</div>
                        <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Gestión de proveedores</small>
                      </div>
                    </button>
                  </div>
                )}

                {isAdmin() && (
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                      onClick={() => navigate('/categorias')}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <Tags size={20} className="text-secondary" />
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-bold small text-dark">Categorías</div>
                        <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Clasificación</small>
                      </div>
                    </button>
                  </div>
                )}

                {isAdmin() && (
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 transition-all shadow-none"
                      onClick={() => navigate('/usuarios')}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <Users size={20} className="text-secondary" />
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-bold small text-dark">Usuarios</div>
                        <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Roles y accesos</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <Clock size={18} className="text-primary" />
            <span className="fw-bold text-dark small text-uppercase">Últimas Transacciones Registradas</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-link text-decoration-none text-primary p-0 d-inline-flex align-items-center gap-1"
            onClick={() => navigate('/ventas')}
          >
            <span>Ver historial completo</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 140 }}>Nº Comprobante</th>
                <th>Cliente</th>
                <th className="text-end">Subtotal</th>
                <th className="text-end">IGV (18%)</th>
                <th className="text-end">Total Liquidado</th>
                <th style={{ width: 130 }}>Estado</th>
                <th style={{ width: 170 }}>Fecha y Hora</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 8).map(s => (
                <tr key={s.id}>
                  <td className="text-muted small font-monospace fw-semibold">{s.numeroBoleta || s.numero_boleta}</td>
                  <td className="fw-semibold small text-dark">{s.cliente}</td>
                  <td className="text-muted small text-end">{formatCurrency(Number(s.subtotal || 0))}</td>
                  <td className="text-muted small text-end">{formatCurrency(Number(s.igv || 0))}</td>
                  <td className="text-end fw-bold text-primary small">{formatCurrency(Number(s.total || 0))}</td>
                  <td>
                    <span className={`badge py-1 px-2.5 rounded-pill ${s.estado === 'completada' ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                      {s.estado === 'completada' ? 'Completada' : 'Anulada'}
                    </span>
                  </td>
                  <td className="text-muted small">{formatDateTime(s.fechaVenta || s.fecha_venta)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5 small">
                    No se registran transacciones en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
