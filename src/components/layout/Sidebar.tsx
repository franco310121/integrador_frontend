import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  Truck,
  Tags,
  Users,
  LogOut,
  Boxes,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/authService';
import logoIcon from '../../assets/images/logo-icon.png';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const GENERAL_NAV: NavItem[] = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/productos',   label: 'Productos',   icon: Package },
  { to: '/ventas',      label: 'Punto de Venta', icon: ShoppingCart },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/compras',     label: 'Compras',     icon: Truck },
  { to: '/categorias',  label: 'Categorías',  icon: Tags },
  { to: '/usuarios',    label: 'Usuarios',    icon: Users },
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

  const initial = session?.displayName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <aside
      className={`app-sidebar bg-white border-end d-flex flex-column vh-100 p-3 ${isOpen ? 'open' : ''}`}
      style={{ width: 'var(--sidebar-width)', zIndex: 1045 }}
    >
      {/* Brand Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 px-1 pt-1">
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
            style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0a192f 0%, #102a45 100%)' }}
          >
            <img
              src={logoIcon}
              alt="StockMaster Emblem"
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
          </div>
          <div>
            <div className="h6 mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.02em' }}>StockMaster</div>
            <div className="text-muted fw-semibold" style={{ fontSize: '.65rem', letterSpacing: '.06em' }}>
              ENTERPRISE ERP
            </div>
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

      {/* User Info Card */}
      <div className="d-flex align-items-center mb-4 p-2.5 bg-light rounded-3 border">
        <div
          className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-bold shadow-sm"
          style={{ width: 36, height: 36, fontSize: 14 }}
        >
          {initial}
        </div>
        <div className="overflow-hidden ms-2.5 flex-grow-1">
          <div className="fw-semibold text-truncate small text-dark" title={session?.displayName || session?.username}>
            {session?.displayName || session?.username}
          </div>
          <div className="d-flex align-items-center gap-1.5 mt-0.5">
            <span
              className={`badge py-0.5 px-1.5 text-uppercase ${isAdmin() ? 'badge-soft-primary' : 'badge-soft-success'}`}
              style={{ fontSize: '.62rem', letterSpacing: '.04em' }}
            >
              {isAdmin() ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav flex-column flex-grow-1 overflow-y-auto pe-1">
        <div className="text-uppercase text-muted px-2.5 mb-1.5 fw-bold" style={{ fontSize: '.65rem', letterSpacing: '.08em' }}>
          Operaciones
        </div>
        {GENERAL_NAV.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center justify-content-between py-2 px-2.5 rounded-3 mb-1 text-decoration-none transition-all ${
                  isActive
                    ? 'bg-primary text-white fw-semibold shadow-sm'
                    : 'text-secondary hover-bg-light'
                }`
              }
              style={{ fontSize: '.86rem' }}
            >
              <div className="d-flex align-items-center gap-2.5">
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </div>
              {item.to === '/productos' && lowStockCount > 0 && (
                <span className="badge bg-danger rounded-pill px-2 py-0.5" style={{ fontSize: '.7rem' }}>
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          );
        })}

        {isAdmin() && (
          <>
            <div
              className="text-uppercase text-muted px-2.5 mt-3 mb-1.5 fw-bold"
              style={{ fontSize: '.65rem', letterSpacing: '.08em' }}
            >
              Administración
            </div>
            {ADMIN_NAV.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center py-2 px-2.5 rounded-3 mb-1 text-decoration-none transition-all ${
                      isActive
                        ? 'bg-primary text-white fw-semibold shadow-sm'
                        : 'text-secondary hover-bg-light'
                    }`
                  }
                  style={{ fontSize: '.86rem' }}
                >
                  <div className="d-flex align-items-center gap-2.5">
                    <Icon size={18} strokeWidth={2} />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </>
        )}

        <div className="flex-grow-1" style={{ minHeight: 20 }} />

        <button
          type="button"
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 btn-sm py-2 mb-2 rounded-3"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </nav>

      {/* Footer Info */}
      <div className="pt-2.5 border-top text-muted d-flex align-items-center justify-content-between px-1" style={{ fontSize: '.72rem' }}>
        <span className="d-flex align-items-center gap-1.5">
          <span
            className="rounded-circle bg-success d-inline-block"
            style={{ width: 7, height: 7, boxShadow: '0 0 6px #22c55e' }}
          />
          <span className="text-secondary fw-medium">En línea</span>
        </span>
        <span className="text-muted fw-mono">v1.2.0</span>
      </div>
    </aside>
  );
}
