import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Wallet, ListFilter, Save, Ban, RotateCcw, Cloud, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dateKey } from '../utils/cashFlow';
import { formatCurrency } from '../utils/formatters';
import { ledgerRows, ledgerSummary, moneyToCents, movementCategories, paymentMethods, validDate, type FinancialLedger, type MovementType } from '../utils/financialLedger';
import { getDefaultLedger, loadFinancialLedger, saveFinancialLedger } from '../services/financialService';
import { getHistoricoCaja, registrarTransaccionCaja } from '../services/flujoCajaIaService';
import type { FlujoCajaHistoricoResponse } from '../types/finanzas';
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
    try {
      let current = loadFinancialLedger(userId);
      if (!current) {
        current = getDefaultLedger();
        saveFinancialLedger(userId, current, null);
      }
      return { ledger: current, error: '' };
    } catch {
      return { ledger: null, error: 'No se pudieron leer los datos locales. Revisa el almacenamiento del navegador y recarga la página para continuar.' };
    }
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
  const [backendHistorico, setBackendHistorico] = useState<FlujoCajaHistoricoResponse | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  const blocked = Boolean(initial.error);
  const dateError = Boolean((from && (!validDate(from) || (ledger && from < ledger.openingDate))) || (to && !validDate(to)) || (from && to && from > to) || (ledger && to && to < ledger.openingDate));
  const summary = ledger && !dateError ? ledgerSummary(ledger, from, to) : null;
  const rows = ledger && !dateError ? ledgerRows(ledger).filter(item => (!from || item.date >= from) && (!to || item.date <= to) && (filterType === 'todos' || item.type === filterType) && (filterStatus === 'todos' || item.status === filterStatus) && `${item.concept} ${item.contact} ${item.reference} ${item.category}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))) : [];
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages);

  const fetchBackend = async () => {
    setLoadingBackend(true);
    try {
      const data = await getHistoricoCaja();
      setBackendHistorico(data);
    } catch {
      /* mantener vista local si el servidor no está disponible */
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    fetchBackend();
  }, []);

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
  async function addMovement(event: FormEvent) {
    event.preventDefault();
    if (!ledger) { fail('Guarda primero el saldo inicial.'); return; }
    const cents = moneyToCents(amount);
    if (!validDate(date) || date < ledger.openingDate || date > today) { fail('La fecha debe estar entre la fecha inicial de caja y hoy. Registra aquí cobros y pagos ya realizados.'); return; }
    if (!concept.trim() || cents === null || cents < 1) { fail('Completa el concepto e ingresa un importe positivo con hasta dos decimales (máximo S/ 1,000,000,000).'); return; }
    const item = { id: crypto.randomUUID(), date, type, concept: concept.trim(), category, amountCents: cents, contact: contact.trim(), method, reference: reference.trim(), status: 'activo' as const, createdAt: new Date().toISOString() };
    if (persist({ ...ledger, movements: [...ledger.movements, item] }, `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado localmente.`)) {
      const obsParts = [concept.trim(), contact.trim() && `Contacto: ${contact.trim()}`, `Medio: ${method}`, reference.trim() && `Ref: ${reference.trim()}`].filter(Boolean);
      setConcept(''); setAmount(''); setContact(''); setReference(''); setPendingCancel(null);
      try {
        await registrarTransaccionCaja({
          tipo: type,
          categoriaGasto: category,
          monto: cents / 100,
          fechaTransaccion: `${date}T12:00:00`,
          observaciones: obsParts.join(' | '),
        });
        setMessage(`${type === 'ingreso' ? 'Ingreso' : 'Gasto'} guardado correctamente.`);
        fetchBackend();
      } catch {
        /* se conserva el registro local */
      }
    }
  }
  function toggleStatus(id: string) {
    if (!ledger) return;
    const item = ledger.movements.find(item => item.id === id);
    if (!item) return;
    const status = item.status === 'activo' ? 'anulado' : 'activo';
    if (persist({ ...ledger, movements: ledger.movements.map(item => item.id === id ? { ...item, status } : item) }, status === 'anulado' ? 'Movimiento anulado. Ya no se suma ni resta de tu dinero disponible.' : 'Movimiento restaurado. Tu dinero disponible se ha actualizado.')) setPendingCancel(null);
  }
  function resetFilters() { setFrom(''); setTo(''); setFilterType('todos'); setFilterStatus('todos'); setQuery(''); setPage(1); }

  return <section className="financial-page" aria-labelledby="financial-title">
    <header className="financial-hero mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h1 id="financial-title" className="h4 fw-bold mb-0">Ingresos y gastos</h1>
        <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={fetchBackend} disabled={loadingBackend}>
          <RefreshCw size={15} /> {loadingBackend ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </header>

    {backendHistorico && (
      <section className="card p-3 mb-4 border-primary border-opacity-25 bg-primary-subtle bg-opacity-10" aria-label="Resumen de tu dinero">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <strong className="small text-primary d-inline-flex align-items-center gap-1">
            <Cloud size={16} /> Resumen general ({backendHistorico.cantidadTransacciones} movimientos)
          </strong>
          <Link to="/flujo-caja" className="small fw-semibold">Ver proyecciones</Link>
        </div>
        <div className="row g-2">
          <div className="col-sm-4"><div className="p-2 bg-white rounded-3 border"><span className="small text-muted d-block">Total recibido</span><strong className="text-success">{formatCurrency(Number(backendHistorico.totalIngresos || 0))}</strong></div></div>
          <div className="col-sm-4"><div className="p-2 bg-white rounded-3 border"><span className="small text-muted d-block">Total gastado</span><strong className="text-danger">{formatCurrency(Number(backendHistorico.totalEgresos || 0))}</strong></div></div>
          <div className="col-sm-4"><div className="p-2 bg-white rounded-3 border"><span className="small text-muted d-block">Disponible hoy</span><strong className={Number(backendHistorico.saldoNetoHistorico || 0) < 0 ? 'text-danger' : 'text-primary'}>{formatCurrency(Number(backendHistorico.saldoNetoHistorico || 0))}</strong></div></div>
        </div>
      </section>
    )}

    {message && <div role={messageType === 'danger' ? 'alert' : 'status'} className={`alert alert-${messageType}`}>{message}</div>}
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="opening-title"><h2 id="opening-title" className="h5 fw-bold mb-3"><Wallet size={20} aria-hidden="true" /> 1. Dinero inicial</h2><form onSubmit={saveOpening} className="row g-3 align-items-end">
      <div className="col-md-4"><label htmlFor="financial-start" className="form-label">Fecha de inicio *</label><input id="financial-start" type="date" className="form-control" required max={today} value={openingDate} onChange={e => setOpeningDate(e.target.value)} disabled={blocked} /></div>
      <div className="col-md-4"><label htmlFor="financial-opening" className="form-label">Dinero inicial (S/) *</label><input id="financial-opening" type="number" step="0.01" min="-1000000000" max="1000000000" className="form-control" required value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} disabled={blocked} placeholder="Ej. 1500.00" /></div>
      <div className="col-md-4"><button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={blocked}><Save size={16} aria-hidden="true" />{ledger ? 'Guardar cambio' : 'Guardar'}</button></div>
    </form></section>
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="register-financial"><h2 id="register-financial" className="h5 fw-bold mb-3">2. Anotar ingreso o gasto</h2>
      <form onSubmit={addMovement}><fieldset disabled={!ledger || blocked}>
        <div className="btn-group mb-3" role="group" aria-label="Tipo de movimiento">{(['ingreso', 'egreso'] as const).map(option => <button key={option} type="button" className={`btn btn-${type === option ? '' : 'outline-'}${option === 'ingreso' ? 'success' : 'danger'}`} aria-pressed={type === option} onClick={() => { setType(option); setCategory(movementCategories[option][0]); }}>{option === 'ingreso' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />} {option === 'ingreso' ? 'Dinero que recibí (Ingreso)' : 'Dinero que pagué (Gasto)'}</button>)}</div>
        <div className="row g-3">
          <div className="col-md-4"><label htmlFor="financial-date" className="form-label">¿Qué día fue? *</label><input id="financial-date" className="form-control" type="date" min={ledger?.openingDate} max={today} required value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="col-md-4"><label htmlFor="financial-amount" className="form-label">Monto en soles (S/) *</label><input id="financial-amount" className="form-control" type="number" step="0.01" min="0.01" max="1000000000" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej. 250.00" /></div>
          <div className="col-md-4"><label htmlFor="financial-category" className="form-label">¿De qué tipo es? *</label><select id="financial-category" className="form-select" value={category} onChange={e => setCategory(e.target.value)}>{movementCategories[type].map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="col-md-8"><label htmlFor="financial-concept" className="form-label">Descripción breve *</label><input id="financial-concept" className="form-control" required maxLength={180} value={concept} onChange={e => setConcept(e.target.value)} placeholder={type === 'ingreso' ? 'Ej. Venta del día o cobro a cliente' : 'Ej. Pago de alquiler o compra de mercadería'} /></div>
          <div className="col-md-4"><label htmlFor="financial-method" className="form-label">¿Cómo se pagó? *</label><select id="financial-method" className="form-select" value={method} onChange={e => setMethod(e.target.value)}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="col-md-6"><label htmlFor="financial-contact" className="form-label">Nombre del cliente o proveedor (opcional)</label><input id="financial-contact" className="form-control" maxLength={150} value={contact} onChange={e => setContact(e.target.value)} placeholder="Opcional" /></div>
          <div className="col-md-6"><label htmlFor="financial-reference" className="form-label">Nº de boleta, factura u operación (opcional)</label><input id="financial-reference" className="form-control" maxLength={80} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej. B001-123 o número de Yape" /></div>
        </div><button type="submit" className="btn btn-primary mt-3">Guardar {type === 'ingreso' ? 'ingreso' : 'gasto'}</button>
      </fieldset></form>{!ledger && <p className="small text-muted mt-2 mb-0">Guarda primero tu dinero inicial en el paso 1.</p>}
    </section>

    <section className="card p-3 p-md-4" aria-labelledby="financial-history"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h2 id="financial-history" className="h5 fw-bold mb-0"><ListFilter size={20} aria-hidden="true" /> 3. Historial de dinero recibido y gastado</h2><Link to="/importacion-financiera" className="btn btn-sm btn-outline-primary">Cargar desde Excel (CSV)</Link></div>
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-from" className="form-label">Desde</label><input id="financial-from" type="date" className="form-control" min={ledger?.openingDate} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-to" className="form-label">Hasta</label><input id="financial-to" type="date" className="form-control" min={from || ledger?.openingDate} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-filter-type" className="form-label">Ver</label><select id="financial-filter-type" className="form-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}><option value="todos">Todos</option><option value="ingreso">Solo dinero recibido</option><option value="egreso">Solo gastos</option></select></div>
        <div className="col-sm-6 col-xl-2"><label htmlFor="financial-filter-status" className="form-label">Estado</label><select id="financial-filter-status" className="form-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}><option value="todos">Todos</option><option value="activo">Válidos</option><option value="anulado">Anulados</option></select></div>
        <div className="col-xl-4"><label htmlFor="financial-query" className="form-label">Buscar palabra</label><input id="financial-query" className="form-control" maxLength={180} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Busca por descripción, cliente o proveedor" /></div>
      </div><button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={resetFilters}>Ver todos sin filtros</button>
      {dateError && <div role="alert" className="alert alert-warning">Revisa que la fecha «Desde» sea anterior o igual a «Hasta».</div>}
      {summary && <><div className="row g-3 mb-3">{[
        ['Dinero al empezar estas fechas', summary.openingCents], ['Total recibido', summary.incomeCents], ['Total gastado', summary.expenseCents], ['Dinero disponible al final', summary.closingCents],
      ].map(([label, value]) => <div className="col-sm-6 col-xl-3" key={label}><div className="financial-kpi p-3 h-100"><div className="small text-muted">{label}</div><strong className={`h5 d-block mt-2 mb-0${Number(value) < 0 ? ' text-danger' : ''}`}>{currency(Number(value))}</strong></div></div>)}</div></>}
      <div className="table-responsive"><table className="table align-middle financial-table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Tipo y medio de pago</th><th>Comprobante</th><th className="text-end">Recibiste</th><th className="text-end">Gastaste</th><th className="text-end">Dinero que quedó</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
        {rows.slice((currentPage - 1) * 10, currentPage * 10).map(item => <tr key={item.id} className={item.status === 'anulado' ? 'financial-cancelled' : ''}><td className="text-nowrap">{showDate(item.date)}</td><td className="financial-concept"><strong>{item.concept}</strong>{item.contact && <span className="small text-muted d-block">{item.contact}</span>}</td><td>{item.category}<span className="small text-muted d-block">{item.method}</span></td><td className="financial-reference">{item.reference || '—'}</td><td className="text-end text-nowrap">{item.type === 'ingreso' ? currency(item.amountCents) : '—'}</td><td className="text-end text-nowrap">{item.type === 'egreso' ? currency(item.amountCents) : '—'}</td><td className="text-end fw-semibold text-nowrap">{currency(item.balanceCents)}</td><td><span className={`badge bg-${item.status === 'activo' ? 'success' : 'secondary'}-subtle text-${item.status === 'activo' ? 'success' : 'secondary'}`}>{item.status === 'activo' ? 'Activo' : 'Anulado'}</span></td><td>
          {pendingCancel === item.id ? <div className="financial-cancel-actions"><span className="small d-block mb-1">¿Anular este movimiento?</span><button type="button" className="btn btn-sm btn-danger me-1" onClick={() => toggleStatus(item.id)}>Anular</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPendingCancel(null)}>Cancelar</button></div> : <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={() => item.status === 'activo' ? setPendingCancel(item.id) : toggleStatus(item.id)} aria-label={`${item.status === 'activo' ? 'Anular' : 'Restaurar'} ${item.concept}`}>{item.status === 'activo' ? <Ban size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />} {item.status === 'activo' ? 'Anular' : 'Restaurar'}</button>}
        </td></tr>)}
        {rows.length === 0 && <tr><td colSpan={9} className="text-center text-muted py-4">{!ledger ? 'Configura el saldo inicial y registra tu primer ingreso o egreso.' : ledger.movements.length === 0 ? 'Todavía no hay movimientos financieros registrados.' : 'No hay movimientos que coincidan con estos filtros.'}</td></tr>}
      </tbody></table></div>
      {pages > 1 && <nav className="d-flex gap-2 align-items-center justify-content-end" aria-label="Páginas del histórico"><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span className="small">Página {currentPage} de {pages}</span><button type="button" className="btn btn-sm btn-outline-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}
    </section>
  </section>;
}
