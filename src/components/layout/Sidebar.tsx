import { NavLink, Link, useNavigate } from 'react-router-dom';
import { X, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { logout } from '../../services/authService';
import logoIcon from '../../assets/images/logo-icon.png';
import './Sidebar.css';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV: NavItem[] = [
  { to: '/',             icon: '⊞', label: 'Dashboard'    },
  { to: '/inventory',    icon: '📦', label: 'Inventario'   },
  { to: '/sales',        icon: '◈',  label: 'Ventas (POS)' },
  { to: '/comprobantes', icon: '🧾', label: 'Comprobantes' },
  { to: '/devoluciones', icon: '🔄', label: 'Devoluciones' },
  { to: '/clientes',     icon: '👥', label: 'Clientes'     },
  { to: '/movements',    icon: '↕',  label: 'Movimientos'  },
  { to: '/profile',      icon: '👤', label: 'Mi Perfil'    },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/purchase',   icon: '🛒', label: 'Compras'       },
  { to: '/register',   icon: '✚',  label: 'Reg. Producto' },
  { to: '/categories', icon: '🏷',  label: 'Categorías'    },
  { to: '/users',      icon: '🛡',  label: 'Usuarios'      },
  { to: '/reports',    icon: '📊', label: 'Reportes'      },
];

interface SidebarProps {
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ lowStockCount = 0, isOpen = false, onClose }: SidebarProps) {
  const { session, setSession, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <aside className={`app-sidebar p-3 d-flex flex-column ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header d-flex align-items-center justify-content-between mb-3 px-1 flex-shrink-0">
        <Link to="/" onClick={handleNavClick} className="sidebar-brand d-flex align-items-center gap-2.5 text-decoration-none">
          <div className="sidebar-logo-badge d-flex align-items-center justify-content-center">
            <img src={logoIcon} alt="StockMaster" className="sidebar-logo-img" />
          </div>
          <div>
            <div className="sidebar-brand-name fw-bold">
              Stock<span className="text-gold">Master</span>
            </div>
            <div className="text-muted" style={{ fontSize: '.64rem', letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 600 }}>
              Enterprise ERP
            </div>
          </div>
        </Link>

        <button
          type="button"
          className="btn btn-sm btn-light border-0 d-lg-none p-1 text-muted"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <Link
        to="/profile"
        onClick={handleNavClick}
        className="sidebar-user-card d-flex align-items-center mb-3 p-2 text-decoration-none gap-2 shadow-sm flex-shrink-0"
        title="Mi Perfil"
      >
        <div className="sidebar-avatar rounded-circle text-white d-inline-flex align-items-center justify-content-center fw-bold">
          {initial}
        </div>
        <div className="overflow-hidden flex-grow-1">
          <div className="fw-semibold text-truncate small text-dark" style={{ fontSize: '.86rem' }}>
            {session?.displayName || session?.username}
          </div>
          <div className="sidebar-user-role-badge">
            {isAdmin() ? '👑 Administrador' : '🔧 Vendedor'}
          </div>
        </div>
      </Link>

      <nav className="sidebar-nav d-flex flex-column flex-nowrap flex-grow-1 overflow-y-auto mb-2">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center justify-content-between text-decoration-none ${
                isActive ? ' active shadow-sm' : ''
              }`
            }
          >
            <div className="d-flex align-items-center gap-2">
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.to === '/inventory' && lowStockCount > 0 && (
              <span className="badge bg-danger rounded-pill px-2 sidebar-badge-count">{lowStockCount}</span>
            )}
          </NavLink>
        ))}

        {isAdmin() && (
          <>
            <div className="sidebar-section-title px-2 mt-3 mb-1">
              Administración
            </div>
            {ADMIN_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 text-decoration-none ${
                    isActive ? ' active shadow-sm' : ''
                  }`
                }
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer flex-shrink-0 pt-2 border-top">
        <div className="sidebar-theme-container d-flex align-items-center justify-content-between p-2 rounded-3 mb-2">
          <span className="text-muted d-flex align-items-center gap-1.5" style={{ fontSize: '.76rem' }}>
            {isDark ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
          </span>
          <button
            type="button"
            className="btn btn-sm p-1 rounded-circle border-0 theme-toggle-btn d-flex align-items-center justify-content-center shadow-none"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun size={15} className="text-warning" /> : <Moon size={15} className="text-primary" />}
          </button>
        </div>

        <button
          type="button"
          className="btn sidebar-logout-btn w-100 text-start d-flex align-items-center justify-content-center gap-2 rounded-3 py-2 btn-sm mb-2"
          onClick={handleLogout}
        >
          <LogOut size={15} />
          <span>Cerrar Sesión</span>
        </button>

        <div className="text-muted d-flex align-items-center justify-content-center gap-1.5 pt-1" style={{ fontSize: '.75rem' }}>
          <span className="rounded-circle bg-success d-inline-block" style={{ width: 7, height: 7 }} />
          <span>Servidor Conectado</span>
        </div>
      </div>
    </aside>
  );
}
