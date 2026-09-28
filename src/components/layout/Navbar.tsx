import { useLocation } from 'react-router-dom';
import { Menu, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface PageInfo {
  title: string;
  sub: string;
}

const TITLES: Record<string, PageInfo> = {
  '/':            { title: 'Panel de Control',       sub: 'Resumen consolidado de operaciones'   },
  '/dashboard':   { title: 'Panel de Control',       sub: 'Resumen consolidado de operaciones'   },
  '/productos':   { title: 'Catálogo de Productos',  sub: 'Inventario, listas de precios y stock' },
  '/categorias':  { title: 'Gestión de Categorías',  sub: 'Clasificación y taxonomía de productos' },
  '/ventas':      { title: 'Punto de Venta (POS)',   sub: 'Emisión de comprobantes y facturación' },
  '/compras':     { title: 'Órdenes de Compra',      sub: 'Gestión de proveedores y abastecimiento' },
  '/movimientos': { title: 'Kardex de Inventario',   sub: 'Trazabilidad y auditoría de existencias' },
  '/usuarios':    { title: 'Control de Usuarios',    sub: 'Gestión de accesos, credenciales y roles' },
};

interface NavbarProps {
  lowStockCount?: number;
  onToggleSidebar?: () => void;
}

export default function Navbar({ lowStockCount = 0, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { session, isAdmin } = useAuth();
  const page = TITLES[pathname] || { title: 'StockMaster', sub: '' };

  return (
    <header className="navbar navbar-expand bg-white border-bottom py-2.5 px-3 px-md-4 sticky-top shadow-sm">
      <div className="d-flex align-items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="btn btn-light d-lg-none p-1.5 border text-dark rounded-3"
          onClick={onToggleSidebar}
          aria-label="Abrir navegación"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="h5 mb-0 fw-bold text-dark lh-sm">{page.title}</h1>
          <p className="text-muted small mb-0 d-none d-sm-block" style={{ fontSize: '.78rem' }}>
            {page.sub}
          </p>
        </div>
      </div>

      <div className="ms-auto d-flex align-items-center gap-2.5">
        {lowStockCount > 0 && (
          <span className="badge badge-soft-danger d-inline-flex align-items-center gap-1.5 py-1.5 px-2.5 rounded-pill fw-medium">
            <AlertTriangle size={14} className="text-danger" />
            <span className="d-none d-sm-inline">{lowStockCount} ítems con stock crítico</span>
            <span className="d-inline d-sm-none">{lowStockCount} alertas</span>
          </span>
        )}

        <div className="d-flex align-items-center gap-2 border-start ps-2.5 ms-1">
          <div
            className={`d-inline-flex align-items-center gap-1.5 py-1 px-2.5 rounded-pill small fw-medium ${
              isAdmin() ? 'badge-soft-primary' : 'badge-soft-success'
            }`}
          >
            {isAdmin() ? (
              <ShieldCheck size={14} />
            ) : (
              <User size={14} />
            )}
            <span className="d-none d-md-inline">{session?.displayName || (isAdmin() ? 'Administrador' : 'Vendedor')}</span>
            <span className="d-inline d-md-none">{isAdmin() ? 'Admin' : 'Ventas'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
