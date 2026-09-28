import { useState, useEffect, type FormEvent } from 'react';
import {
  UserPlus,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  Power
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUsers, createUser, deactivateUser, activateUser } from '../services/usuarioService';
import type { PerfilDB } from '../types/auth';
import Loader from '../components/feedback/Loader';
import { formatDate } from '../utils/formatters';

const INITIAL_FORM = { correo: '', password: '', nombreCompleto: '', rol: 'vendedor' };

export default function Usuarios() {
  const { session } = useAuth();
  const [users, setUsers]           = useState<PerfilDB[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [msgType, setMsgType]       = useState<'success' | 'danger'>('success');

  useEffect(() => {
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.nombreCompleto.trim() || !createForm.correo.trim()) {
      showNotification('Todos los campos marcados son obligatorios.', 'danger');
      return;
    }
    if (createForm.password.length < 6) {
      showNotification('La clave de acceso debe contener al menos 6 caracteres.', 'danger');
      return;
    }

    setSaving(true);
    try {
      const newUser = await createUser({
        correo: createForm.correo.trim(),
        password: createForm.password,
        nombreCompleto: createForm.nombreCompleto.trim(),
        rol: createForm.rol,
      });
      setUsers(prev => [...prev, newUser].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
      setShowCreate(false);
      setCreateForm(INITIAL_FORM);
      showNotification('Cuenta de usuario creada satisfactoriamente.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Error al registrar la cuenta de usuario.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: PerfilDB) => {
    const isCurrentlyActive = user.estado === 'activo';
    try {
      if (isCurrentlyActive) {
        await deactivateUser(user.id);
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, estado: 'inactivo' } : u)));
        showNotification(`La cuenta de ${user.nombre_completo} ha sido desactivada.`, 'success');
      } else {
        await activateUser(user.id);
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, estado: 'activo' } : u)));
        showNotification(`La cuenta de ${user.nombre_completo} ha sido activada.`, 'success');
      }
    } catch {
      showNotification('Ocurrió un error al actualizar el estado de la cuenta.', 'danger');
    }
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Administración de Cuentas</h1>
          <p className="text-muted mb-0 small">Gestión de usuarios del sistema, niveles de autorización y credenciales</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
          onClick={() => setShowCreate(true)}
        >
          <UserPlus size={16} />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Fecha de Registro</th>
                <th className="text-end">Operaciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.estado === 'inactivo' ? 'table-light text-muted opacity-75' : ''}>
                  <td>
                    <div className="d-flex align-items-center gap-2.5">
                      <div
                        className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
                        style={{ width: 34, height: 34, fontSize: 13 }}
                      >
                        {u.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-semibold small text-dark">{u.nombre_completo}</div>
                        {u.id === session?.userId && (
                          <span className="badge badge-soft-primary px-2 py-0.5" style={{ fontSize: '.65rem' }}>
                            Sesión actual
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted small">{u.correo}</td>
                  <td>
                    <span className={`badge d-inline-flex align-items-center gap-1 py-1 px-2.5 rounded-pill ${u.rol === 'admin' ? 'badge-soft-primary' : 'badge-soft-success'}`}>
                      {u.rol === 'admin' ? <ShieldCheck size={12} /> : <User size={12} />}
                      <span>{u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </span>
                  </td>
                  <td>
                    <span className={`badge py-1 px-2.5 rounded-pill ${u.estado === 'activo' ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                      {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-muted small">{formatDate(u.fecha_creacion)}</td>
                  <td className="text-end">
                    {u.id !== session?.userId && (
                      <button
                        type="button"
                        className={`btn btn-sm ${u.estado === 'activo' ? 'btn-outline-danger' : 'btn-outline-success'} py-1 px-2.5 rounded-2 d-inline-flex align-items-center gap-1`}
                        onClick={() => handleToggleStatus(u)}
                      >
                        <Power size={13} />
                        <span>{u.estado === 'activo' ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {showCreate && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-bottom py-3 px-4">
                <h5 className="modal-title fs-6 fw-bold text-dark mb-0">Registrar Cuenta de Usuario</h5>
                <button
                  type="button"
                  className="btn-close p-1"
                  onClick={() => setShowCreate(false)}
                  aria-label="Cerrar modal"
                />
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                      Nombre y Apellidos *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={createForm.nombreCompleto}
                      onChange={e => setCreateForm(f => ({ ...f, nombreCompleto: e.target.value }))}
                      placeholder="Ejemplo: Carlos Mendoza"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={createForm.correo}
                      onChange={e => setCreateForm(f => ({ ...f, correo: e.target.value }))}
                      placeholder="usuario@empresa.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                      Clave de Acceso Inicial *
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                      Rol en el Sistema *
                    </label>
                    <select
                      className="form-select"
                      value={createForm.rol}
                      onChange={e => setCreateForm(f => ({ ...f, rol: e.target.value }))}
                    >
                      <option value="vendedor">Vendedor / Operador</option>
                      <option value="admin">Administrador del Sistema</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-light border-top py-2.5 px-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary px-3"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Crear Cuenta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
