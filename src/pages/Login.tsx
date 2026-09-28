import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import logoImg from '../assets/images/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('sm_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success || !result.session) {
      setError(result.error || 'Credenciales de acceso no válidas.');
      emailRef.current?.focus();
      return;
    }

    if (remember) {
      localStorage.setItem('sm_remembered_email', email.trim());
    } else {
      localStorage.removeItem('sm_remembered_email');
    }

    setSession(result.session);
    navigate('/');
  };

  return (
    <div
      className="d-flex w-100"
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Panel Izquierdo: Presentación Institucional (ocupa el alto completo sin scroll) */}
      <div
        className="d-none d-lg-flex col-lg-6 col-xl-7 flex-column justify-content-between p-4 p-xl-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #090e17 0%, #0f172a 60%, #1e293b 100%)',
          borderRight: '1px solid #1e293b',
          height: '100vh',
        }}
      >
        {/* Cabecera / Identidad */}
        <div className="d-flex align-items-center gap-3">
          <img
            src={logoImg}
            alt="StockMaster Logo"
            className="rounded-3 shadow-sm flex-shrink-0"
            style={{ width: 44, height: 44, objectFit: 'cover', objectPosition: 'left center' }}
          />
          <div>
            <div className="h4 mb-0 fw-bold text-white lh-1">StockMaster</div>
            <span className="text-secondary small" style={{ fontSize: '.75rem', letterSpacing: '.04em' }}>
              Sistema de Gestión Comercial y Almacén
            </span>
          </div>
        </div>

        {/* Contenido Central: Propuesta de Valor */}
        <div style={{ maxWidth: 480 }}>
          <h1 className="h3 fw-bold text-white mb-3" style={{ letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            Control integral de inventario, compras y punto de venta.
          </h1>
          <p className="text-secondary small mb-4" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
            Plataforma diseñada para optimizar los procesos de almacén, emisión rápida de comprobantes y auditoría de operaciones en tiempo real.
          </p>

          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 28, height: 28, backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="small text-light">Supervisión de stock y alertas automáticas de reposición</span>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 28, height: 28, backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="small text-light">Módulo POS de facturación con desglose tributario (IGV)</span>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 28, height: 28, backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="small text-light">Kardex valorizado y auditoría de entradas y salidas</span>
            </div>
          </div>
        </div>

        {/* Pie del Panel Izquierdo */}
        <div className="d-flex align-items-center justify-content-between text-secondary pt-2" style={{ fontSize: '.75rem', color: '#64748b' }}>
          <div className="d-flex align-items-center gap-2">
            <span className="rounded-circle bg-success" style={{ width: 7, height: 7 }}></span>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Login (compacto, sin scrollbar vertical) */}
      <div
        className="col-12 col-lg-6 col-xl-5 d-flex flex-column justify-content-center align-items-center p-3 p-sm-4 p-md-5"
        style={{
          height: '100vh',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ maxWidth: 380, width: '100%' }}>
          {/* Logo móvil (visible solo en celulares/tablets) */}
          <div className="d-flex d-lg-none align-items-center gap-3 mb-4">
            <img
              src={logoImg}
              alt="StockMaster Logo"
              className="rounded-3 shadow-sm flex-shrink-0"
              style={{ width: 40, height: 40, objectFit: 'cover', objectPosition: 'left center' }}
            />
            <div>
              <div className="h5 mb-0 fw-bold text-dark">StockMaster</div>
              <small className="text-muted">Plataforma de Gestión</small>
            </div>
          </div>

          {/* Título */}
          <div className="mb-4">
            <h2 className="h4 fw-bold text-dark mb-1" style={{ letterSpacing: '-0.01em' }}>
              Iniciar Sesión
            </h2>
            <p className="text-muted small mb-0">
              Ingresa tus credenciales corporativas para continuar
            </p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <div>{error}</div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Correo Electrónico
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  className="form-control border-start-0 ps-1"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  required
                  style={{ height: 42, fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Contraseña
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0 ps-1"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  style={{ height: 42, fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  className="input-group-text bg-white border-start-0 text-muted"
                  onClick={() => setShowPass(v => !v)}
                  title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                  style={{ cursor: 'pointer' }}
                >
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox Recordar Usuario */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberCheck"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="rememberCheck" style={{ cursor: 'pointer', fontSize: '.84rem' }}>
                  Recordar mi usuario
                </label>
              </div>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
              disabled={loading}
              style={{ height: 42, fontSize: '0.92rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          {/* Pie Corporativo */}
          <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: '.75rem' }}>
            <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span>StockMaster &copy; {new Date().getFullYear()} &bull; Todos los derechos reservados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
