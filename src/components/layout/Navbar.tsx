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
  '/importacion-financiera': { title: 'Cargar desde Excel (CSV)', sub: 'Sube tus ingresos y gastos desde una hoja de cálculo', icon: FileUp, tag: 'Mi dinero' },
  '/movimientos-financieros': { title: 'Ingresos y gastos', sub: 'Registra el dinero que recibes y los pagos que realizas', icon: Wallet, tag: 'Mi dinero' },
  '/empresa': { title: 'Datos de mi negocio', sub: 'Información y contacto de tu empresa', icon: Building2, tag: 'Mi negocio' },
  '/flujo-caja': { title: 'Dinero disponible y proyecciones', sub: 'Estimación de tus próximos ingresos, gastos y alertas', icon: BarChart3, tag: 'Mi dinero' },
  '/':           { title: 'Resumen de mi negocio', sub: '¿Cuánto dinero tienes hoy y cómo van tus ventas?', icon: LayoutDashboard, tag: 'Principal' },
  '/dashboard':  { title: 'Resumen de mi negocio', sub: '¿Cuánto dinero tienes hoy y cómo van tus ventas?', icon: LayoutDashboard, tag: 'Principal' },
  '/inventory':  { title: 'Mis productos',      sub: 'Consulta y actualiza precios y stock disponible',  icon: Package, tag: 'Tienda'  },
  '/productos':  { title: 'Mis productos',      sub: 'Consulta y actualiza precios y stock disponible',  icon: Package, tag: 'Tienda'  },
  '/sales':           { title: 'Vender (Punto de venta)', sub: 'Registra una venta rápida a tus clientes', icon: ShoppingCart, tag: 'Ventas' },
  '/ventas':          { title: 'Vender (Punto de venta)', sub: 'Registra una venta rápida a tus clientes', icon: ShoppingCart, tag: 'Ventas' },
  '/comprobantes':    { title: 'Boletas emitidas', sub: 'Consulta las ventas y comprobantes entregados',   icon: Receipt, tag: 'Ventas' },
  '/historial-ventas':{ title: 'Boletas emitidas', sub: 'Consulta las ventas y comprobantes entregados',   icon: Receipt, tag: 'Ventas' },
  '/devoluciones':    { title: 'Devoluciones',         sub: 'Registra productos devueltos por clientes',       icon: RotateCcw, tag: 'Tienda' },
  '/returns':         { title: 'Devoluciones',         sub: 'Registra productos devueltos por clientes',       icon: RotateCcw, tag: 'Tienda' },
  '/clientes':        { title: 'Clientes',             sub: 'Directorio de clientes por DNI o RUC',            icon: Users, tag: 'Ventas' },
  '/customers':       { title: 'Clientes',             sub: 'Directorio de clientes por DNI o RUC',            icon: Users, tag: 'Ventas' },
  '/movements':  { title: 'Entradas y salidas de productos', sub: 'Historial de cambios en tu mercadería', icon: ArrowLeftRight, tag: 'Tienda'    },
  '/movimientos':{ title: 'Entradas y salidas de productos', sub: 'Historial de cambios en tu mercadería', icon: ArrowLeftRight, tag: 'Tienda'    },
  '/auditoria':  { title: 'Historial de actividad', sub: 'Registro de acciones realizadas en el negocio',  icon: ArrowLeftRight, tag: 'Tienda'    },
  '/profile':    { title: 'Mi cuenta',          sub: 'Tus datos personales y contraseña de acceso',      icon: UserRound, tag: 'Cuenta'    },
  '/perfil':     { title: 'Mi cuenta',          sub: 'Tus datos personales y contraseña de acceso',      icon: UserRound, tag: 'Cuenta'    },
  '/purchase':   { title: 'Compras a proveedores', sub: 'Registra ingreso de mercadería y proveedores',   icon: ShoppingCart, tag: 'Gestión'   },
  '/compras':    { title: 'Compras a proveedores', sub: 'Registra ingreso de mercadería y proveedores',   icon: ShoppingCart, tag: 'Gestión'   },
  '/register':   { title: 'Nuevo producto',     sub: 'Agrega un nuevo producto a tu tienda',            icon: PlusCircle, tag: 'Tienda'  },
  '/registrar':  { title: 'Nuevo producto',     sub: 'Agrega un nuevo producto a tu tienda',            icon: PlusCircle, tag: 'Tienda'  },
  '/categories': { title: 'Categorías',         sub: 'Organiza tus productos por tipo',                  icon: Tags, tag: 'Tienda'  },
  '/categorias': { title: 'Categorías',         sub: 'Organiza tus productos por tipo',                  icon: Tags, tag: 'Tienda'  },
  '/users':      { title: 'Equipo y permisos',  sub: 'Administra quién puede entrar y qué puede hacer',  icon: Users, tag: 'Equipo' },
  '/usuarios':   { title: 'Equipo y permisos',  sub: 'Administra quién puede entrar y qué puede hacer',  icon: Users, tag: 'Equipo' },
  '/reports':    { title: 'Reportes del negocio', sub: 'Resumen de ventas, compras y descargas en Excel', icon: BarChart3, tag: 'Mi dinero'  },
  '/reportes':   { title: 'Reportes del negocio', sub: 'Resumen de ventas, compras y descargas en Excel', icon: BarChart3, tag: 'Mi dinero'  },
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
