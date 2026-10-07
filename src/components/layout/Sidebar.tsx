import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  X,
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Users,
  ArrowLeftRight,
  UserRound,
  ShoppingBag,
  PlusCircle,
  Tags,
  ShieldCheck,
  BarChart3,
  Building2,
  Wallet,
  FileUp,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import logoIcon from '../../assets/images/logo-icon.png';
import './Sidebar.css';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NAV: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/flujo-caja', icon: BarChart3, label: 'Flujo de caja' },
  { to: '/movimientos-financieros', icon: Wallet, label: 'Movimientos financieros' },
  { to: '/importacion-financiera', icon: FileUp, label: 'Importación financiera' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas (POS)' },
  { to: '/comprobantes', icon: Receipt, label: 'Comprobantes' },
  { to: '/devoluciones', icon: RotateCcw, label: 'Devoluciones' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/profile', icon: UserRound, label: 'Mi Perfil' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/empresa', icon: Building2, label: 'Empresa' },
  { to: '/purchase', icon: ShoppingBag, label: 'Compras' },
  { to: '/register', icon: PlusCircle, label: 'Reg. Producto' },
  { to: '/categories', icon: Tags, label: 'Categorías' },
  { to: '/users', icon: ShieldCheck, label: 'Usuarios' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
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

  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <aside className={`app-sidebar p-3 d-flex flex-column ${isOpen ? 'open' : ''}`} aria-label="Barra lateral">
      <div className="sidebar-header d-flex align-items-center justify-content-between flex-shrink-0">
        <Link to="/" onClick={handleNavClick} className="sidebar-brand d-flex align-items-center gap-2 text-decoration-none">
          <div className="sidebar-logo-badge d-flex align-items-center justify-content-center">
            <img src={logoIcon} alt="" className="sidebar-logo-img" />
          </div>
          <div>
            <div className="sidebar-brand-name fw-bold">Finvora</div>
            <div className="sidebar-brand-caption">Gestión empresarial</div>
          </div>
        </Link>
        <button
          type="button"
          className="btn sidebar-close-btn d-lg-none"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <Link
        to="/profile"
        onClick={handleNavClick}
        className="sidebar-user-card d-flex align-items-center text-decoration-none gap-2 flex-shrink-0"
        title="Mi Perfil"
      >
        <div className="sidebar-avatar rounded-circle d-inline-flex align-items-center justify-content-center fw-bold">
          {initial}
        </div>
        <div className="overflow-hidden flex-grow-1">
          <div className="sidebar-user-name fw-semibold text-truncate">
            {session?.displayName || session?.username}
          </div>
          <div className="sidebar-user-role-badge">
            {isAdmin() ? 'Administrador' : 'Vendedor'}
          </div>
        </div>
      </Link>

      <nav className="sidebar-nav d-flex flex-column flex-nowrap flex-grow-1 mb-2" aria-label="Navegación principal">
        <div className="sidebar-section-title">Principal</div>
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center justify-content-between text-decoration-none ${isActive ? 'active' : ''}`
              }
            >
              <div className="d-flex align-items-center gap-2">
                <Icon size={18} strokeWidth={1.8} className="sidebar-item-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
              {item.to === '/inventory' && lowStockCount > 0 && (
                <span className="badge rounded-pill sidebar-badge-count" aria-label={`${lowStockCount} alertas de stock`}>
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          );
        })}

        {isAdmin() && (
          <>
            <div className="sidebar-section-title sidebar-section-admin">Administración</div>
            {ADMIN_NAV.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-2 text-decoration-none ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={18} strokeWidth={1.8} className="sidebar-item-icon" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <div className="sidebar-footer flex-shrink-0">
        <button
          type="button"
          className="btn sidebar-logout-btn w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={handleLogout}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="sidebar-connection d-flex align-items-center justify-content-center gap-2">
          <span className="sidebar-connection-dot" aria-hidden="true" />
          <span>Servidor Conectado</span>
        </div>
      </div>
    </aside>
  );
}
