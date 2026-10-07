import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getSession, clearSession } from '../services/authService';
import type { UserSession } from '../types/auth';
import { STORAGE_KEYS } from '../utils/constants';
import { normalizeSession } from '../utils/session';

export interface AuthContextType {
  session: UserSession | null;
  setSession: (newSession: UserSession | null) => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isAdmin: () => boolean;
  isWorker: () => boolean;
  isVendedor: () => boolean;
  isLogged: () => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<UserSession | null>(() => getSession());
  const [loading, setLoading]      = useState<boolean>(false);

  useEffect(() => {
    const handler = () => setSessionState(getSession());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setSession = (newSession: UserSession | null) => {
    const normalized = normalizeSession(newSession);
    if (normalized) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(normalized));
    } else {
      clearSession();
    }
    setSessionState(normalized);
  };

  const isAdmin    = () => session?.rol === 'admin'    || session?.role === 'admin';
  const isWorker   = () => session?.rol === 'vendedor' || session?.role === 'vendedor' || session?.role === 'worker';
  const isVendedor = () => isWorker();
  const isLogged   = () => session !== null;

  return (
    <AuthContext.Provider value={{
      session,
      setSession,
      loading,
      setLoading,
      isAdmin,
      isWorker,
      isVendedor,
      isLogged,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth } from '../hooks/useAuth';
