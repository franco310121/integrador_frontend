import { useState, useEffect, type FormEvent } from 'react';
import {
  Tags,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import { getCategories, createCategory, deleteCategory } from '../services/productoService';
import type { CategoriaDB } from '../types/producto';
import Loader from '../components/feedback/Loader';
import { formatDate } from '../utils/formatters';

export default function Categorias() {
  const [categories, setCategories]     = useState<CategoriaDB[]>([]);
  const [nombre, setNombre]             = useState('');
  const [descripcion, setDescripcion]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [confirmDelId, setConfirmDelId] = useState<number | null>(null);
  const [msg, setMsg]                   = useState('');
  const [msgType, setMsgType]           = useState<'success' | 'danger'>('success');

  useEffect(() => {
    getCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  const showNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = nombre.trim();
    if (!cleanName) {
      showNotification('Debe ingresar un nombre de categoría válido.', 'danger');
      return;
    }
    if (categories.some(c => c.nombre.toLowerCase() === cleanName.toLowerCase())) {
      showNotification('Ya existe una categoría con esa denominación.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const createdCategory = await createCategory(cleanName, descripcion.trim() || null);
      setCategories(prev => [...prev, createdCategory].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNombre('');
      setDescripcion('');
      showNotification('Categoría registrada correctamente.', 'success');
    } catch {
      showNotification('Ocurrió un error al intentar crear la categoría.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirmDelId) return;
    try {
      await deleteCategory(confirmDelId);
      setCategories(prev => prev.filter(c => c.id !== confirmDelId));
      setConfirmDelId(null);
      showNotification('Categoría eliminada de forma permanente.', 'success');
    } catch {
      showNotification('Imposible eliminar la categoría: contiene productos vinculados.', 'danger');
      setConfirmDelId(null);
    }
  };

  const selectedCategory = categories.find(c => c.id === confirmDelId);

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">Clasificación de Categorías</h1>
          <p className="text-muted mb-0 small">Estructuración y jerarquía taxonómica de los artículos del inventario</p>
        </div>
      </div>

      {msg && (
        <div className={`alert alert-${msgType} py-2.5 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
          {msgType === 'success' ? <CheckCircle2 size={16} className="text-success" /> : <AlertTriangle size={16} className="text-danger" />}
          <span>{msg}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <FolderPlus size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Nueva Categoría</span>
            </div>
            <div className="card-body p-3 p-sm-4">
              <form onSubmit={handleAddCategory}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ejemplo: Dispositivos de Red"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Descripción Funcional
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Detalles sobre los productos de este grupo..."
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2.5 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                  disabled={saving}
                >
                  <Plus size={16} />
                  <span>{saving ? 'Guardando...' : 'Crear Categoría'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <Tags size={18} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">
                Categorías en Catálogo ({categories.length})
              </span>
            </div>
            {categories.length === 0 ? (
              <div className="card-body text-center text-muted py-5 small">
                No existen categorías configuradas en la base de datos.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 80 }}>Código</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Fecha de Registro</th>
                      <th className="text-end" style={{ width: 100 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td className="text-muted small">#{cat.id}</td>
                        <td className="fw-semibold small text-dark">{cat.nombre}</td>
                        <td className="text-muted small">{cat.descripcion || '—'}</td>
                        <td className="text-muted small">{formatDate(cat.fecha_creacion)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm p-1.5 rounded-2 d-inline-flex align-items-center"
                            onClick={() => setConfirmDelId(cat.id!)}
                            title="Eliminar categoría"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirmDelId !== null && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-bottom py-3 px-4">
                <h5 className="modal-title fs-6 fw-bold text-dark mb-0">Confirmar Eliminación</h5>
                <button
                  type="button"
                  className="btn-close p-1"
                  onClick={() => setConfirmDelId(null)}
                  aria-label="Cerrar modal"
                />
              </div>
              <div className="modal-body small p-4">
                ¿Está seguro de eliminar la categoría <strong>"{selectedCategory?.nombre}"</strong>? Esta acción no se podrá realizar si cuenta con productos vinculados.
              </div>
              <div className="modal-footer bg-light border-top py-2.5 px-4">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmDelId(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-sm btn-danger px-3" onClick={handleDeleteCategory}>
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
