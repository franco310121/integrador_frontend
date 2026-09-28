import { NavLink, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import logoIcon from '../../assets/images/logo-icon.png';
import './Sidebar.css';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV: NavItem[] = [
  { to: '/',          icon: '⊞', label: 'Dashboard'   },
  { to: '/inventory', icon: '📦', label: 'Inventario'  },
  { to: '/sales',     icon: '◈',  label: 'Ventas'      },
  { to: '/movements', icon: '↕',  label: 'Movimientos' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/purchase',   icon: '🛒', label: 'Compras'    },
  { to: '/categories', icon: '🏷',  label: 'Categorías' },
  { to: '/users',      icon: '👥', label: 'Usuarios'   },
];

interface SidebarProps {
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ lowStockCount = 0, isOpen = false, onClose }: SidebarProps) {
  const { session, setSession, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const initial = session?.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <aside className={`app-sidebar bg-light vh-100 p-3 d-flex flex-column border-end ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 px-1">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
            style={{ width: 36, height: 36, background: '#102a45' }}
          >
            <img
              src={logoIcon}
              alt="StockMaster"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
          </div>
          <div className="h5 mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.02em' }}>
            StockMaster
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          className="btn btn-sm btn-light border-0 d-lg-none p-1 text-muted"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Badge */}
      <div className="d-flex align-items-center mb-3 p-2 bg-white rounded-3 border gap-2 shadow-sm">
        <div
          className="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
          style={{ width: 38, height: 38, fontSize: 14 }}
        >
          {initial}
        </div>
        <div className="overflow-hidden flex-grow-1">
          <div className="fw-semibold text-truncate small text-dark" style={{ fontSize: '.88rem' }}>
            {session?.displayName || session?.username}
          </div>
          <div className="text-muted" style={{ fontSize: '.75rem' }}>
            {isAdmin() ? '👑 Admin' : '🔧 Vendedor'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="nav flex-column flex-grow-1 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center justify-content-between py-2 px-2.5 rounded-3 mb-1 text-decoration-none ${
                isActive ? ' active bg-primary text-white fw-semibold shadow-sm' : ' text-secondary'
              }`
            }
          >
            <div className="d-flex align-items-center gap-2">
              <span>{item.icon}</span>
              <span style={{ fontSize: '.9rem' }}>{item.label}</span>
            </div>
            {item.to === '/inventory' && lowStockCount > 0 && (
              <span className="badge bg-danger rounded-pill px-2">{lowStockCount}</span>
            )}
          </NavLink>
        ))}

        {isAdmin() && (
          <>
            <div
              className="small text-uppercase text-muted px-2 mt-2 mb-1 fw-semibold"
              style={{ fontSize: '.68rem', letterSpacing: '.06em' }}
            >
              Administración
            </div>
            {ADMIN_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 py-2 px-2.5 rounded-3 mb-1 text-decoration-none ${
                    isActive ? ' active bg-primary text-white fw-semibold shadow-sm' : ' text-secondary'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span style={{ fontSize: '.9rem' }}>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        <div className="flex-grow-1" style={{ minHeight: 16 }} />

        <button
          type="button"
          className="btn btn-outline-danger w-100 mt-2 text-start d-flex align-items-center gap-2 rounded-3 py-2 btn-sm"
          onClick={handleLogout}
        >
          <span>🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </nav>

      {/* Footer Info */}
      <div className="mt-2 text-muted d-flex align-items-center gap-1.5 pt-2 border-top" style={{ fontSize: '.75rem' }}>
        <span className="rounded-circle bg-success d-inline-block" style={{ width: 7, height: 7 }} />
        <span>Conectado</span>
      </div>
    </aside>
  );
}
