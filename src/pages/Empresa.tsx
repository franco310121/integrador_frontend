import { useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, MapPin, Contact, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { emptyEmpresa, loadEmpresa, saveEmpresa, type Empresa as EmpresaData } from '../services/empresaService';
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
  const dirty = JSON.stringify(form) !== JSON.stringify(saved?.empresa ?? emptyEmpresa);

  function update(key: keyof EmpresaData, value: string) {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
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
    try {
      const record = saveEmpresa(userId, normalized);
      setSaved(record); setForm(normalized); setMessageType('success');
      setMessage('Datos de la empresa guardados en este navegador para tu cuenta.');
    } catch {
      setMessageType('danger');
      setMessage('No se pudieron guardar los datos. Comprueba que el navegador permita almacenamiento local e inténtalo de nuevo. Tus cambios siguen en el formulario.');
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
    <header className="empresa-hero mb-4">
      <div className="d-flex align-items-center gap-3"><div className="empresa-symbol"><Building2 size={30} aria-hidden="true" /></div><div><div className="small mb-1">FINVORA / ADMINISTRACIÓN</div><h1 id="empresa-title" className="h3 fw-bold mb-1">Mi empresa</h1><p className="mb-0">La información de tu negocio, en un solo lugar.</p></div></div>
      <span className="badge bg-white text-primary mt-3">{saved ? 'Registro local guardado' : 'Registro pendiente'}</span>
    </header>
    <div className="alert alert-info small">Los datos se guardan únicamente en este navegador, para tu cuenta. Permanecen al recargar, pero no se comparten con otros usuarios o dispositivos. La conexión con el servidor está pendiente.</div>
    <div className="row g-4">
      <div className="col-lg-8">
        <form onSubmit={submit} noValidate>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-identity"><h2 id="empresa-identity" className="h5"><Building2 size={19} aria-hidden="true" /> Identificación de la empresa</h2><p className="small text-muted">Los campos con * son obligatorios.</p><div className="row g-3">
            {field('razonSocial', 'Razón social', { required: true, placeholder: 'Nombre legal de la empresa', wide: true })}
            {field('nombreComercial', 'Nombre comercial', { placeholder: 'Nombre con el que conocen tu negocio' })}
            {field('ruc', 'RUC', { required: true, maxLength: 11, hint: 'Solo se comprueba el formato de 11 dígitos; no se consulta SUNAT.' })}
            {field('actividad', 'Actividad económica', { required: true, placeholder: 'Ej. Comercio minorista de abarrotes', wide: true })}
          </div></section>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-address"><h2 id="empresa-address" className="h5 mb-3"><MapPin size={19} aria-hidden="true" /> Ubicación</h2><div className="row g-3">
            {field('direccion', 'Dirección', { required: true, maxLength: 250, placeholder: 'Avenida, número, local o referencia', wide: true })}
            {field('departamento', 'Departamento', { required: true, maxLength: 80 })}
            {field('provincia', 'Provincia', { required: true, maxLength: 80 })}
            {field('distrito', 'Distrito', { required: true, maxLength: 80 })}
            <div className="col-md-6"><label htmlFor="empresa-country" className="form-label">País</label><input id="empresa-country" className="form-control" value="Perú" readOnly /></div>
          </div></section>
          <section className="card p-3 p-md-4 mb-3" aria-labelledby="empresa-contact"><h2 id="empresa-contact" className="h5 mb-3"><Contact size={19} aria-hidden="true" /> Contacto <span className="small fw-normal text-muted">(opcional)</span></h2><div className="row g-3">
            {field('representante', 'Responsable o representante', { wide: true })}
            {field('correo', 'Correo de la empresa', { type: 'email', placeholder: 'contacto@tuempresa.pe' })}
            {field('telefono', 'Teléfono', { type: 'tel', maxLength: 25, placeholder: '+51 999 999 999' })}
          </div></section>
          {message && <div className={`alert alert-${messageType}`} role={messageType === 'danger' ? 'alert' : 'status'}>{message}</div>}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={Boolean(saved) && !dirty}><Save size={17} aria-hidden="true" />{saved ? 'Guardar cambios' : 'Guardar empresa'}</button>
            <button type="button" className="btn btn-outline-secondary" disabled={!dirty} onClick={() => { setForm({ ...(saved?.empresa ?? emptyEmpresa) }); setErrors({}); setMessage(''); }}>Descartar cambios</button>
            <span className="small text-muted" aria-live="polite">{dirty ? 'Cambios sin guardar' : saved ? 'Sin cambios pendientes' : 'Completa los datos para comenzar'}</span>
          </div>
        </form>
      </div>
      <aside className="col-lg-4" aria-labelledby="empresa-summary"><div className="card p-4 empresa-summary">
        <div className="empresa-summary-icon mb-3"><Building2 size={28} aria-hidden="true" /></div>
        <h2 id="empresa-summary" className="h5">Ficha de la empresa</h2>
        <p className="small text-muted">{saved ? 'Última información guardada en este navegador.' : 'Tu ficha aparecerá cuando guardes el formulario.'}</p>
        {saved ? <><h3 className="h5 text-break">{saved.empresa.nombreComercial || saved.empresa.razonSocial}</h3><dl className="mb-0"><dt>Razón social</dt><dd>{saved.empresa.razonSocial}</dd><dt>RUC</dt><dd>{saved.empresa.ruc}</dd><dt>Actividad</dt><dd>{saved.empresa.actividad}</dd><dt>Dirección</dt><dd>{saved.empresa.direccion}<br />{saved.empresa.distrito}, {saved.empresa.provincia}, {saved.empresa.departamento}</dd><dt>Moneda del sistema</dt><dd>Sol peruano (PEN)</dd></dl><hr /><div className="small text-success"><CheckCircle2 size={16} aria-hidden="true" /> Guardado localmente</div><time className="small text-muted" dateTime={saved.updatedAt}>{new Date(saved.updatedAt).toLocaleString('es-PE')}</time></> : <div className="border rounded-3 p-3 small text-muted">Registra la identidad, ubicación y datos de contacto de tu MYPE.</div>}
      </div></aside>
    </div>
  </section>;
}
