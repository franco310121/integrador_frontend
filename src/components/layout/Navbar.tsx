import { useLocation, Link } from 'react-router-dom';
import {
  Menu, LayoutDashboard, Package, ShoppingCart, Receipt, RotateCcw,
  Users, ArrowLeftRight, UserRound, PlusCircle, Tags, BarChart3,
  Sparkles, AlertTriangle, Building2, Wallet, FileUp, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoIcon from '../../assets/images/logo-icon.png';
import './Navbar.css';

interface PageInfo {
  title: string;
  sub: string;
  icon: LucideIcon;
  tag?: string;
}

const TITLES: Record<string, PageInfo> = {
  '/importacion-financiera': { title: 'Importación financiera', sub: 'Carga y validación de datos de caja', icon: FileUp, tag: 'Finanzas' },
  '/movimientos-financieros': { title: 'Movimientos financieros', sub: 'Ingresos, egresos e histórico de caja', icon: Wallet, tag: 'Finanzas' },
  '/empresa': { title: 'Mi empresa', sub: 'Identificación y contacto de la MYPE', icon: Building2, tag: 'Administración' },
  '/flujo-caja': { title: 'Flujo de caja', sub: 'Proyecciones y alertas de liquidez', icon: BarChart3, tag: 'Finanzas' },
  '/':           { title: 'Dashboard',         sub: 'Resumen general del sistema',                      icon: LayoutDashboard, tag: 'Principal' },
  '/dashboard':  { title: 'Dashboard',         sub: 'Resumen general del sistema',                      icon: LayoutDashboard, tag: 'Principal' },
  '/inventory':  { title: 'Inventario',         sub: 'Gestión de productos y existencias',               icon: Package, tag: 'Catálogo'  },
  '/productos':  { title: 'Inventario',         sub: 'Gestión de productos y existencias',               icon: Package, tag: 'Catálogo'  },
  '/sales':           { title: 'Ventas (POS)',         sub: 'Terminal de ventas y catálogo comercial',          icon: ShoppingCart, tag: 'Comercial' },
  '/ventas':          { title: 'Ventas (POS)',         sub: 'Terminal de ventas y catálogo comercial',          icon: ShoppingCart, tag: 'Comercial' },
  '/comprobantes':    { title: 'Historial de Comprobantes', sub: 'Auditoría de boletas y facturas emitidas',   icon: Receipt, tag: 'Comprobantes' },
  '/historial-ventas':{ title: 'Historial de Comprobantes', sub: 'Auditoría de boletas y facturas emitidas',   icon: Receipt, tag: 'Comprobantes' },
  '/devoluciones':    { title: 'Devoluciones',         sub: 'Reingreso a stock y gestión de mermas',            icon: RotateCcw, tag: 'Operaciones' },
  '/returns':         { title: 'Devoluciones',         sub: 'Reingreso a stock y gestión de mermas',            icon: RotateCcw, tag: 'Operaciones' },
  '/clientes':        { title: 'Clientes',             sub: 'Directorio y registro por DNI o RUC',              icon: Users, tag: 'Directorio' },
  '/customers':       { title: 'Clientes',             sub: 'Directorio y registro por DNI o RUC',              icon: Users, tag: 'Directorio' },
  '/movements':  { title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)', icon: ArrowLeftRight, tag: 'Kardex'    },
  '/movimientos':{ title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)', icon: ArrowLeftRight, tag: 'Kardex'    },
  '/auditoria':  { title: 'Auditoría y Kardex', sub: 'Trazabilidad y libro de movimientos',             icon: ArrowLeftRight, tag: 'Kardex'    },
  '/profile':    { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal',   icon: UserRound, tag: 'Cuenta'    },
  '/perfil':     { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal',   icon: UserRound, tag: 'Cuenta'    },
  '/purchase':   { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores',      icon: ShoppingCart, tag: 'Gestión'   },
  '/compras':    { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores',      icon: ShoppingCart, tag: 'Gestión'   },
  '/register':   { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados',       icon: PlusCircle, tag: 'Catálogo'  },
  '/registrar':  { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados',       icon: PlusCircle, tag: 'Catálogo'  },
  '/categories': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo',             icon: Tags, tag: 'Catálogo'  },
  '/categorias': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo',             icon: Tags, tag: 'Catálogo'  },
  '/users':      { title: 'Usuarios',           sub: 'Control de accesos y administración de roles',     icon: Users, tag: 'Seguridad' },
  '/usuarios':   { title: 'Usuarios',           sub: 'Control de accesos y administración de roles',     icon: Users, tag: 'Seguridad' },
  '/reports':    { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance',      icon: BarChart3, tag: 'Finanzas'  },
  '/reportes':   { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance',      icon: BarChart3, tag: 'Finanzas'  },
};

interface NavbarProps {
  lowStockCount?: number;
  onToggleSidebar?: () => void;
}

export default function Navbar({ lowStockCount = 0, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { session, isAdmin } = useAuth();

  const page = TITLES[pathname] || {
    title: 'Finvora',
    sub: 'Gestión de Inventario y Operaciones',
    icon: Sparkles,
    tag: 'ERP',
  };

  const PageIcon = page.icon;

  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <header className="app-navbar navbar sticky-top px-3 px-md-4 py-2 d-flex align-items-center justify-content-between">
      <div className="navbar-main d-flex align-items-center gap-2 gap-sm-3">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-sm btn-nav-toggle border rounded-3 p-2 shadow-none d-lg-none"
            onClick={onToggleSidebar}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        )}

        <Link to="/" className="navbar-brand d-flex d-lg-none align-items-center gap-2 text-decoration-none me-1 flex-shrink-0">
          <div className="navbar-logo-badge d-flex align-items-center justify-content-center">
            <img src={logoIcon} alt="Finvora" className="navbar-logo-img" />
          </div>
          <span className="navbar-brand-name fw-bold d-none d-sm-inline">
            Finvora
          </span>
        </Link>

        <div className="navbar-vr d-none d-sm-block d-lg-none flex-shrink-0" />

        <div className="navbar-page-group d-flex align-items-center gap-2 overflow-hidden">
          <div className="navbar-module-icon-badge d-none d-lg-flex align-items-center justify-content-center flex-shrink-0">
            <PageIcon size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="navbar-page-copy d-flex flex-column overflow-hidden">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold navbar-page-title text-truncate">{page.title}</h5>
              {page.tag && (
                <span className="badge badge-module-subtle text-uppercase d-none d-xl-inline-block">
                  {page.tag}
                </span>
              )}
            </div>
            <p className="navbar-page-sub mb-0 d-none d-md-block text-truncate">{page.sub}</p>
          </div>
        </div>
      </div>

      <div className="navbar-actions d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        {lowStockCount > 0 && (
          <Link
            to="/inventory"
            className="badge badge-stock-alert text-decoration-none d-inline-flex align-items-center gap-2 py-2 px-2 px-sm-3 rounded-pill"
            title="Existencias críticas"
            aria-label={`${lowStockCount} productos con stock bajo`}
          >
            <AlertTriangle size={14} aria-hidden="true" />
            <span className="fw-semibold">{lowStockCount}<span className="navbar-stock-label"> stock bajo</span></span>
          </Link>
        )}

        <Link
          to="/profile"
          className="navbar-user-chip d-flex align-items-center gap-2 text-decoration-none rounded-pill"
          title="Mi Perfil"
          aria-label="Mi Perfil"
        >
          <div className="navbar-avatar rounded-circle d-flex align-items-center justify-content-center text-white fw-bold">
            {initial}
          </div>
          <div className="d-none d-md-flex flex-column text-start">
            <span className="navbar-user-name fw-semibold text-truncate" style={{ maxWidth: 220 }}>
              {session?.displayName || session?.username || 'Usuario'}
            </span>
            <span className="navbar-user-role">
              {isAdmin() ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
