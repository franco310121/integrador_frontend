import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { getProducts } from '../../services/productoService';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    getProducts()
      .then(products => {
        const count = products.filter(
          p => Number(p.stock ?? 0) <= Number(p.stock_minimo ?? 5)
        ).length;
        setLowStockCount(count);
      })
      .catch(() => {});
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="d-flex w-100 min-vh-100 bg-app">
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar Component */}
      <Sidebar
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content Area */}
      <div className="d-flex flex-column flex-grow-1 min-w-0" style={{ minHeight: '100vh' }}>
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
