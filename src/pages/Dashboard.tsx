import { useState, useEffect, useCallback } from 'react';
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
  Clock,
  Sparkles,
  BarChart3,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/productoService';
import { getSales } from '../services/ventaService';
import type { ProductoDB } from '../types/producto';
import type { VentaDB } from '../types/venta';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { STOCK_UPDATED_EVENT } from '../utils/stockEvents';
import FinancialDashboard from '../components/FinancialDashboard';
import { dateKey } from '../utils/cashFlow';

const dashboardStyles = `
/* Estilos limitados a este componente para convivir con Bootstrap y el CSS global. */
.finvora-dashboard {
  --fv-ink: #19113e;
  --fv-primary: #27187e;
  --fv-muted: #727799;
  --fv-line: #e8e5f5;
  --fv-soft: #f7f7ff;
  color: var(--fv-ink);
  background: radial-gradient(ellipse at 95% 0%, #ede9fc 0%, transparent 42%), #f7f7ff;
  border: 1px solid #eeebfa;
  border-radius: 28px;
  padding: clamp(18px, 2.5vw, 32px);
  isolation: isolate;
  min-width: 0;
}
.finvora-dashboard .text-dark { color: var(--fv-ink) !important; }
.finvora-dashboard .text-muted { color: var(--fv-muted) !important; }
.finvora-dashboard .text-primary { color: var(--fv-primary) !important; }
.finvora-dashboard .text-secondary { color: #796aa8 !important; }
.finvora-dashboard .border-bottom { border-color: var(--fv-line) !important; }
.finvora-dashboard .fv-hero {
  position: relative;
  overflow: hidden;
  padding: clamp(22px, 3vw, 36px);
  border: 1px solid #ffffff;
  border-radius: 24px;
  background: linear-gradient(120deg, #ffffff 25%, #f0edff 100%);
  box-shadow: 0 12px 34px rgba(39, 24, 126, .05);
}
.finvora-dashboard .fv-hero::after {
  content: '';
  position: absolute;
  width: 240px;
  height: 240px;
  right: -60px;
  top: -120px;
  border: 36px solid rgba(95, 66, 224, .035);
  border-radius: 50%;
  pointer-events: none;
  z-index: -1;
}
.finvora-dashboard .fv-eyebrow {
  color: #64548f;
  font-size: .66rem;
  font-weight: 700;
  letter-spacing: .16em;
  margin-bottom: 12px;
}
.finvora-dashboard h1 { font-size: clamp(1.35rem, 2.1vw, 1.9rem); letter-spacing: -.04em; }
.finvora-dashboard .fv-hero p { max-width: 580px; line-height: 1.7; }
.finvora-dashboard .badge-soft-primary {
  background: #eeebff !important;
  color: var(--fv-primary) !important;
  border: 1px solid #e4dffe !important;
  font-weight: 600;
}
.finvora-dashboard .fv-primary-btn {
  background: var(--fv-primary) !important;
  border: 1px solid var(--fv-primary) !important;
  color: #ffffff !important;
  border-radius: 12px;
  padding: 13px 20px;
  box-shadow: 0 5px 12px rgba(39, 24, 126, .16) !important;
  white-space: nowrap;
  font-size: .85rem;
  font-weight: 600;
}
.finvora-dashboard .fv-primary-btn:hover { background: #38249f !important; transform: translateY(-1px); }
.finvora-dashboard .card {
  background: #ffffff !important;
  color: var(--fv-ink);
  border: 1px solid var(--fv-line) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 26px rgba(39, 24, 126, .045) !important;
  overflow: hidden;
}
.finvora-dashboard .fv-kpi { padding: 22px !important; }
.finvora-dashboard .fv-kpi-label {
  text-transform: none !important;
  font-size: .78rem !important;
  letter-spacing: 0 !important;
}
.finvora-dashboard .fv-kpi-value {
  color: var(--fv-primary) !important;
  font-size: clamp(1.4rem, 2vw, 1.85rem);
  letter-spacing: -.045em;
  margin-top: 16px;
  margin-bottom: 7px !important;
  overflow-wrap: anywhere;
}
.finvora-dashboard .fv-kpi-icon {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px;
  border-radius: 12px !important;
  background: #efecff !important;
  color: var(--fv-primary) !important;
}
.finvora-dashboard .fv-kpi-icon.text-danger { background: #fff0f3 !important; color: #b52d50 !important; }
.finvora-dashboard .fv-kpi-icon.text-warning { background: #fff5e5 !important; color: #956107 !important; }
.finvora-dashboard .fv-kpi-icon.text-success { background: #ecf8f3 !important; color: #237554 !important; }
.finvora-dashboard .card-header {
  background: #ffffff !important;
  border-bottom: 1px solid var(--fv-line) !important;
  padding: 20px 22px !important;
  gap: 12px;
  flex-wrap: wrap;
}
.finvora-dashboard .card-header .text-uppercase {
  text-transform: none !important;
  font-size: .9rem;
  letter-spacing: -.015em;
}
.finvora-dashboard .card-body { padding: 20px 22px !important; }
.finvora-dashboard .fv-outline-btn {
  border: 1px solid #ddd7f6 !important;
  background: #f7f5ff !important;
  color: var(--fv-primary) !important;
  border-radius: 9px !important;
  font-size: .73rem;
  padding: 7px 10px !important;
}
.finvora-dashboard .fv-outline-btn:hover { background: #eeebff !important; }
.finvora-dashboard .list-group-item {
  background: #ffffff !important;
  color: var(--fv-ink) !important;
  border-color: var(--fv-line) !important;
  gap: 12px;
  padding: 14px 0 !important;
  flex-wrap: wrap;
}
.finvora-dashboard .list-group-item:last-child { border-bottom: 0 !important; }
.finvora-dashboard .badge-soft-danger { color: #aa284b !important; background: #fff0f3 !important; border: 1px solid #f7d9e1 !important; }
.finvora-dashboard .badge-soft-warning { color: #8a5b06 !important; background: #fff6e6 !important; border: 1px solid #f3e2ba !important; }
.finvora-dashboard .badge-soft-success { color: #237554 !important; background: #edf8f2 !important; border: 1px solid #d5ecdf !important; }
.finvora-dashboard .fv-empty-icon { background: #edf8f2 !important; color: #237554 !important; width: 56px !important; height: 56px !important; }
.finvora-dashboard .fv-module {
  background: #faf9ff !important;
  border: 1px solid #ebe7f8 !important;
  color: var(--fv-primary) !important;
  border-radius: 14px !important;
  padding: 17px !important;
  gap: 14px !important;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}
.finvora-dashboard .fv-module:hover {
  background: #f0ecff !important;
  border-color: #cfc5f5 !important;
  transform: translateY(-2px);
}
.finvora-dashboard .fv-module svg:first-child { color: #6650bd !important; }
.finvora-dashboard .fv-module-featured { background: #efebff !important; border-color: #dfd6ff !important; }
.finvora-dashboard .fv-history-btn { color: var(--fv-primary) !important; font-size: .75rem; font-weight: 600; }
.finvora-dashboard .fv-history-btn:hover { color: #6243bd !important; }
.finvora-dashboard .table {
  --bs-table-bg: #ffffff;
  --bs-table-color: var(--fv-ink);
  --bs-table-border-color: var(--fv-line);
  --bs-table-hover-bg: #f7f5ff;
  --bs-table-hover-color: var(--fv-ink);
  --bs-table-striped-bg: #faf9ff;
  min-width: 860px;
  color: var(--fv-ink) !important;
  border-color: var(--fv-line) !important;
}
.finvora-dashboard .table > :not(caption) > * > * {
  background-color: #ffffff !important;
  border-color: var(--fv-line) !important;
  padding: 16px 20px;
}
.finvora-dashboard .table thead th {
  background: #f9f8ff !important;
  color: #77708f !important;
  font-size: .65rem;
  white-space: nowrap;
}
.finvora-dashboard .table-hover tbody tr:hover > * { background: #f7f5ff !important; }
.finvora-dashboard .badge { padding: 6px 10px !important; line-height: 1.25; white-space: normal; }
.finvora-dashboard .btn:focus-visible {
  outline: 3px solid #9b88df;
  outline-offset: 3px;
  box-shadow: none !important;
}
@media (max-width: 575.98px) {
  .finvora-dashboard { border-radius: 20px; padding: 14px; }
  .finvora-dashboard .fv-hero { padding: 22px 18px; }
  .finvora-dashboard .fv-primary-btn { width: 100%; justify-content: center; }
  .finvora-dashboard .fv-hero-actions { width: 100%; }
  .finvora-dashboard .card-header, .finvora-dashboard .card-body { padding: 18px !important; }
  .finvora-dashboard .fv-module { padding: 14px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .finvora-dashboard .btn, .finvora-dashboard .card { transition: none; }
  .finvora-dashboard .btn:hover { transform: none; }
}
`;

