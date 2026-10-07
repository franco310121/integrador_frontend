import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import logoImg from '../assets/images/logo.png';
import type { UserSession } from '../types/auth';

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
    <div className="sm-login min-vh-100 d-flex align-items-center py-4">
      <style>{`
        .sm-login {
          --sm-purple: #27187E;
          --sm-purple-dark: #1E1267;
          --sm-ink: #17133D;
          --sm-muted: #6F7194;
          --sm-line: #E0E1F0;
          background: #F7F7FF;
          color: var(--sm-ink);
          overflow: hidden;
          position: relative;
          isolation: isolate;
        }
        .sm-login::before,
        .sm-login::after {
          content: '';
          position: absolute;
          z-index: -1;
          pointer-events: none;
          border: 1px solid rgba(39, 24, 126, .08);
          transform: rotate(35deg);
        }
        .sm-login::before {
          width: 48rem; height: 48rem; left: -23rem; top: -26rem;
          border-radius: 9rem; box-shadow: 0 0 0 3rem rgba(39,24,126,.025), 0 0 0 7rem rgba(39,24,126,.02);
        }
        .sm-login::after {
          width: 35rem; height: 35rem; right: -23rem; bottom: -24rem;
          border-radius: 7rem; box-shadow: 0 0 0 3rem rgba(39,24,126,.025), 0 0 0 6rem rgba(39,24,126,.02);
        }
        .sm-login .sm-brand-panel { min-height: 34rem; }
        .sm-login .sm-logo-wrap {
          width: min(100%, 32rem); min-height: 19rem;
          border: 1px solid rgba(255,255,255,.7);
          background: rgba(255,255,255,.62);
          box-shadow: 0 1rem 3rem rgba(39,24,126,.08);
          backdrop-filter: blur(8px);
        }
        .sm-login .sm-login-card {
          width: 100%; max-width: 33rem;
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 1.25rem;
          background: rgba(255,255,255,.9);
          box-shadow: 0 1.25rem 4rem rgba(39,24,126,.10);
        }
        .sm-login .sm-field-icon { color: var(--sm-purple); background: #fff; border-color: var(--sm-line); }
        .sm-login .form-control, .sm-login .input-group-text { min-height: 3.25rem; border-color: var(--sm-line); }
        .sm-login .form-control { color: var(--sm-ink); font-size: .95rem; }
        .sm-login .form-control::placeholder { color: #9293AE; }
        .sm-login .form-control:focus {
          border-color: #9D91F0; box-shadow: 0 0 0 .22rem rgba(39,24,126,.12); z-index: 3;
        }
        .sm-login .form-check-input { border-color: #BCBCD4; }
        .sm-login .form-check-input:checked { background-color: var(--sm-purple); border-color: var(--sm-purple); }
        .sm-login .form-check-input:focus { border-color: #9D91F0; box-shadow: 0 0 0 .2rem rgba(39,24,126,.15); }
        .sm-login .btn-login { min-height: 3.35rem; background: var(--sm-purple); border-color: var(--sm-purple); transition: background-color .2s, transform .2s, box-shadow .2s; }
        .sm-login .btn-login:hover:not(:disabled) { background: var(--sm-purple-dark); border-color: var(--sm-purple-dark); transform: translateY(-1px); box-shadow: 0 .6rem 1.25rem rgba(39,24,126,.2); }
        .sm-login .btn-login:focus-visible, .sm-login .btn-eye:focus-visible { outline: 3px solid rgba(39,24,126,.28); outline-offset: 2px; }
        .sm-login .btn-eye { color: var(--sm-muted); background: #fff; border-color: var(--sm-line); }
        .sm-login .btn-eye:hover { color: var(--sm-purple); background: #F7F7FF; }
        @media (max-width: 991.98px) {
          .sm-login .sm-brand-panel { min-height: auto; }
          .sm-login .sm-logo-wrap { min-height: 0; width: auto; box-shadow: none; background: transparent; border: 0; }
        }
      `}</style>

      <div className="container position-relative py-lg-4">
        <div className="row align-items-center justify-content-center g-4 g-xl-5">
          <section className="col-lg-6 d-none d-lg-flex flex-column align-items-center justify-content-center text-center sm-brand-panel" aria-label="StockMaster">
            <div className="sm-logo-wrap rounded-5 d-flex align-items-center justify-content-center p-5">
              <img src={logoImg} alt="StockMaster" className="img-fluid" style={{ maxWidth: '29rem', maxHeight: '13rem', objectFit: 'contain' }} />
            </div>
            <p className="mt-4 mb-0 fw-medium" style={{ color: '#6F7194' }}>Controla tu inventario con claridad y confianza.</p>
          </section>

          <main className="col-12 col-lg-6 d-flex justify-content-center">
            <section className="sm-login-card p-4 p-sm-5" aria-labelledby="login-title">
              <div className="d-flex d-lg-none align-items-center justify-content-center mb-4">
                <img src={logoImg} alt="StockMaster" className="img-fluid" style={{ maxWidth: '13rem', maxHeight: '4rem', objectFit: 'contain' }} />
              </div>

              <header className="mb-4">
                <span className="badge rounded-pill mb-3 px-3 py-2" style={{ color: '#27187E', backgroundColor: '#EFEDFF' }}>FINVORA</span>
                <h1 id="login-title" className="h2 fw-bold mb-2" style={{ color: '#17133D', letterSpacing: '-.035em' }}>Iniciar sesión</h1>
                <p className="mb-0" style={{ color: '#6F7194' }}>Ingresa tus credenciales corporativas para continuar.</p>
              </header>

              {error && (
                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-3" role="alert">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label small fw-semibold mb-2">Correo electrónico</label>
                  <div className="input-group">
                    <span className="input-group-text rounded-start-3 sm-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    </span>
                    <input
                      id="login-email" ref={emailRef} type="email" className="form-control rounded-end-3"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com"
                      autoComplete="email" autoFocus disabled={loading} required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="login-password" className="form-label small fw-semibold mb-2">Contraseña</label>
                  <div className="input-group">
                    <span className="input-group-text rounded-start-3 sm-field-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </span>
                    <input
                      id="login-password" type={showPass ? 'text' : 'password'} className="form-control"
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      autoComplete="current-password" disabled={loading} required
                    />
                    <button type="button" className="input-group-text rounded-end-3 btn-eye" onClick={() => setShowPass((v) => !v)} title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'} aria-label={showPass ? 'Ocultar contraseña' : 'Ver contraseña'} aria-pressed={showPass}>
                      {showPass ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input type="checkbox" className="form-check-input" id="rememberCheck" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="rememberCheck" style={{ color: '#6F7194', cursor: 'pointer' }}>Recordar mi usuario</label>
                </div>

                <button type="submit" className="btn btn-primary btn-login w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-3 text-white" disabled={loading}>
                  {loading ? <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /><span>Autenticando...</span></> : <><span>Ingresar al sistema</span><span aria-hidden="true">→</span></>}
                </button>
              </form>

              <footer className="mt-4 pt-3 border-top text-center small" style={{ color: '#777995' }}>
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span>Acceso seguro cifrado con TLS</span>
                </div>
                <span>Finvora © {new Date().getFullYear()} · Todos los derechos reservados</span>
              </footer>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
