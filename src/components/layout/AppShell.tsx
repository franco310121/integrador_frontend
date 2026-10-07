import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { getProducts } from '../../services/productoService';
import { STOCK_UPDATED_EVENT } from '../../utils/stockEvents';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();

  const refreshLowStock = useCallback(() => {
    getProducts()
      .then(products => {
        const count = products.filter(
          p => (p.estado === 'activo' || !p.estado) &&
               Number(p.stock ?? 0) <= Number(p.stock_minimo ?? p.stockMinimo ?? 5)
        ).length;
        setLowStockCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshLowStock();
  }, [location.pathname, refreshLowStock]);

  useEffect(() => {
    const handleStockUpdate = () => refreshLowStock();
    window.addEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
    window.addEventListener('focus', handleStockUpdate);

    const interval = setInterval(refreshLowStock, 5000);

    return () => {
      window.removeEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
      window.removeEventListener('focus', handleStockUpdate);
      clearInterval(interval);
    };
  }, [refreshLowStock]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div
      className="finvora-app-shell d-flex w-100 min-vh-100"
      style={{ backgroundColor: '#f7f7ff', color: '#19113e', colorScheme: 'light' }}
    >
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div
        className="d-flex flex-column flex-grow-1"
        style={{ minHeight: '100vh', minWidth: 0 }}
      >
        <Navbar
          lowStockCount={lowStockCount}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-grow-1 p-3 p-sm-4 overflow-x-hidden">
          <div className="container-fluid p-0" style={{ maxWidth: 1400 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

