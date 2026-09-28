import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

interface PageInfo {
  title: string;
  sub: string;
}

const TITLES: Record<string, PageInfo> = {
  '/':           { title: 'Dashboard',         sub: 'Resumen general del sistema'           },
  '/dashboard':  { title: 'Dashboard',         sub: 'Resumen general del sistema'           },
  '/inventory':  { title: 'Inventario',         sub: 'Gestión de productos y stock'          },
  '/productos':  { title: 'Inventario',         sub: 'Gestión de productos y stock'          },
  '/sales':      { title: 'Ventas',             sub: 'Registra y consulta ventas'            },
  '/ventas':     { title: 'Ventas',             sub: 'Registra y consulta ventas'            },
  '/movements':  { title: 'Movimientos',        sub: 'Trazabilidad de stock'                 },
  '/movimientos':{ title: 'Movimientos',        sub: 'Trazabilidad de stock'                 },
  '/profile':    { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal' },
  '/perfil':     { title: 'Mi Perfil',          sub: 'Configuración de cuenta e información personal' },
  '/purchase':   { title: 'Compras',            sub: 'Órdenes de compra a proveedores'                },
  '/compras':    { title: 'Compras',            sub: 'Órdenes de compra a proveedores'                },
  '/register':   { title: 'Registrar Producto', sub: 'Configura productos comprados'                  },
  '/registrar':  { title: 'Registrar Producto', sub: 'Configura productos comprados'                  },
  '/categories': { title: 'Categorías',         sub: 'Gestión de categorías'                          },
  '/categorias': { title: 'Categorías',         sub: 'Gestión de categorías'                          },
  '/users':      { title: 'Usuarios',           sub: 'Gestión de usuarios y accesos'                  },
  '/usuarios':   { title: 'Usuarios',           sub: 'Gestión de usuarios y accesos'                  },
  '/reports':    { title: 'Reportes',           sub: 'Análisis de ventas, compras y rentabilidad'     },
  '/reportes':   { title: 'Reportes',           sub: 'Análisis de ventas, compras y rentabilidad'     },
  '/auditoria':  { title: 'Auditoría y Kardex', sub: 'Trazabilidad y libro de movimientos'            },
};

interface NavbarProps {
  lowStockCount?: number;
  onToggleSidebar?: () => void;
}

export default function Navbar({ lowStockCount = 0, onToggleSidebar }: NavbarProps) {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const page = TITLES[pathname] || { title: 'StockMaster', sub: '' };

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-white border-bottom p-2 px-3 px-md-4 sticky-top shadow-sm d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-light d-lg-none p-1.5 border text-dark rounded-3"
            onClick={onToggleSidebar}
            aria-label="Abrir navegación"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h5 className="h5 mb-0 fw-bold text-dark">{page.title}</h5>
          <p className="text-muted small mb-0 d-none d-sm-block">{page.sub}</p>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2">
        {lowStockCount > 0 && (
          <span className="badge bg-danger py-1.5 px-2.5 rounded-pill">
            ⚠ {lowStockCount} stock bajo
          </span>
        )}
        <span className={`badge ${isAdmin() ? 'bg-primary' : 'bg-secondary'} py-1.5 px-2.5 rounded-pill`}>
          {isAdmin() ? '👑 Admin' : '🔧 Vendedor'}
        </span>
      </div>
    </header>
  );
}
