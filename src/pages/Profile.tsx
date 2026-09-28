import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, LogOut, CheckCircle2, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateDisplayName, changePassword, logout } from '../services/authService';

export default function Profile() {
  const { session, setSession, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState<string>(session?.displayName || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');
  const [savingName, setSavingName] = useState<boolean>(false);
  const [savingPass, setSavingPass] = useState<boolean>(false);

  const flash = (m: string, t: 'success' | 'danger') => {
    setMsg(m);
    setMsgType(t);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      flash('El nombre completo no puede estar vacío.', 'danger');
      return;
    }
    setSavingName(true);
    try {
      if (session?.userId) {
        await updateDisplayName(session.userId, displayName.trim());
      }
      if (session) {
        setSession({ ...session, displayName: displayName.trim() });
      }
      flash('✔ Nombre actualizado correctamente.', 'success');
    } catch {
      // Si la API retorna error (ej: vendedor sin permisos admin), actualizamos localmente
      if (session) {
        setSession({ ...session, displayName: displayName.trim() });
      }
      flash('✔ Nombre actualizado en la sesión actual.', 'success');
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      flash('La nueva contraseña debe contener un mínimo de 6 caracteres.', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      flash('Las contraseñas ingresadas no coinciden.', 'danger');
      return;
    }
    setSavingPass(true);
    try {
      if (session?.userId) {
        await changePassword(session.userId, newPassword);
      }
      setNewPassword('');
      setConfirmPassword('');
      flash('✔ Contraseña actualizada con éxito.', 'success');
    } catch {
      flash('Error al actualizar la contraseña en el servidor.', 'danger');
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
    navigate('/login');
  };

  const initial = (session?.displayName || session?.username || '?').charAt(0).toUpperCase();

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">👤 Mi Perfil</h1>
          <p className="text-muted mb-0 small">Configuración de cuenta e información personal</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="row g-4">
        {/* User Identity Card */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-3 text-center">
            <div className="card-body py-4 px-3">
              <div
                className="rounded-circle text-white d-inline-flex align-items-center justify-content-center mb-3 fw-bold shadow-sm"
                style={{ width: 80, height: 80, fontSize: 32, background: 'linear-gradient(135deg, #102a45 0%, #1b3a5c 100%)' }}
              >
                {initial}
              </div>
              <h5 className="h6 mb-1 fw-bold text-dark">{session?.displayName || 'Usuario'}</h5>
              <div className="text-muted small mb-2">@{session?.username}</div>
              {session?.correo && (
                <div className="text-muted small mb-3 text-truncate px-2" title={session.correo}>
                  {session.correo}
                </div>
              )}
              <div className="mb-4">
                <span className={`badge ${isAdmin() ? 'badge-soft-warning' : 'badge-soft-info'} px-3 py-1.5 rounded-pill`}>
                  {isAdmin() ? '👑 Administrador del Sistema' : '🔧 Vendedor / Operador'}
                </span>
              </div>
              <hr className="my-3 opacity-25" />
              <button
                type="button"
                className="btn btn-outline-danger w-100 d-inline-flex align-items-center justify-content-center gap-2 rounded-3 py-2 btn-sm"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Edit Forms */}
        <div className="col-12 col-md-8">
          {/* Change Name */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <User size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Datos de la Cuenta</span>
            </div>
            <div className="card-body p-3 p-sm-4">
              <form onSubmit={handleSaveName}>
                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Tu nombre completo o razón social"
                    required
                  />
                </div>
                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3 rounded-2 fw-semibold"
                    disabled={savingName}
                  >
                    {savingName ? 'Guardando...' : 'Guardar Nombre'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change Password */}
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <KeyRound size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Seguridad y Credenciales</span>
            </div>
            <div className="card-body p-3 p-sm-4">
              <form onSubmit={handleSavePassword}>
                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Nueva Contraseña
                  </label>
                  <div className="input-group">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-control"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPass(v => !v)}
                      title={showPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>
                    Confirmar Contraseña
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-control"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <div className="form-text text-danger small mt-1">Las contraseñas no coinciden.</div>
                  )}
                </div>

                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-warning btn-sm px-3 rounded-2 fw-semibold text-dark"
                    disabled={savingPass || !newPassword || newPassword !== confirmPassword}
                  >
                    {savingPass ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
