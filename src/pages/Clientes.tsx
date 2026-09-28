import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  X
} from 'lucide-react';
import { getClients, createClient, updateClient, deleteClient } from '../services/clienteService';
import type { ClienteDB } from '../types/cliente';
import Loader from '../components/feedback/Loader';
import { formatDateTime } from '../utils/formatters';

export default function Clientes() {
  const [clients, setClients] = useState<ClienteDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoc, setFilterDoc] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');

  // Modal de creación / edición
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteDB | null>(null);

  // Modal de detalles
  const [viewClient, setViewClient] = useState<ClienteDB | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [numDoc, setNumDoc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [formError, setFormError] = useState('');

  // Mensaje flotante de feedback
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const loadData = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      showNotification('Error al cargar la lista de clientes.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingClient(null);
    setNombre('');
    setTipoDoc('DNI');
    setNumDoc('');
    setTelefono('');
    setCorreo('');
    setDireccion('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (client: ClienteDB) => {
    setEditingClient(client);
    setNombre(client.nombre);
    setTipoDoc(client.tipoDocumento || client.tipo_documento || 'DNI');
    setNumDoc(client.numeroDocumento || client.numero_documento || '');
    setTelefono(client.telefono || '');
    setCorreo(client.correo || '');
    setDireccion(client.direccion || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNombre = nombre.trim();
    const cleanDoc = numDoc.trim();

    if (!cleanNombre) {
      setFormError('El nombre o razón social es obligatorio.');
      return;
    }

    if (!cleanDoc) {
      setFormError('El número de documento es obligatorio.');
      return;
    }

    // Validar formato numérico y longitud según tipo
    if (tipoDoc === 'DNI') {
      if (!/^\d{8}$/.test(cleanDoc)) {
        setFormError('El DNI debe contener exactamente 8 dígitos numéricos.');
        return;
      }
    } else if (tipoDoc === 'RUC') {
      if (!/^\d{11}$/.test(cleanDoc)) {
        setFormError('El RUC debe contener exactamente 11 dígitos numéricos.');
        return;
      }
    }

    // Validar duplicado en frontend antes de enviar
    const duplicate = clients.find(
      c =>
        c.id !== editingClient?.id &&
        (c.numeroDocumento || c.numero_documento || '').trim() === cleanDoc
    );

    if (duplicate) {
      setFormError(`El documento ${cleanDoc} ya se encuentra registrado a nombre de: ${duplicate.nombre}`);
      return;
    }

    try {
      if (editingClient && editingClient.id) {
        await updateClient(editingClient.id, {
          nombre: cleanNombre,
          tipoDocumento: tipoDoc,
          numeroDocumento: cleanDoc,
          telefono: telefono.trim(),
          correo: correo.trim(),
          direccion: direccion.trim(),
          estado: editingClient.estado || 'activo',
        });
        showNotification(`Cliente "${cleanNombre}" actualizado correctamente.`);
      } else {
        await createClient({
          nombre: cleanNombre,
          tipoDocumento: tipoDoc,
          numeroDocumento: cleanDoc,
          telefono: telefono.trim(),
          correo: correo.trim(),
          direccion: direccion.trim(),
          estado: 'activo',
        });
        showNotification(`Cliente "${cleanNombre}" registrado exitosamente.`);
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al procesar la solicitud.');
    }
  };

  const handleToggleEstado = async (client: ClienteDB) => {
    if (!client.id) return;
    const nuevoEstado = client.estado === 'inactivo' ? 'activo' : 'inactivo';
    try {
      await updateClient(client.id, {
        nombre: client.nombre,
        tipoDocumento: client.tipoDocumento || 'DNI',
        numeroDocumento: client.numeroDocumento || '',
        telefono: client.telefono,
        correo: client.correo,
        direccion: client.direccion,
        estado: nuevoEstado,
      });
      showNotification(`Cliente marcado como ${nuevoEstado}.`);
      loadData();
    } catch (err: any) {
      showNotification(err?.message || 'Error al cambiar estado.', 'danger');
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm('¿Confirma desactivar este cliente?')) return;
    try {
      await deleteClient(id);
      showNotification('Cliente desactivado correctamente.');
      loadData();
    } catch {
      showNotification('Error al desactivar cliente.', 'danger');
    }
  };

  // Filtrado de clientes
  const filtered = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const doc = (c.numeroDocumento || c.numero_documento || '').toLowerCase();
    const nom = c.nombre.toLowerCase();
    const matchSearch = nom.includes(term) || doc.includes(term);

    const docType = (c.tipoDocumento || c.tipo_documento || 'DNI').toUpperCase();
    const matchType = filterDoc === 'todos' || docType === filterDoc.toUpperCase();

    const estado = (c.estado || 'activo').toLowerCase();
    const matchEstado = filterEstado === 'todos' || estado === filterEstado.toLowerCase();

    return matchSearch && matchType && matchEstado;
  });

  const totalDni = clients.filter(c => (c.tipoDocumento || c.tipo_documento || '').toUpperCase() === 'DNI').length;
  const totalRuc = clients.filter(c => (c.tipoDocumento || c.tipo_documento || '').toUpperCase() === 'RUC').length;
  const totalActivos = clients.filter(c => (c.estado || 'activo') === 'activo').length;

  if (loading) return <Loader />;

  return (
    <>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1 fw-bold text-dark">Gestión de Clientes</h1>
          <p className="text-muted mb-0 small">Directorio de clientes comerciales para emisión de comprobantes (DNI / RUC)</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 rounded-3 shadow-sm px-3.5 py-2"
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span className="fw-semibold">Nuevo Cliente</span>
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 rounded-3 mb-3 d-flex align-items-center gap-2 shadow-sm`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>Total Registrados</span>
            <div className="h3 mb-0 fw-bold text-dark mt-1">{clients.length}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>Clientes Activos</span>
            <div className="h3 mb-0 fw-bold text-success mt-1">{totalActivos}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>Personas (DNI)</span>
            <div className="h3 mb-0 fw-bold text-primary mt-1">{totalDni}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '.7rem' }}>Empresas (RUC)</span>
            <div className="h3 mb-0 fw-bold text-gold mt-1">{totalRuc}</div>
          </div>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-2.5 align-items-center">
            <div className="col-12 col-md-6 col-lg-5 position-relative">
              <input
                type="text"
                className="form-control form-control-sm ps-4"
                placeholder="Buscar por nombre, razón social, DNI o RUC..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={14} className="position-absolute text-muted" style={{ top: '50%', transform: 'translateY(-50%)', left: 12 }} />
            </div>
            <div className="col-6 col-md-3 col-lg-3">
              <select
                className="form-select form-select-sm"
                value={filterDoc}
                onChange={e => setFilterDoc(e.target.value)}
              >
                <option value="todos">Todos los documentos</option>
                <option value="DNI">Solo DNI</option>
                <option value="RUC">Solo RUC</option>
              </select>
            </div>
            <div className="col-6 col-md-3 col-lg-2">
              <select
                className="form-select form-select-sm"
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
            <div className="col-12 col-lg-2 text-md-end text-muted small">
              {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-uppercase text-muted" style={{ fontSize: '.72rem', letterSpacing: '.05em' }}>
                <th className="ps-3 py-3">Documento</th>
                <th>Cliente / Razón Social</th>
                <th>Contacto</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th className="text-end pe-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    <Users size={32} className="opacity-25 mb-2 d-block mx-auto" />
                    No se encontraron clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const doc = c.numeroDocumento || c.numero_documento || 'S/D';
                  const tipo = (c.tipoDocumento || c.tipo_documento || 'DNI').toUpperCase();
                  const isActivo = (c.estado || 'activo') === 'activo';

                  return (
                    <tr key={c.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-1.5">
                          <span className={`badge ${tipo === 'RUC' ? 'bg-primary' : 'bg-secondary'} rounded-pill px-2`} style={{ fontSize: '.7rem' }}>
                            {tipo}
                          </span>
                          <span className="font-monospace fw-semibold small">{doc}</span>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{c.nombre}</div>
                        <span className="text-muted" style={{ fontSize: '.72rem' }}>
                          Reg: {c.fechaCreacion ? formatDateTime(c.fechaCreacion) : 'Reciente'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-0.5">
                          {c.telefono ? (
                            <span className="small text-muted d-flex align-items-center gap-1">
                              <Phone size={11} className="text-muted" /> {c.telefono}
                            </span>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                          {c.correo && (
                            <span className="small text-muted d-flex align-items-center gap-1">
                              <Mail size={11} className="text-muted" /> {c.correo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="small text-muted text-truncate" style={{ maxWidth: 220 }}>
                          {c.direccion ? (
                            <span className="d-flex align-items-center gap-1">
                              <MapPin size={11} className="flex-shrink-0" /> {c.direccion}
                            </span>
                          ) : '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isActivo ? 'badge-soft-success' : 'badge-soft-danger'} rounded-pill px-2.5 py-1`}>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light p-1.5 border rounded-2"
                            title="Ver ficha del cliente"
                            onClick={() => setViewClient(c)}
                          >
                            <Eye size={14} className="text-muted" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light p-1.5 border rounded-2"
                            title="Editar cliente"
                            onClick={() => openEditModal(c)}
                          >
                            <Edit2 size={14} className="text-primary" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light p-1.5 border rounded-2"
                            title={isActivo ? 'Inactivar cliente' : 'Activar cliente'}
                            onClick={() => handleToggleEstado(c)}
                          >
                            <Trash2 size={14} className={isActivo ? 'text-danger' : 'text-success'} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Cliente */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark h6 mb-0">
                  {editingClient ? 'Modificar Datos de Cliente' : 'Registrar Nuevo Cliente'}
                </h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSaveClient}>
                <div className="modal-body p-3 p-sm-4">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small border-0 rounded-3 mb-3 d-flex align-items-center gap-2">
                      <AlertCircle size={16} className="text-danger flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-4">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        Tipo Doc. *
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={tipoDoc}
                        onChange={e => {
                          setTipoDoc(e.target.value);
                          setNumDoc('');
                        }}
                      >
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                      </select>
                    </div>
                    <div className="col-8">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        N° Documento ({tipoDoc === 'DNI' ? '8 dígitos' : '11 dígitos'}) *
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm font-monospace"
                        placeholder={tipoDoc === 'DNI' ? 'Ej. 45892134' : 'Ej. 20601234567'}
                        maxLength={tipoDoc === 'DNI' ? 8 : 11}
                        value={numDoc}
                        onChange={e => setNumDoc(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        Nombre Completo o Razón Social *
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ej. Distribuidora Lima S.A.C. / Juan Pérez"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder="Ej. 987654321"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        placeholder="cliente@empresa.com"
                        value={correo}
                        onChange={e => setCorreo(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-uppercase text-muted" style={{ fontSize: '.7rem' }}>
                        Dirección
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Av., Calle, N°, Distrito"
                        value={direccion}
                        onChange={e => setDireccion(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top py-2.5 px-3">
                  <button type="button" className="btn btn-sm btn-light border" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3">
                    {editingClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha / Detalles de Cliente */}
      {viewClient && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark h6 mb-0 d-flex align-items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  <span>Ficha del Cliente</span>
                </h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setViewClient(null)} />
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                    {viewClient.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold text-dark">{viewClient.nombre}</h6>
                    <span className="badge bg-secondary rounded-pill me-1">
                      {viewClient.tipoDocumento || 'DNI'}: {viewClient.numeroDocumento || 'S/D'}
                    </span>
                    <span className={`badge ${(viewClient.estado || 'activo') === 'activo' ? 'badge-soft-success' : 'badge-soft-danger'} rounded-pill`}>
                      {viewClient.estado || 'activo'}
                    </span>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Teléfono:</span>
                    <span className="fw-semibold text-dark">{viewClient.telefono || 'No registrado'}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Correo:</span>
                    <span className="fw-semibold text-dark">{viewClient.correo || 'No registrado'}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Dirección:</span>
                    <span className="fw-semibold text-dark text-end">{viewClient.direccion || 'No registrada'}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Fecha de Registro:</span>
                    <span className="text-muted">{viewClient.fechaCreacion ? formatDateTime(viewClient.fechaCreacion) : '-'}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top py-2.5">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setViewClient(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
