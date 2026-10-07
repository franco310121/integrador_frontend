import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Wallet, ListFilter, Save, Ban, RotateCcw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dateKey } from '../utils/cashFlow';
import { formatCurrency } from '../utils/formatters';
import { ledgerRows, ledgerSummary, moneyToCents, movementCategories, paymentMethods, validDate, type FinancialLedger, type MovementType } from '../utils/financialLedger';
import { loadFinancialLedger, saveFinancialLedger } from '../services/financialService';
import './MovimientosFinancieros.css';

const currency = (cents: number) => formatCurrency(cents / 100);
const showDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-PE');

export default function MovimientosFinancieros() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || String(session.userId).trim() === '') {
    return <div role="alert" className="alert alert-warning">Vuelve a iniciar sesión para identificar tu cuenta y registrar movimientos.</div>;
  }
  return <FinancialPage key={String(session.userId)} userId={String(session.userId)} />;
}

function FinancialPage({ userId }: { userId: string }) {
  const today = dateKey(new Date());
  const [initial] = useState(() => {
    try { return { ledger: loadFinancialLedger(userId), error: '' }; }
    catch { return { ledger: null, error: 'No se pudieron leer los datos locales. Revisa el almacenamiento del navegador y recarga la página para continuar.' }; }
  });
  const [ledger, setLedger] = useState<FinancialLedger | null>(initial.ledger);
  const [message, setMessage] = useState(initial.error);
  const [messageType, setMessageType] = useState<'success' | 'danger'>('danger');
  const [openingDate, setOpeningDate] = useState(initial.ledger?.openingDate ?? today);
  const [openingAmount, setOpeningAmount] = useState(initial.ledger ? String(initial.ledger.openingCents / 100) : '');
  const [type, setType] = useState<MovementType>('ingreso');
  const [date, setDate] = useState(today);
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(movementCategories.ingreso[0]);
  const [amount, setAmount] = useState('');
  const [contact, setContact] = useState('');
  const [method, setMethod] = useState(paymentMethods[0]);
  const [reference, setReference] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const blocked = Boolean(initial.error);
  const dateError = Boolean((from && (!validDate(from) || (ledger && from < ledger.openingDate))) || (to && !validDate(to)) || (from && to && from > to) || (ledger && to && to < ledger.openingDate));
  const summary = ledger && !dateError ? ledgerSummary(ledger, from, to) : null;
  const rows = ledger && !dateError ? ledgerRows(ledger).filter(item => (!from || item.date >= from) && (!to || item.date <= to) && (filterType === 'todos' || item.type === filterType) && (filterStatus === 'todos' || item.status === filterStatus) && `${item.concept} ${item.contact} ${item.reference} ${item.category}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))) : [];
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages);

  function fail(text: string) { setMessageType('danger'); setMessage(text); }
  function persist(next: FinancialLedger, text: string): boolean {
    if (blocked) return false;
    try {
      saveFinancialLedger(userId, next, ledger);
      setLedger(next); setMessageType('success'); setMessage(text); return true;
    } catch (error) {
      fail(error instanceof Error ? `${error.message} No se guardaron los cambios.` : 'No se pudieron guardar los datos en este navegador.');
      return false;
    }
  }
  function saveOpening(event: FormEvent) {
    event.preventDefault();
    const cents = moneyToCents(openingAmount, true);
    if (!validDate(openingDate) || openingDate > today || cents === null) { fail('Ingresa una fecha inicial válida hasta hoy y un saldo con hasta dos decimales (máximo S/ 1,000,000,000).'); return; }
    if (ledger?.movements.some(item => item.date < openingDate)) { fail('La fecha inicial no puede ser posterior a un movimiento ya registrado.'); return; }
    persist({ openingDate, openingCents: cents, movements: ledger?.movements ?? [] }, 'Saldo inicial guardado. El histórico se ha recalculado.');
  }
  function addMovement(event: FormEvent) {
    event.preventDefault();
    if (!ledger) { fail('Guarda primero el saldo inicial.'); return; }
    const cents = moneyToCents(amount);
    if (!validDate(date) || date < ledger.openingDate || date > today) { fail('La fecha debe estar entre la fecha inicial de caja y hoy. Registra aquí cobros y pagos ya realizados.'); return; }
    if (!concept.trim() || cents === null || cents < 1) { fail('Completa el concepto e ingresa un importe positivo con hasta dos decimales (máximo S/ 1,000,000,000).'); return; }
    const item = { id: crypto.randomUUID(), date, type, concept: concept.trim(), category, amountCents: cents, contact: contact.trim(), method, reference: reference.trim(), status: 'activo' as const, createdAt: new Date().toISOString() };
    if (persist({ ...ledger, movements: [...ledger.movements, item] }, `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado y guardado localmente.`)) {
      setConcept(''); setAmount(''); setContact(''); setReference(''); setPendingCancel(null);
    }
  }
  function toggleStatus(id: string) {
    if (!ledger) return;
    const item = ledger.movements.find(item => item.id === id);
    if (!item) return;
    const status = item.status === 'activo' ? 'anulado' : 'activo';
    if (persist({ ...ledger, movements: ledger.movements.map(item => item.id === id ? { ...item, status } : item) }, status === 'anulado' ? 'Movimiento anulado. Se conserva en el histórico y deja de afectar el saldo.' : 'Movimiento restaurado. El saldo se ha recalculado.')) setPendingCancel(null);
  }
  function resetFilters() { setFrom(''); setTo(''); setFilterType('todos'); setFilterStatus('todos'); setQuery(''); setPage(1); }

  return <section className="financial-page" aria-labelledby="financial-title">
    <header className="financial-hero mb-4"><div className="small mb-2">FINVORA / CONTROL DE CAJA</div><h1 id="financial-title" className="h3 fw-bold">Movimientos financieros</h1><p className="mb-0">Registra tus ingresos y egresos y consulta cómo cambia el saldo de tu negocio.</p></header>
    <div className="alert alert-info small">Registra cobros y pagos ya realizados. Los datos se guardan en este navegador para tu cuenta; la conexión con el servidor y con Ventas/Compras está pendiente. Para los movimientos previstos, utiliza <Link to="/flujo-caja">Flujo de caja</Link>.</div>
    {message && <div role={messageType === 'danger' ? 'alert' : 'status'} className={`alert alert-${messageType}`}>{message}</div>}
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="opening-title"><h2 id="opening-title" className="h5"><Wallet size={20} aria-hidden="true" /> Punto de partida de caja</h2><p className="small text-muted">Indica el saldo disponible al inicio de esta fecha, antes de los movimientos de ese día. Incluye el dinero de los medios de pago que vas a registrar.</p><form onSubmit={saveOpening} className="row g-3 align-items-end">
      <div className="col-md-4"><label htmlFor="financial-start" className="form-label">Fecha inicial *</label><input id="financial-start" type="date" className="form-control" required max={today} value={openingDate} onChange={e => setOpeningDate(e.target.value)} disabled={blocked} /></div>
      <div className="col-md-4"><label htmlFor="financial-opening" className="form-label">Saldo inicial (S/) *</label><input id="financial-opening" type="number" step="0.01" min="-1000000000" max="1000000000" className="form-control" required value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} disabled={blocked} placeholder="Puede ser cero o negativo" /></div>
      <div className="col-md-4"><button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={blocked}><Save size={16} aria-hidden="true" />{ledger ? 'Actualizar saldo inicial' : 'Guardar saldo inicial'}</button></div>
    </form>{ledger && <p className="small text-muted mt-3 mb-0">Base guardada: {currency(ledger.openingCents)} desde {showDate(ledger.openingDate)}. Cambiarla recalcula todos los saldos.</p>}</section>
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="register-financial"><h2 id="register-financial" className="h5">Registrar movimiento</h2><p className="small text-muted">Campos con * obligatorios. El importe se ingresa positivo; el tipo determina si suma o resta.</p>
      <form onSubmit={addMovement}><fieldset disabled={!ledger || blocked}>
        <div className="btn-group mb-3" role="group" aria-label="Tipo de movimiento">{(['ingreso', 'egreso'] as const).map(option => <button key={option} type="button" className={`btn btn-${type === option ? '' : 'outline-'}${option === 'ingreso' ? 'success' : 'danger'}`} aria-pressed={type === option} onClick={() => { setType(option); setCategory(movementCategories[option][0]); }}>{option === 'ingreso' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />} {option === 'ingreso' ? 'Ingreso' : 'Egreso'}</button>)}</div>
        <div className="row g-3">
          <div className="col-md-4"><label htmlFor="financial-date" className="form-label">Fecha del {type === 'ingreso' ? 'cobro' : 'pago'} *</label><input id="financial-date" className="form-control" type="date" min={ledger?.openingDate} max={today} required value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="col-md-4"><label htmlFor="financial-amount" className="form-label">Importe (S/) *</label><input id="financial-amount" className="form-control" type="number" step="0.01" min="0.01" max="1000000000" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="col-md-4"><label htmlFor="financial-category" className="form-label">Categoría *</label><select id="financial-category" className="form-select" value={category} onChange={e => setCategory(e.target.value)}>{movementCategories[type].map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="col-md-8"><label htmlFor="financial-concept" className="form-label">Concepto *</label><input id="financial-concept" className="form-control" required maxLength={180} value={concept} onChange={e => setConcept(e.target.value)} placeholder={type === 'ingreso' ? 'Ej. Cobro de factura a cliente' : 'Ej. Pago de alquiler del local'} /></div>
          <div className="col-md-4"><label htmlFor="financial-method" className="form-label">Medio de pago *</label><select id="financial-method" className="form-select" value={method} onChange={e => setMethod(e.target.value)}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="col-md-6"><label htmlFor="financial-contact" className="form-label">Cliente, proveedor o beneficiario</label><input id="financial-contact" className="form-control" maxLength={150} value={contact} onChange={e => setContact(e.target.value)} placeholder="Opcional" /></div>
          <div className="col-md-6"><label htmlFor="financial-reference" className="form-label">Comprobante o referencia</label><input id="financial-reference" className="form-control" maxLength={80} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej. F001-123 o número de operación" /></div>
        </div><button type="submit" className="btn btn-primary mt-3">Registrar {type}</button>
      </fieldset></form>{!ledger && <p className="small text-muted mt-2 mb-0">Guarda el saldo inicial para habilitar el registro.</p>}
    </section>

    <section className="card p-3 p-md-4" aria-labelledby="financial-history"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h2 id="financial-history" className="h5 mb-0"><ListFilter size={20} aria-hidden="true" /> Histórico del flujo de caja</h2><Link to="/importacion-financiera" className="btn btn-sm btn-outline-primary">Importar CSV</Link></div>
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-from" className="form-label">Desde</label><input id="financial-from" type="date" className="form-control" min={ledger?.openingDate} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-to" className="form-label">Hasta</label><input id="financial-to" type="date" className="form-control" min={from || ledger?.openingDate} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-filter-type" className="form-label">Tipo</label><select id="financial-filter-type" className="form-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}><option value="todos">Todos</option><option value="ingreso">Ingresos</option><option value="egreso">Egresos</option></select></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-filter-status" className="form-label">Estado</label><select id="financial-filter-status" className="form-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}><option value="todos">Todos</option><option value="activo">Activos</option><option value="anulado">Anulados</option></select></div>
        <div className="col-xl-4"><label htmlFor="financial-query" className="form-label">Buscar</label><input id="financial-query" className="form-control" maxLength={180} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Concepto, contacto, categoría o referencia" /></div>
      </div><button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={resetFilters}>Limpiar filtros</button>
      {dateError && <div role="alert" className="alert alert-warning">Usa fechas desde el inicio de caja y un rango donde «Desde» sea anterior o igual a «Hasta».</div>}
      {summary && <><div className="row g-3 mb-3">{[
        ['Saldo al inicio del rango', summary.openingCents], ['Ingresos del rango', summary.incomeCents], ['Egresos del rango', summary.expenseCents], ['Saldo al cierre del rango', summary.closingCents],
      ].map(([label, value]) => <div className="col-sm-6 col-xl-3" key={label}><div className="financial-kpi p-3 h-100"><div className="small text-muted">{label}</div><strong className={`h5 d-block mt-2 mb-0${Number(value) < 0 ? ' text-danger' : ''}`}>{currency(Number(value))}</strong></div></div>)}</div><p className="small text-muted">El resumen incluye todos los movimientos activos del rango de fechas. Los filtros de tipo, estado y búsqueda afectan la tabla. El saldo de cada fila conserva el acumulado completo desde el saldo inicial.</p></>}
      <div className="table-responsive"><table className="table align-middle financial-table"><caption>{rows.length} movimientos encontrados. Los anulados se conservan y no afectan el saldo. Orden: fecha, registro e identificador.</caption><thead><tr><th>Fecha</th><th>Concepto / contacto</th><th>Categoría / medio</th><th>Referencia</th><th className="text-end">Ingreso</th><th className="text-end">Egreso</th><th className="text-end">Saldo acumulado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {rows.slice((currentPage - 1) * 10, currentPage * 10).map(item => <tr key={item.id} className={item.status === 'anulado' ? 'financial-cancelled' : ''}><td className="text-nowrap">{showDate(item.date)}</td><td className="financial-concept"><strong>{item.concept}</strong>{item.contact && <span className="small text-muted d-block">{item.contact}</span>}</td><td>{item.category}<span className="small text-muted d-block">{item.method}</span></td><td className="financial-reference">{item.reference || '—'}</td><td className="text-end text-nowrap">{item.type === 'ingreso' ? currency(item.amountCents) : '—'}</td><td className="text-end text-nowrap">{item.type === 'egreso' ? currency(item.amountCents) : '—'}</td><td className="text-end fw-semibold text-nowrap">{currency(item.balanceCents)}</td><td><span className={`badge bg-${item.status === 'activo' ? 'success' : 'secondary'}-subtle text-${item.status === 'activo' ? 'success' : 'secondary'}`}>{item.status === 'activo' ? 'Activo' : 'Anulado'}</span></td><td>
          {pendingCancel === item.id ? <div className="financial-cancel-actions"><span className="small d-block mb-1">¿Anular este movimiento?</span><button type="button" className="btn btn-sm btn-danger me-1" onClick={() => toggleStatus(item.id)}>Anular</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPendingCancel(null)}>Cancelar</button></div> : <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={() => item.status === 'activo' ? setPendingCancel(item.id) : toggleStatus(item.id)} aria-label={`${item.status === 'activo' ? 'Anular' : 'Restaurar'} ${item.concept}`}>{item.status === 'activo' ? <Ban size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />} {item.status === 'activo' ? 'Anular' : 'Restaurar'}</button>}
        </td></tr>)}
        {rows.length === 0 && <tr><td colSpan={9} className="text-center text-muted py-4">{!ledger ? 'Configura el saldo inicial y registra tu primer ingreso o egreso.' : ledger.movements.length === 0 ? 'Todavía no hay movimientos financieros registrados.' : 'No hay movimientos que coincidan con estos filtros.'}</td></tr>}
      </tbody></table></div>
      {pages > 1 && <nav className="d-flex gap-2 align-items-center justify-content-end" aria-label="Páginas del histórico"><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span className="small">Página {currentPage} de {pages}</span><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}
    </section>
  </section>;
}
