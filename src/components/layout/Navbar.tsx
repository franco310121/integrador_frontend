import { useLocation, Link } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoIcon from '../../assets/images/logo-icon.png';
import './Navbar.css';

interface PageInfo {
  title: string;
  sub: string;
}

const TITLES: Record<string, PageInfo> = {
  '/':           { title: 'Dashboard',         sub: 'Resumen general del sistema'                     },
  '/dashboard':  { title: 'Dashboard',         sub: 'Resumen general del sistema'                     },
  '/inventory':  { title: 'Inventario',         sub: 'Gestión de productos y existencias'              },
  '/productos':  { title: 'Inventario',         sub: 'Gestión de productos y existencias'              },
  '/sales':      { title: 'Ventas',             sub: 'Emisión de boletas y control comercial'          },
  '/ventas':     { title: 'Ventas',             sub: 'Emisión de boletas y control comercial'          },
  '/movements':  { title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)'},
  '/movimientos':{ title: 'Movimientos',        sub: 'Trazabilidad y auditoría de existencias (Kardex)'},
  '/auditoria':  { title: 'Auditoría y Kardex', sub: 'Trazabilidad y libro de movimientos'            },
  '/profile':    { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal'  },
  '/perfil':     { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal'  },
  '/purchase':   { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores'     },
  '/compras':    { title: 'Compras',            sub: 'Órdenes de compra y gestión de proveedores'     },
  '/register':   { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados'      },
  '/registrar':  { title: 'Registrar Producto', sub: 'Configura precios de productos ingresados'      },
  '/categories': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo'            },
  '/categorias': { title: 'Categorías',         sub: 'Gestión y segmentación del catálogo'            },
  '/users':      { title: 'Usuarios',           sub: 'Control de accesos y administración de roles'    },
  '/usuarios':   { title: 'Usuarios',           sub: 'Control de accesos y administración de roles'    },
  '/reports':    { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance'     },
  '/reportes':   { title: 'Reportes',           sub: 'Análisis financiero, rentabilidad y balance'     },
};

interface NavbarProps {
  lowStockCount?: number;
  onToggleSidebar?: () => void;
}

export default function Navbar({ lowStockCount = 0, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { session, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const page = TITLES[pathname] || { title: 'StockMaster', sub: 'Gestión de Inventario y Operaciones' };
  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <header className="app-navbar navbar sticky-top p-2 px-3 px-md-4 d-flex align-items-center justify-content-between">
      {/* Brand & Page Info */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 overflow-hidden">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-light d-lg-none p-1.5 border text-dark rounded-3 shadow-none"
            onClick={onToggleSidebar}
            aria-label="Abrir navegación móvil"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Brand Logo in Navbar */}
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none me-1 me-md-2 flex-shrink-0">
          <div className="navbar-logo-badge d-flex align-items-center justify-content-center">
            <img
              src={logoIcon}
              alt="StockMaster Logo"
              className="navbar-logo-img"
            />
          </div>
          <span className="navbar-brand-name fw-bold d-none d-sm-inline">
            Stock<span className="text-gold">Master</span>
          </span>
        </Link>

        {/* Separador vertical */}
        <div className="navbar-vr d-none d-md-block flex-shrink-0" />

        {/* Título de módulo actual */}
        <div className="d-flex flex-column overflow-hidden">
          <h5 className="mb-0 fw-bold navbar-page-title text-truncate">{page.title}</h5>
          <p className="navbar-page-sub mb-0 d-none d-lg-block text-truncate">{page.sub}</p>
        </div>
      </div>

      {/* Right Controls: Stock Alert, Theme Toggle & Profile Chip */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        {/* Stock Alert Badge */}
        {lowStockCount > 0 && (
          <Link
            to="/inventory"
            className="badge badge-stock-alert text-decoration-none d-inline-flex align-items-center gap-1.5 py-1.5 px-3 rounded-pill"
            title="Ver artículos con existencias críticas"
          >
            <span className="stock-alert-dot" />
            <span>⚠ {lowStockCount} stock bajo</span>
          </Link>
        )}

        {/* Botón para alternar tema Claro / Oscuro */}
        <button
          type="button"
          className="btn btn-sm theme-toggle-btn rounded-circle d-flex align-items-center justify-content-center p-0 shadow-none"
          onClick={toggleTheme}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro azulado'}
          aria-label="Alternar tema claro y oscuro"
        >
          {isDark ? (
            <Sun size={18} className="text-warning" />
          ) : (
            <Moon size={18} style={{ color: '#102a45' }} />
          )}
        </button>

        {/* Profile Card Chip */}
        <Link
          to="/profile"
          className="navbar-user-chip d-flex align-items-center gap-2 text-decoration-none rounded-pill border"
          title="Ver Mi Perfil"
        >
          <div className="navbar-avatar rounded-circle d-flex align-items-center justify-content-center text-white fw-bold">
            {initial}
          </div>
          <div className="d-none d-sm-flex flex-column text-start">
            <span className="navbar-user-name fw-semibold text-truncate" style={{ maxWidth: 130 }}>
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
