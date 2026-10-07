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
const categoriasStyles = `
.finvora-categorias {
  color: #19113e;
  color-scheme: light;
  background: radial-gradient(ellipse at 95% 0%, #ede9fc, transparent 45%), #f7f7ff;
  border: 1px solid #eeebfa;
  border-radius: 28px;
  padding: clamp(18px, 2.5vw, 32px);
  min-width: 0;
}
.finvora-categorias .text-dark { color: #19113e !important; }
.finvora-categorias .text-muted { color: #727799 !important; }
.finvora-categorias .text-primary { color: #27187e !important; }
.finvora-categorias .fv-hero {
  padding: clamp(22px, 3vw, 36px);
  background: linear-gradient(120deg, #ffffff 25%, #f0edff);
  border: 1px solid #ffffff;
  border-radius: 24px;
  box-shadow: 0 12px 34px rgba(39, 24, 126, .05);
}
.finvora-categorias .fv-eyebrow { color: #64548f; font-size: .66rem; font-weight: 700; letter-spacing: .16em; margin-bottom: 12px; }
.finvora-categorias h1 { font-size: clamp(1.4rem, 2.1vw, 1.9rem); letter-spacing: -.04em; }
.finvora-categorias .fv-hero p { line-height: 1.7; margin-top: 10px; }
.finvora-categorias .fv-hero-icon { display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 18px; background: #eae4ff; color: #27187e; flex-shrink: 0; }
.finvora-categorias .card { background: #ffffff !important; border: 1px solid #e8e5f5 !important; border-radius: 20px !important; box-shadow: 0 8px 26px rgba(39, 24, 126, .045) !important; overflow: hidden; }
.finvora-categorias .card-header { padding: 22px !important; background: #ffffff !important; border-color: #e8e5f5 !important; }
.finvora-categorias .card-header .text-uppercase { text-transform: none !important; font-size: .9rem; }
.finvora-categorias .card-body { padding: 24px !important; }
.finvora-categorias .form-label { text-transform: none !important; font-size: .8rem !important; color: #393054 !important; margin-bottom: 9px; }
.finvora-categorias .form-control { background: #f7f7ff !important; color: #27187e !important; border: 1px solid #d9d6f2 !important; border-radius: 11px; padding: 12px 14px; font-size: .85rem; }
.finvora-categorias .form-control::placeholder { color: #8586a1; opacity: 1; }
.finvora-categorias .form-control:focus { background: #ffffff !important; border-color: #7861c5 !important; box-shadow: 0 0 0 3px rgba(39, 24, 126, .12) !important; }
.finvora-categorias textarea { min-height: 126px; resize: vertical; }
.finvora-categorias .btn-primary { background: #27187e !important; border-color: #27187e !important; color: #ffffff !important; padding: 13px 18px !important; border-radius: 11px !important; font-size: .85rem; box-shadow: 0 5px 12px rgba(39, 24, 126, .14) !important; }
.finvora-categorias .btn-primary:hover:not(:disabled) { background: #38249f !important; border-color: #38249f !important; }
.finvora-categorias .btn:disabled { opacity: .6; }
.finvora-categorias .fv-empty { min-height: 310px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.finvora-categorias .fv-empty-icon { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 20px; background: #f0ecff; color: #7964b9; margin-bottom: 6px; }
.finvora-categorias .table { --bs-table-bg: #ffffff; --bs-table-color: #19113e; --bs-table-hover-bg: #f7f5ff; --bs-table-hover-color: #19113e; --bs-table-border-color: #e8e5f5; min-width: 630px; }
.finvora-categorias .table > :not(caption) > * > * { padding: 17px 20px; background-color: #ffffff; border-color: #e8e5f5 !important; }
.finvora-categorias .table thead th { background: #f9f8ff !important; color: #77708f !important; font-size: .65rem; white-space: nowrap; }
.finvora-categorias .table td { overflow-wrap: anywhere; max-width: 280px; }
.finvora-categorias .table-hover tbody tr:hover > * { background-color: #f7f5ff; }
.finvora-categorias .fv-delete { background: #fff3f5; border: 1px solid #f3d9e0; color: #ae3353; padding: 9px !important; border-radius: 9px !important; }
.finvora-categorias .fv-delete:hover { background: #b52d50; border-color: #b52d50; color: #ffffff; }
.finvora-categorias .alert { padding: 14px 18px !important; border-radius: 13px !important; }
.finvora-categorias .alert-success { background: #edf8f2; color: #237554; }
.finvora-categorias .alert-danger { background: #fff0f3; color: #aa284b; }
.finvora-categorias .modal { color: #19113e; }
.finvora-categorias .modal-content { background: #ffffff !important; color: #19113e; border: 1px solid #e8e5f5 !important; border-radius: 20px !important; box-shadow: 0 24px 80px rgba(39, 24, 126, .2) !important; }
.finvora-categorias .modal-header, .finvora-categorias .modal-footer { background: #faf9ff !important; border-color: #e8e5f5 !important; }
.finvora-categorias .modal-body { line-height: 1.8; color: #625a79; }
.finvora-categorias .modal-body strong { color: #27187e; }
.finvora-categorias .btn-close { filter: none !important; }
.finvora-categorias .btn-outline-secondary { background: #ffffff; color: #62557f; border-color: #ddd7ee; border-radius: 9px; }
.finvora-categorias .btn-outline-secondary:hover { background: #eeebff; color: #27187e; }
.finvora-categorias .btn-danger { background: #b52d50; border-color: #b52d50; border-radius: 9px; }
.finvora-categorias .btn-danger:hover { background: #962241; border-color: #962241; }
.finvora-categorias .btn:focus-visible { outline: 3px solid #9b88df; outline-offset: 3px; box-shadow: none !important; }
@media (max-width: 575.98px) {
  .finvora-categorias { padding: 14px; border-radius: 20px; }
  .finvora-categorias .fv-hero { padding: 24px 18px; }
  .finvora-categorias .fv-hero-icon { display: none; }
  .finvora-categorias .card-header, .finvora-categorias .card-body { padding: 18px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .finvora-categorias .card, .finvora-categorias .btn, .finvora-categorias .form-control { transition: none; }
}
`;

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
    <section className="finvora-categorias" aria-label="Gestión de categorías">
      <style>{categoriasStyles}</style>
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 fv-hero">
        <div>
          <div className="fv-eyebrow">FINVORA / ORGANIZACIÓN DEL INVENTARIO</div>
          <h1 className="h4 mb-0 fw-bold text-dark">Clasificación de Categorías</h1>
          <p className="text-muted mb-0 small">Estructuración y jerarquía taxonómica de los artículos del inventario</p>
        </div>
        <div className="fv-hero-icon" aria-hidden="true"><Tags size={28} /></div>
      </div>
      {msg && (
        <div role="status" aria-live="polite" className={`alert alert-${msgType} py-3 px-3 small border-0 shadow-sm rounded-3 mb-3 d-flex align-items-center gap-2`}>
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
                  <label htmlFor="categoria-nombre" className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Nombre de la Categoría *
                  </label>
                  <input
                    id="categoria-nombre"
                    type="text"
                    className="form-control"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ejemplo: Dispositivos de Red"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="categoria-descripcion" className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: '.7rem' }}>
                    Descripción Funcional
                  </label>
                  <textarea
                    id="categoria-descripcion"
                    className="form-control"
                    rows={3}
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Detalles sobre los productos de este grupo..."
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
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
              <div className="card-body text-center text-muted py-5 small fv-empty">
                <div className="fv-empty-icon" aria-hidden="true"><Tags size={28} /></div>
                <span>No existen categorías configuradas en la base de datos.</span>
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
                            className="btn btn-outline-danger btn-sm p-2 fv-delete rounded-2 d-inline-flex align-items-center"
                            onClick={() => setConfirmDelId(cat.id!)}
                            title="Eliminar categoría"
                            aria-label={`Eliminar categoría ${cat.nombre}`}
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
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="categoria-confirmar-titulo" tabIndex={-1} style={{ background: 'rgba(25, 17, 62, 0.38)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-bottom py-3 px-4">
                <h5 id="categoria-confirmar-titulo" className="modal-title fs-6 fw-bold text-dark mb-0">Confirmar Eliminación</h5>
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
              <div className="modal-footer bg-light border-top py-3 px-4">
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
    </section>
  );
}
