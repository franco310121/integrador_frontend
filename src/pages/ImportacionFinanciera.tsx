import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dateKey } from '../utils/cashFlow';
import { formatCurrency } from '../utils/formatters';
import { movementCategories, paymentMethods, type FinancialLedger } from '../utils/financialLedger';
import { importHeaders, previewFinancialImport, type ImportPreview } from '../utils/financialImport';
import { loadFinancialLedger, saveFinancialLedger } from '../services/financialService';
import './ImportacionFinanciera.css';

export default function ImportacionFinanciera() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || String(session.userId).trim() === '') return <div className="alert alert-warning" role="alert">Vuelve a iniciar sesión para identificar tu cuenta e importar movimientos.</div>;
  return <ImportPage key={String(session.userId)} userId={String(session.userId)} />;
}

function ImportPage({ userId }: { userId: string }) {
  const [initial] = useState(() => {
    try { return { ledger: loadFinancialLedger(userId), error: '' }; }
    catch { return { ledger: null, error: 'No se pudo leer el registro financiero local. Revisa el almacenamiento y vuelve a intentar.' }; }
  });
  const [ledger, setLedger] = useState<FinancialLedger | null>(initial.ledger);
  const [message, setMessage] = useState(initial.error);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const errors = preview?.rows.filter(row => row.errors.length).length ?? 0;
  const duplicates = preview?.rows.filter(row => row.duplicate).length ?? 0;
  const candidates = preview?.rows.filter(row => row.movement && !row.duplicate) ?? [];
  const visible = preview?.rows.filter(row => !onlyErrors || row.errors.length) ?? [];
  const pages = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pages);
  const income = candidates.reduce((sum, row) => sum + (row.movement!.type === 'ingreso' ? row.movement!.amountCents : 0), 0);
  const expense = candidates.reduce((sum, row) => sum + (row.movement!.type === 'egreso' ? row.movement!.amountCents : 0), 0);

  function resetPreview() {
    request.current++; setPreview(null); setFileName(''); setConfirmed(false); setPage(1); setOnlyErrors(false); setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }
  function refreshLedger() {
    resetPreview(); setSuccess(false);
    try { const current = loadFinancialLedger(userId); setLedger(current); setMessage(current ? 'Registro financiero actualizado. Puedes seleccionar un CSV.' : 'Configura primero el saldo inicial en Movimientos financieros.'); }
    catch { setLedger(null); setMessage('No se pudo leer el registro financiero. Comprueba el almacenamiento del navegador.'); }
  }
  function downloadTemplate() {
    const date = dateKey(new Date());
    const text = `\uFEFF${importHeaders.join(';')}\r\n${date};ingreso;EJEMPLO - reemplaza este cobro;100.00;Otro ingreso;Efectivo;Cliente de ejemplo;EJEMPLO-001\r\n${date};egreso;EJEMPLO - reemplaza este pago;25.50;Otro egreso;Transferencia;Proveedor de ejemplo;EJEMPLO-002\r\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'plantilla-importacion-financiera.csv'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    resetPreview(); setMessage(''); setSuccess(false);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setMessage('Selecciona un archivo .csv. Si usas Excel, expórtalo como CSV UTF-8.'); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage('El archivo supera el máximo de 2 MB. Divídelo en archivos más pequeños.'); return; }
    const currentRequest = request.current;
    setBusy(true); setFileName(file.name);
    try {
      const snapshot = loadFinancialLedger(userId);
      if (!snapshot) throw new Error('Guarda primero la fecha y el saldo inicial en Movimientos financieros.');
      const buffer = await file.arrayBuffer();
      if (request.current !== currentRequest) return;
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { throw new Error('La codificación no es UTF-8. Exporta el archivo como CSV UTF-8 y vuelve a cargarlo.'); }
      const result = previewFinancialImport(text, snapshot, dateKey(new Date()));
      setLedger(snapshot); setPreview(result);
    } catch (error) {
      if (request.current === currentRequest) setMessage(error instanceof Error ? error.message : 'No se pudo leer el archivo.');
    } finally { if (request.current === currentRequest) setBusy(false); }
  }
  function importMovements() {
    if (!ledger || !preview || busy || errors || !candidates.length || !confirmed) return;
    setSuccess(false);
    try {
      const createdAt = new Date().toISOString();
      const movements = candidates.map(row => ({ ...row.movement!, id: crypto.randomUUID(), status: 'activo' as const, createdAt }));
      const next = { ...ledger, movements: [...ledger.movements, ...movements] };
      saveFinancialLedger(userId, next, ledger);
      setLedger(next); resetPreview(); setSuccess(true);
      setMessage(`Se importaron ${movements.length} movimientos. Se omitieron ${duplicates} duplicados. Ya están disponibles en Movimientos financieros.`);
    } catch (error) { setMessage(error instanceof Error ? `${error.message} La importación no se guardó.` : 'No se pudo guardar la importación.'); }
  }

  return <section className="import-page" aria-labelledby="import-title">
    <header className="import-hero mb-4"><div className="small mb-2">FINVORA / DATOS FINANCIEROS</div><h1 id="import-title" className="h3 fw-bold">Importación financiera</h1><p className="mb-0">Carga, revisa y valida tus cobros y pagos antes de incorporarlos al histórico.</p></header>
    <div className="alert alert-info small">La importación se guarda en este navegador para tu cuenta y se integra con <Link to="/movimientos-financieros">Movimientos financieros</Link>. Registra cobros y pagos realizados en soles (PEN). La conexión con el servidor está pendiente.</div>
    {message && <div className={`alert alert-${success ? 'success' : 'warning'}`} role={success ? 'status' : 'alert'}>{success && <CheckCircle2 size={18} className="me-2" aria-hidden="true" />}{message}</div>}
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="import-format"><div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><h2 id="import-format" className="h5 mb-0">1. Prepara tu archivo</h2><button type="button" className="btn btn-outline-primary d-inline-flex gap-2 align-items-center" onClick={downloadTemplate}><Download size={17} aria-hidden="true" /> Descargar plantilla CSV</button></div>
      <p className="small text-muted">La plantilla contiene dos ejemplos. Reemplázalos por tus datos antes de importarla.</p>
      <div className="table-responsive"><table className="table table-sm import-format-table"><caption>Formato CSV UTF-8, separado por punto y coma o coma. Máximo 2 MB y 5,000 movimientos.</caption><thead><tr><th>Columnas obligatorias</th><th>Formato</th></tr></thead><tbody><tr><td><code>fecha</code></td><td>AAAA-MM-DD o DD/MM/AAAA, desde la fecha inicial de caja hasta hoy.</td></tr><tr><td><code>tipo</code></td><td>ingreso o egreso. Se aceptan cobro y pago.</td></tr><tr><td><code>concepto</code></td><td>Descripción del movimiento (máximo 180 caracteres).</td></tr><tr><td><code>importe</code></td><td>Positivo, hasta dos decimales, sin separador de miles. Ej.: 1250.50 o 1250,50. Si el CSV usa coma como separador, encierra el importe con coma decimal entre comillas.</td></tr></tbody></table></div>
      <details><summary className="fw-semibold small">Columnas opcionales y valores admitidos</summary><div className="small mt-3"><p><code>categoria</code>: ingresos — {movementCategories.ingreso.join(', ')}; egresos — {movementCategories.egreso.join(', ')}. Si está vacía, se asigna Otro ingreso u Otro egreso.</p><p><code>medio_pago</code>: {paymentMethods.join(', ')}. Si está vacío, se asigna Efectivo.</p><p><code>contacto</code>: hasta 150 caracteres. <code>referencia</code>: hasta 80 caracteres. Ambas pueden quedar vacías.</p><p className="mb-0">Se eliminan espacios al inicio y al final. Se normalizan encabezados, mayúsculas, fechas, tipos, categorías, medios y coma decimal. Los importes no se redondean para corregir decimales de más.</p></div></details>
    </section>
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="import-upload"><h2 id="import-upload" className="h5"><FileUp size={20} aria-hidden="true" /> 2. Carga y valida el CSV</h2>
      {ledger ? <p className="small text-muted">Caja configurada desde {ledger.openingDate}, saldo inicial {formatCurrency(ledger.openingCents / 100)}.</p> : <div className="alert alert-warning small">Antes de importar, <Link to="/movimientos-financieros">configura la fecha y el saldo inicial de caja</Link>. Al volver, pulsa «Actualizar caja».</div>}
      <div className="d-flex flex-wrap gap-3 align-items-end"><div className="flex-grow-1"><label htmlFor="financial-import-file" className="form-label">Archivo CSV UTF-8</label><input ref={inputRef} id="financial-import-file" type="file" accept=".csv,text/csv" className="form-control" disabled={!ledger || busy} onChange={selectFile} /></div><button type="button" className="btn btn-outline-secondary" onClick={refreshLedger}>Actualizar caja</button></div>
      {busy && <p className="small mt-3 mb-0" role="status">Leyendo y validando el archivo…</p>}
      {preview && <p className="small text-muted mt-3 mb-0">{fileName} · Separador detectado: {preview.delimiter === ';' ? 'punto y coma' : 'coma'}. Cargar el archivo todavía no modifica el histórico.</p>}
    </section>
    {preview && <section className="card p-3 p-md-4" aria-labelledby="import-preview"><h2 id="import-preview" className="h5 mb-3">3. Revisa y confirma la importación</h2>
      <div className="row g-3 mb-3">{[['Filas leídas', preview.rows.length], ['Listas para importar', candidates.length], ['Filas con errores', errors], ['Duplicados a omitir', duplicates]].map(([label, value]) => <div className="col-sm-6 col-xl-3" key={label}><div className="import-kpi p-3"><div className="small text-muted">{label}</div><strong className="h4 d-block mt-2 mb-0">{value}</strong></div></div>)}</div>
      {preview.warnings.map(note => <div key={note} className="alert alert-warning small">{note}</div>)}
      {errors > 0 && <div className="alert alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /> Corrige las {errors} filas con errores en tu archivo y vuelve a cargarlo. La importación completa permanece bloqueada.</div>}
      <p className="small text-muted">Se omiten coincidencias en fecha, tipo, importe, concepto, categoría, medio, contacto y referencia, tanto del archivo como del histórico (incluidos anulados). Si dos operaciones distintas coinciden, asigna referencias diferentes. Los saldos iniciales y movimientos existentes se conservan.</p>
      <div className="form-check mb-3"><input id="import-errors-only" type="checkbox" className="form-check-input" checked={onlyErrors} onChange={e => { setOnlyErrors(e.target.checked); setPage(1); }} /><label htmlFor="import-errors-only" className="form-check-label small">Mostrar solo filas con errores</label></div>
      <div className="table-responsive"><table className="table align-middle import-preview-table"><caption>Vista previa de los valores normalizados y observaciones. «Fila» indica la línea inicial del registro en el CSV.</caption><thead><tr><th>Fila</th><th>Fecha / tipo</th><th>Concepto / contacto / referencia</th><th>Importe</th><th>Categoría / medio</th><th>Validación</th></tr></thead><tbody>{visible.slice((currentPage - 1) * 10, currentPage * 10).map(row => <tr key={row.line}><td>{row.line}</td><td className="text-nowrap">{row.movement?.date ?? row.raw.fecha}<span className="d-block small">{row.movement?.type ?? row.raw.tipo}</span></td><td className="import-text-cell">{row.movement?.concept ?? row.raw.concepto}<span className="d-block small text-muted">Contacto: {row.movement?.contact || row.raw.contacto || '—'}</span><span className="d-block small text-muted">Referencia: {row.movement?.reference || row.raw.referencia || '—'}</span></td><td className="text-nowrap">{row.movement ? formatCurrency(row.movement.amountCents / 100) : row.raw.importe}</td><td className="import-text-cell">{row.movement?.category ?? row.raw.categoria}<span className="d-block small text-muted">{row.movement?.method ?? row.raw.medio_pago}</span></td><td className="import-notes-cell"><span className={`badge mb-1 bg-${row.errors.length ? 'danger' : row.duplicate ? 'warning' : 'success'}-subtle text-${row.errors.length ? 'danger' : row.duplicate ? 'warning' : 'success'}`}>{row.errors.length ? 'Error' : row.duplicate ? 'Se omitirá' : 'Lista'}</span>{row.errors.map(error => <div key={error} className="small text-danger">{error}</div>)}{row.notes.map(note => <div key={note} className="small text-muted">{note}</div>)}</td></tr>)}{!visible.length && <tr><td colSpan={6} className="text-center text-muted py-3">No hay filas con errores.</td></tr>}</tbody></table></div>
      {pages > 1 && <nav className="d-flex align-items-center gap-2 justify-content-end mb-3" aria-label="Páginas de la vista previa"><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span className="small">{currentPage} / {pages}</span><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}
      <div className="import-totals p-3 mb-3"><strong>Totales de las filas listas:</strong> Ingresos {formatCurrency(income / 100)} · Egresos {formatCurrency(expense / 100)} · Variación de caja {formatCurrency((income - expense) / 100)}.</div>
      {!errors && !candidates.length && <div className="alert alert-warning">Todas las filas son duplicadas. No hay movimientos nuevos para importar.</div>}
      <div className="form-check mb-3"><input id="import-confirm" type="checkbox" className="form-check-input" disabled={Boolean(errors) || !candidates.length} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><label htmlFor="import-confirm" className="form-check-label">Revisé los datos y confirmo que corresponden a cobros y pagos realizados. Deseo incorporar {candidates.length} movimientos al histórico.</label></div>
      <div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-primary" disabled={!confirmed || Boolean(errors) || !candidates.length || busy} onClick={importMovements}>Importar {candidates.length} movimientos</button><button type="button" className="btn btn-outline-secondary" onClick={() => { resetPreview(); setMessage(''); }}>Cancelar importación</button><Link to="/movimientos-financieros" className="btn btn-link">Ver movimientos financieros</Link></div>
    </section>}
    {!preview && success && <Link to="/movimientos-financieros" className="btn btn-primary">Ver movimientos importados</Link>}
  </section>;
}
