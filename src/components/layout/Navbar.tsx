import { useLocation, Link } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoIcon from '../../assets/images/logo-icon.png';
import './Navbar.css';

interface PageInfo {
  title: string;
  sub: string;
  icon: string;
  tag?: string;
}

const TITLES: Record<string, PageInfo> = {
  '/':           { title: 'Dashboard',         sub: 'Resumen general del sistema',                      icon: '⊞', tag: 'Principal' },
  '/dashboard':  { title: 'Dashboard',         sub: 'Resumen general del sistema',                      icon: '⊞', tag: 'Principal' },
  '/inventory':  { title: 'Inventario',         sub: 'Gestión de productos y existencias',               icon: '📦', tag: 'Catálogo'  },
  '/productos':  { title: 'Inventario',         sub: 'Gestión de productos y existencias',               icon: '📦', tag: 'Catálogo'  },
  '/sales':           { title: 'Ventas (POS)',         sub: 'Terminal de ventas y catálogo comercial',          icon: '◈', tag: 'Comercial' },
  '/ventas':          { title: 'Ventas (POS)',         sub: 'Terminal de ventas y catálogo comercial',          icon: '◈', tag: 'Comercial' },
  '/comprobantes':    { title: 'Historial de Comprobantes', sub: 'Auditoría de boletas y facturas emitidas',   icon: '🧾', tag: 'Comprobantes' },
  '/historial-ventas':{ title: 'Historial de Comprobantes', sub: 'Auditoría de boletas y facturas emitidas',   icon: '🧾', tag: 'Comprobantes' },
  '/devoluciones':    { title: 'Devoluciones',         sub: 'Reingreso a stock y gestión de mermas',            icon: '🔄', tag: 'Operaciones' },
  '/returns':         { title: 'Devoluciones',         sub: 'Reingreso a stock y gestión de mermas',            icon: '🔄', tag: 'Operaciones' },
  '/clientes':        { title: 'Clientes',             sub: 'Directorio y registro por DNI o RUC',              icon: '👥', tag: 'Directorio' },
  '/customers':       { title: 'Clientes',             sub: 'Directorio y registro por DNI o RUC',              icon: '👥', tag: 'Directorio' },
  '/movements':  { title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)', icon: '↕', tag: 'Kardex'    },
  '/movimientos':{ title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)', icon: '↕', tag: 'Kardex'    },
  '/auditoria':  { title: 'Auditoría y Kardex', sub: 'Trazabilidad y libro de movimientos',             icon: '↕', tag: 'Kardex'    },
  '/profile':    { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal',   icon: '👤', tag: 'Cuenta'    },
  '/perfil':     { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal',   icon: '👤', tag: 'Cuenta'    },
  '/purchase':   { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores',      icon: '🛒', tag: 'Gestión'   },
  '/compras':    { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores',      icon: '🛒', tag: 'Gestión'   },
  '/register':   { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados',       icon: '✚', tag: 'Catálogo'  },
  '/registrar':  { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados',       icon: '✚', tag: 'Catálogo'  },
  '/categories': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo',             icon: '🏷', tag: 'Catálogo'  },
  '/categorias': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo',             icon: '🏷', tag: 'Catálogo'  },
  '/users':      { title: 'Usuarios',           sub: 'Control de accesos y administración de roles',     icon: '👥', tag: 'Seguridad' },
  '/usuarios':   { title: 'Usuarios',           sub: 'Control de accesos y administración de roles',     icon: '👥', tag: 'Seguridad' },
  '/reports':    { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance',      icon: '📊', tag: 'Finanzas'  },
  '/reportes':   { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance',      icon: '📊', tag: 'Finanzas'  },
};

interface NavbarProps {
  lowStockCount?: number;
  onToggleSidebar?: () => void;
}

export default function Navbar({ lowStockCount = 0, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { session, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const page = TITLES[pathname] || {
    title: 'StockMaster',
    sub: 'Gestión de Inventario y Operaciones',
    icon: '⚡',
    tag: 'ERP',
  };

  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <header className="app-navbar navbar sticky-top px-3 px-md-4 py-2 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2 gap-sm-3 overflow-hidden">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-sm btn-nav-toggle border rounded-3 p-1.5 shadow-none d-lg-none"
            onClick={onToggleSidebar}
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>
        )}

        <Link to="/" className="navbar-brand d-flex d-lg-none align-items-center gap-2 text-decoration-none me-1 flex-shrink-0">
          <div className="navbar-logo-badge d-flex align-items-center justify-content-center">
            <img src={logoIcon} alt="Logo" className="navbar-logo-img" />
          </div>
          <span className="navbar-brand-name fw-bold d-none d-sm-inline">
            Stock<span className="text-gold">Master</span>
          </span>
        </Link>

        <div className="navbar-vr d-none d-sm-block d-lg-none flex-shrink-0" />

        <div className="d-flex align-items-center gap-2.5 overflow-hidden">
          <div className="navbar-module-icon-badge d-none d-lg-flex align-items-center justify-content-center flex-shrink-0">
            <span>{page.icon}</span>
          </div>
          <div className="d-flex flex-column overflow-hidden">
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

      <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        {lowStockCount > 0 && (
          <Link
            to="/inventory"
            className="badge badge-stock-alert text-decoration-none d-inline-flex align-items-center gap-1.5 py-1.5 px-2.5 px-sm-3 rounded-pill"
            title="Existencias críticas"
          >
            <span className="stock-alert-dot" />
            <span className="fw-semibold">⚠ {lowStockCount} stock bajo</span>
          </Link>
        )}

        <button
          type="button"
          className="btn btn-sm theme-toggle-btn rounded-circle d-flex align-items-center justify-content-center p-0 shadow-none"
          onClick={toggleTheme}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Alternar tema"
        >
          {isDark ? (
            <Sun size={17} className="text-warning" />
          ) : (
            <Moon size={17} style={{ color: '#102a45' }} />
          )}
        </button>

        <Link
          to="/profile"
          className="navbar-user-chip d-flex align-items-center gap-2 text-decoration-none rounded-pill"
          title="Mi Perfil"
        >
          <div className="navbar-avatar rounded-circle d-flex align-items-center justify-content-center text-white fw-bold">
            {initial}
          </div>
          <div className="d-none d-md-flex flex-column text-start">
            <span className="navbar-user-name fw-semibold text-truncate" style={{ maxWidth: 220 }}>
              {session?.displayName || session?.username || 'Usuario'}
            </span>
            <span className="navbar-user-role">
              {isAdmin() ? '👑 Administrador' : '🔧 Vendedor'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