export default function Dashboard() {
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [sales, setSales]       = useState<VentaDB[]>([]);
  const [loading, setLoading]   = useState<boolean>(true);
  const [operationalError, setOperationalError] = useState(false);

  const reloadData = useCallback(() => {
    Promise.all([getProducts(), getSales()])
      .then(([p, s]) => {
        setProducts(p);
        setSales(s);
        setOperationalError(false);
      })
      .catch(() => setOperationalError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Actualización en tiempo real ante eventos, cambio de pestaña o polling cada 6s
  useEffect(() => {
    const handleStockUpdate = () => reloadData();
    window.addEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
    window.addEventListener('focus', handleStockUpdate);

    const interval = setInterval(reloadData, 6000);

    return () => {
      window.removeEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
      window.removeEventListener('focus', handleStockUpdate);
      clearInterval(interval);
    };
  }, [reloadData]);

  const today = dateKey(new Date());
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
      label: 'Facturación Histórica',
        value: formatCurrency(totalIngr),
        meta: 'Monto bruto consolidado',
        icon: TrendingUp,
        color: 'text-primary',
        bg: 'bg-primary-subtle text-primary',
      },
      {
        label: 'IGV en Comprobantes',
        value: formatCurrency(totalIGV),
        meta: '18% tributario acumulado',
        icon: Receipt,
        color: 'text-purple-600',
        bg: 'bg-secondary-subtle text-dark',
      },
    ] : []),
  ];

  return (
    <section className="finvora-dashboard" aria-label="Panel de control Finvora">
      <style>{dashboardStyles}</style>
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 fv-hero">
        <div>
          <div className="fv-eyebrow">FINVORA / PANEL DE CONTROL</div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h1 className="h4 mb-0 fw-bold text-dark">Bienvenido, {session?.displayName || session?.username}</h1>
            <span className="badge badge-soft-primary px-2 py-1 rounded-pill">
              <Sparkles size={12} className="me-1" />
              {isAdmin() ? 'Administrador' : 'Ventas'}
            </span>
          </div>
          <p className="text-muted mb-0 small">
            Consulta tu caja, planificación financiera, ventas e inventario
          </p>
        </div>
        <div className="d-flex gap-2 fv-hero-actions">
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2 fv-primary-btn"
            onClick={() => navigate('/ventas')}
          >
            <ShoppingCart size={16} />
            <span>Punto de Venta</span>
          </button>
        </div>
      </div>

      <FinancialDashboard />
      <h2 className="h5 fw-bold mb-3">Ventas e inventario</h2>
      {loading ? <Loader /> : operationalError ? <div className="alert alert-warning">No se pudieron actualizar ventas e inventario desde el servidor. El panel financiero muestra los datos locales disponibles.</div> : <>
      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={`col-12 col-sm-6 ${kpis.length > 4 ? 'col-xl-4' : 'col-xl-3'}`}>
              <div className="card h-100 p-3 fv-kpi">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold small text-uppercase fv-kpi-label" style={{ fontSize: '.68rem', letterSpacing: '.05em' }}>
                    {k.label}
                  </span>
                  <div
                    className={`rounded-2 d-flex align-items-center justify-content-center ${k.bg} fv-kpi-icon`}
                    style={{ width: 32, height: 32 }}
                  >
                    <Icon size={16} />
                  </div>
                </div>
                <div className="h4 mb-1 fw-bold text-dark fv-kpi-value">{k.value}</div>
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
                  className="btn btn-sm btn-outline-secondary py-1 px-2 rounded-2 d-inline-flex align-items-center gap-1 fv-outline-btn"
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
                    className="fv-empty-icon rounded-circle bg-success-subtle text-success mx-auto d-flex align-items-center justify-content-center mb-2"
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
                      className="list-group-item d-flex justify-content-between align-items-center px-2 py-3 border-bottom border-light"
                    >
                      <div>
                        <div className="fw-semibold small text-dark">{p.nombre}</div>
                        <span className="text-muted" style={{ fontSize: '.72rem' }}>SKU: {p.sku || 'N/A'}</span>
                      </div>
                      <span className="badge badge-soft-danger px-2 py-1 rounded-pill fw-medium">
                        Sin existencias
                      </span>
                    </div>
                  ))}
                  {lowStock.map(p => (
                    <div
                      key={p.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-2 py-3 border-bottom border-light"
                    >
                      <div>
                        <div className="fw-medium small text-dark">{p.nombre}</div>
                        <span className="text-muted" style={{ fontSize: '.72rem' }}>SKU: {p.sku || 'N/A'}</span>
                      </div>
                      <span className="badge badge-soft-warning px-2 py-1 rounded-pill fw-medium">
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
              <div className="row g-3">
                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-outline-primary fv-module-featured w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
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
                    className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
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
                    className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
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
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
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
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
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
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
                      onClick={() => navigate('/register')}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <PlusCircle size={20} className="text-secondary" />
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-bold small text-dark">Reg. Producto</div>
                        <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Pendientes de precio</small>
                      </div>
                    </button>
                  </div>
                )}

                {isAdmin() && (
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100 p-3 text-start rounded-3 d-flex flex-column gap-2 h-100 shadow-none fv-module"
                      onClick={() => navigate('/reports')}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <BarChart3 size={20} className="text-secondary" />
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-bold small text-dark">Reportes</div>
                        <small className="text-muted d-block" style={{ fontSize: '.72rem' }}>Rentabilidad y CSV</small>
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
            className="btn btn-sm btn-link text-decoration-none text-primary p-0 d-inline-flex align-items-center gap-1 fv-history-btn"
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
                    <span className={`badge py-1 px-2 rounded-pill ${s.estado === 'completada' ? 'badge-soft-success' : 'badge-soft-danger'}`}>
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
      </>}
    </section>
  );
}
