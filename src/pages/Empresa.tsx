import { useState, useEffect, type FormEvent } from 'react';
import { Building2, CheckCircle2, MapPin, Contact, Save, Cloud } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  emptyEmpresa,
  loadEmpresa,
  saveEmpresa,
  fetchEmpresaFromApi,
  saveEmpresaToApi,
  type Empresa as EmpresaData,
} from '../services/empresaService';
import './Empresa.css';

export default function Empresa() {
  const { session } = useAuth();
  const userId = session?.userId;
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    return <div className="alert alert-warning" role="alert">No se pudo identificar tu cuenta. Vuelve a iniciar sesión para administrar la empresa.</div>;
  }
  return <EmpresaForm key={String(userId)} userId={String(userId)} />;
}

function EmpresaForm({ userId }: { userId: string }) {
  const [initial] = useState(() => {
    try { return { record: loadEmpresa(userId), error: '' }; }
    catch { return { record: null, error: 'No se pudieron leer los datos guardados. Revisa el almacenamiento del navegador antes de guardar un nuevo registro.' }; }
  });
  const [saved, setSaved] = useState(initial.record);
  const [form, setForm] = useState<EmpresaData>(initial.record?.empresa ?? { ...emptyEmpresa });
  const [message, setMessage] = useState(initial.error);
  const [messageType, setMessageType] = useState<'success' | 'danger'>('danger');
  const [errors, setErrors] = useState<Partial<Record<keyof EmpresaData, string>>>({});
  const [syncedBackend, setSyncedBackend] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved?.empresa ?? emptyEmpresa);

  useEffect(() => {
    let active = true;
    fetchEmpresaFromApi()
      .then((remote) => {
        if (!active || !remote) return;
        setSyncedBackend(true);
        const currentLocal = initial.record?.empresa ?? emptyEmpresa;
        const merged: EmpresaData = {
          razonSocial: remote.nombreMype || currentLocal.razonSocial,
          nombreComercial: currentLocal.nombreComercial || remote.nombreMype || '',
          ruc: remote.ruc || currentLocal.ruc,
          actividad: remote.sectorComercial || currentLocal.actividad || 'Comercio y Servicios',
          direccion: remote.direccion || currentLocal.direccion || '',
          departamento: currentLocal.departamento || 'Lima',
          provincia: currentLocal.provincia || 'Lima',
          distrito: currentLocal.distrito || 'Lima',
          correo: remote.correo || currentLocal.correo || '',
          telefono: remote.telefono || currentLocal.telefono || '',
          representante: currentLocal.representante || '',
        };
        const stored = saveEmpresa(userId, merged);
        setSaved(stored);
        setForm(merged);
      })
      .catch(() => {
        /* Si el backend no responde aún, se mantiene el registro local */
      });
    return () => { active = false; };
  }, [userId, initial.record]);

  function update(key: keyof EmpresaData, value: string) {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as unknown as EmpresaData;
    const nextErrors: Partial<Record<keyof EmpresaData, string>> = {};
    for (const key of ['razonSocial', 'actividad', 'direccion', 'departamento', 'provincia', 'distrito'] as const) {
      if (!normalized[key]) nextErrors[key] = 'Completa este campo.';
    }
    if (!/^\d{11}$/.test(normalized.ruc)) nextErrors.ruc = 'Ingresa exactamente 11 dígitos.';
    if (normalized.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.correo)) nextErrors.correo = 'Ingresa un correo válido.';
    if (normalized.telefono && (!/^[+\d\s()-]+$/.test(normalized.telefono) || normalized.telefono.replace(/\D/g, '').length < 7 || normalized.telefono.replace(/\D/g, '').length > 15)) nextErrors.telefono = 'Ingresa un teléfono de 7 a 15 dígitos; puedes usar +, espacios o guiones.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessageType('danger'); setMessage('Revisa los campos indicados antes de guardar.');
      document.getElementById(`empresa-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setSavingApi(true);
    try {
      const record = saveEmpresa(userId, normalized);
      setSaved(record);
      setForm(normalized);
      try {
        await saveEmpresaToApi(normalized);
        setSyncedBackend(true);
        setMessageType('success');
        setMessage('¡Listo! Los datos de tu negocio se han guardado correctamente.');
      } catch {
        setMessageType('success');
        setMessage('Los datos de tu negocio se guardaron en este equipo.');
      }
    } catch {
      setMessageType('danger');
      setMessage('No se pudieron guardar los datos. Inténtalo de nuevo.');
    } finally {
      setSavingApi(false);
    }
  }

  function field(key: keyof EmpresaData, label: string, options: { required?: boolean; placeholder?: string; type?: string; maxLength?: number; hint?: string; wide?: boolean } = {}) {
    return <div className={options.wide ? 'col-12' : 'col-md-6'}>
      <label htmlFor={`empresa-${key}`} className="form-label">{label}{options.required && <span aria-hidden="true"> *</span>}</label>
      <input id={`empresa-${key}`} name={key} className={`form-control${errors[key] ? ' is-invalid' : ''}`} type={options.type ?? 'text'} value={form[key]} required={options.required} maxLength={options.maxLength ?? 150} inputMode={key === 'ruc' ? 'numeric' : undefined} placeholder={options.placeholder} onChange={e => update(key, e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `empresa-${key}-error` : options.hint ? `empresa-${key}-hint` : undefined} />
      {errors[key] ? <div id={`empresa-${key}-error`} className="invalid-feedback">{errors[key]}</div> : options.hint && <div id={`empresa-${key}-hint`} className="form-text">{options.hint}</div>}
    </div>;
  }

  return <section className="empresa-page" aria-labelledby="empresa-title">
    <header className="empresa-hero mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div className="d-flex align-items-center gap-3"><div className="empresa-symbol"><Building2 size={28} aria-hidden="true" /></div><h1 id="empresa-title" className="h4 fw-bold mb-0">Datos de mi negocio</h1></div>
      <div className="d-flex flex-wrap gap-2">
        <span className="badge bg-white text-primary">{saved ? 'Guardado' : 'Pendiente'}</span>
        {syncedBackend && <span className="badge bg-success-subtle text-success d-inline-flex align-items-center gap-1"><Cloud size={13} /> Sincronizado</span>}
      </div>
    </header>
    <div className="row g-4">
      <div className="col-lg-8">
        <form onSubmit={submit} noValidate>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-identity"><h2 id="empresa-identity" className="h5 fw-bold mb-3"><Building2 size={19} aria-hidden="true" /> 1. Nombre y RUC</h2><div className="row g-3">
            {field('razonSocial', 'Nombre legal o razón social', { required: true, placeholder: 'Ej. Bodega San Martín S.A.C.', wide: true })}
            {field('nombreComercial', 'Nombre comercial', { placeholder: 'Ej. Bodega San Martín' })}
            {field('ruc', 'RUC (11 dígitos)', { required: true, maxLength: 11 })}
            {field('actividad', 'Rubro o giro', { required: true, placeholder: 'Ej. Abarrotes, ropa, ferretería', wide: true })}
          </div></section>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-address"><h2 id="empresa-address" className="h5 fw-bold mb-3"><MapPin size={19} aria-hidden="true" /> 2. Ubicación</h2><div className="row g-3">
            {field('direccion', 'Dirección', { required: true, maxLength: 250, placeholder: 'Avenida, calle o número', wide: true })}
            {field('departamento', 'Departamento', { required: true, maxLength: 80 })}
            {field('provincia', 'Provincia', { required: true, maxLength: 80 })}
            {field('distrito', 'Distrito', { required: true, maxLength: 80 })}
            <div className="col-md-6"><label htmlFor="empresa-country" className="form-label">País</label><input id="empresa-country" className="form-control" value="Perú" readOnly /></div>
          </div></section>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-contact"><h2 id="empresa-contact" className="h5 fw-bold mb-3"><Contact size={19} aria-hidden="true" /> 3. Contacto <span className="small fw-normal text-muted">(opcional)</span></h2><div className="row g-3">
            {field('representante', 'Dueño o encargado', { wide: true })}
            {field('correo', 'Correo', { type: 'email', placeholder: 'contacto@tunegocio.pe' })}
            {field('telefono', 'Teléfono / WhatsApp', { type: 'tel', maxLength: 25, placeholder: '+51 999 999 999' })}
          </div></section>
          {message && <div className={`alert alert-${messageType}`} role={messageType === 'danger' ? 'alert' : 'status'}>{message}</div>}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={savingApi || (Boolean(saved) && !dirty)}><Save size={17} aria-hidden="true" />{savingApi ? 'Guardando...' : 'Guardar cambios'}</button>
            <button type="button" className="btn btn-outline-secondary" disabled={!dirty} onClick={() => { setForm({ ...(saved?.empresa ?? emptyEmpresa) }); setErrors({}); setMessage(''); }}>Deshacer</button>
          </div>
        </form>
      </div>
      <aside className="col-lg-4" aria-labelledby="empresa-summary"><div className="card p-4 empresa-summary">
        <div className="empresa-summary-icon mb-3"><Building2 size={28} aria-hidden="true" /></div>
        <h2 id="empresa-summary" className="h5 fw-bold mb-3">Resumen</h2>
        {saved ? <><h3 className="h6 fw-bold text-break">{saved.empresa.nombreComercial || saved.empresa.razonSocial}</h3><dl className="mb-0 small"><dt>Razón social</dt><dd>{saved.empresa.razonSocial}</dd><dt>RUC</dt><dd>{saved.empresa.ruc}</dd><dt>Rubro</dt><dd>{saved.empresa.actividad}</dd><dt>Dirección</dt><dd>{saved.empresa.direccion}<br />{saved.empresa.distrito}, {saved.empresa.provincia}</dd></dl><hr /><div className="small text-success"><CheckCircle2 size={16} aria-hidden="true" /> Guardado</div></> : <div className="border rounded-3 p-3 small text-muted">Sin datos registrados.</div>}
      </div></aside>
    </div>
  </section>;
}
