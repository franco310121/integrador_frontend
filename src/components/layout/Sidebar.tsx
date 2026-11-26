import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
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
  { to: '/', icon: LayoutDashboard, label: 'Resumen de mi negocio' },
  { to: '/flujo-caja', icon: BarChart3, label: 'Dinero disponible' },
  { to: '/sales', icon: ShoppingCart, label: 'Vender (Punto de venta)' },
];

const FINANCE_NAV: NavItem[] = [
  { to: '/movimientos-financieros', icon: Wallet, label: 'Ingresos y gastos' },
  { to: '/importacion-financiera', icon: FileUp, label: 'Cargar desde Excel' },
];

const OPERATIONS_NAV: NavItem[] = [
  { to: '/inventory', icon: Package, label: 'Mis productos' },
  { to: '/comprobantes', icon: Receipt, label: 'Boletas emitidas' },
  { to: '/devoluciones', icon: RotateCcw, label: 'Devoluciones' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Entradas y salidas' },
  { to: '/profile', icon: UserRound, label: 'Mi cuenta' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/empresa', icon: Building2, label: 'Datos de mi negocio' },
  { to: '/purchase', icon: ShoppingBag, label: 'Compras a proveedores' },
  { to: '/register', icon: PlusCircle, label: 'Nuevo producto' },
  { to: '/categories', icon: Tags, label: 'Categorías' },
  { to: '/users', icon: ShieldCheck, label: 'Equipo y permisos' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
];

interface SidebarProps {
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ lowStockCount = 0, isOpen = false, onClose }: SidebarProps) {
  const { setSession, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    return <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={handleNavClick}
      className={({ isActive }) => `nav-link d-flex align-items-center justify-content-between text-decoration-none ${isActive ? 'active' : ''}`}>
      <div className="d-flex align-items-center gap-2"><Icon size={18} strokeWidth={1.8} className="sidebar-item-icon" aria-hidden="true" /><span>{item.label}</span></div>
      {item.to === '/inventory' && lowStockCount > 0 && <span className="badge rounded-pill sidebar-badge-count" aria-label={`${lowStockCount} alertas de stock`}>{lowStockCount}</span>}
    </NavLink>;
  };

  return (
    <aside className={`app-sidebar p-3 d-flex flex-column ${isOpen ? 'open' : ''}`} aria-label="Barra lateral">
      <div className="sidebar-header d-flex align-items-center justify-content-between flex-shrink-0">
        <Link to="/" onClick={handleNavClick} className="sidebar-brand d-flex align-items-center gap-2 text-decoration-none">
          <div className="sidebar-logo-badge d-flex align-items-center justify-content-center">
            <img src={logoIcon} alt="" className="sidebar-logo-img" />
          </div>
          <div>
            <div className="sidebar-brand-name fw-bold">Finvora</div>
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

      <nav className="sidebar-nav d-flex flex-column flex-nowrap flex-grow-1 mb-2" aria-label="Navegación principal">
        {NAV.map(renderLink)}
        {[
          { title: 'Finanzas', items: FINANCE_NAV },
          { title: 'Operaciones', items: OPERATIONS_NAV },
          ...(isAdmin() ? [{ title: 'Administración', items: ADMIN_NAV }] : []),
        ].map(group => <details key={`${group.title}-${location.pathname}`} className={`sidebar-group ${group.items.some(item => item.to === location.pathname) ? 'current' : ''}`}>
          <summary className="sidebar-group-summary">
            <span>{group.title}{group.items.find(item => item.to === location.pathname) && <small className="d-block">{group.items.find(item => item.to === location.pathname)?.label}</small>}</span>
            {group.title === 'Operaciones' && lowStockCount > 0 && <span className="badge rounded-pill sidebar-badge-count">{lowStockCount}</span>}
          </summary>
          <div className="sidebar-group-links">{group.items.map(renderLink)}</div>
        </details>)}
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
