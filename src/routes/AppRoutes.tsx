import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Productos from '../pages/Productos';
import Categorias from '../pages/Categorias';
import Ventas from '../pages/Ventas';
import Compras from '../pages/Compras';
import MovimientosStock from '../pages/MovimientosStock';
import Usuarios from '../pages/Usuarios';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import Reports from '../pages/Reports';

export default function AppRoutes() {
  const { isLogged } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isLogged() ? <Navigate to="/" replace /> : <Login />} />

      {/* Rutas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <AppShell>
              <Productos />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/productos"
        element={
          <ProtectedRoute>
            <AppShell>
              <Productos />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <AppShell>
              <Ventas />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <AppShell>
              <Ventas />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/movements"
        element={
          <ProtectedRoute>
            <AppShell>
              <MovimientosStock />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/movimientos"
        element={
          <ProtectedRoute>
            <AppShell>
              <MovimientosStock />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute>
            <AppShell>
              <MovimientosStock />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Rutas admin */}
      <Route
        path="/purchase"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Compras />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compras"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Compras />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Register />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/registrar"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Register />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Categorias />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categorias"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Categorias />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Usuarios />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Usuarios />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Reports />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute adminOnly>
            <AppShell>
              <Reports />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
