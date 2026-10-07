import { useState, type FormEvent } from 'react';
import { Activity, BellRing, CalendarDays, Trash2, Wallet } from 'lucide-react';
import { addDays, dateKey, projectCashFlow, riskFor, type PlannedMovement, type Risk } from '../utils/cashFlow';
import { formatCurrency } from '../utils/formatters';
import './FlujoCaja.css';
import ModelDataPanel from '../components/ModelDataPanel';
import { useAuth } from '../hooks/useAuth';
import { loadCashScenario, saveCashScenario, type CashScenario } from '../services/cashScenarioService';
import { moneyToCents, validDate } from '../utils/financialLedger';

const tone = (risk: Risk) => risk === 'Alto' ? 'danger' : risk === 'Medio' ? 'warning' : 'success';
const showDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('es-PE');

export default function FlujoCaja() {
  const { session } = useAuth();
  const userId = session?.userId === undefined || session?.userId === null ? '' : String(session.userId);
  return <CashFlowForm key={userId} userId={userId} />;
}

function CashFlowForm({ userId }: { userId: string }) {
  const [initial] = useState(() => {
    try { return { scenario: userId ? loadCashScenario(userId) : null, error: '' }; }
    catch { return { scenario: null, error: 'No se pudo leer el escenario guardado. Revisa el almacenamiento y recarga antes de guardar.' }; }
  });
  const [saved, setSaved] = useState<CashScenario | null>(initial.scenario);
  const [saveMessage, setSaveMessage] = useState(initial.error);
  const [start, setStart] = useState(initial.scenario?.start ?? dateKey(new Date()));
  const end = addDays(start, 89);
  const [opening, setOpening] = useState(initial.scenario ? String(initial.scenario.opening) : '');
  const [reserve, setReserve] = useState(initial.scenario ? String(initial.scenario.reserve) : '');
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [movements, setMovements] = useState<PlannedMovement[]>(initial.scenario?.movements ?? []);
  const [date, setDate] = useState(start);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(Boolean(initial.scenario));
  const [error, setError] = useState('');
  const valid = validDate(start) && moneyToCents(opening, true) !== null && moneyToCents(reserve) !== null && movements.every(item => item.date >= start && item.date <= end);
  const ready = valid && confirmed;
  const result = ready ? projectCashFlow(start, Number(opening), Number(reserve), movements, view) : null;
  const changeOpening = (value: string) => { setOpening(value); setConfirmed(false); };
  const changeReserve = (value: string) => { setReserve(value); setConfirmed(false); };

  function saveScenario() {
    if (!ready || !userId || initial.error) return;
    try {
      const next: CashScenario = { start, opening: Number(opening), reserve: Number(reserve), movements, savedAt: new Date().toISOString() };
      saveCashScenario(userId, next, saved); setSaved(next);
      setSaveMessage('Escenario guardado en este navegador. El Dashboard mostrará estos resultados.');
    } catch (error) { setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar el escenario.'); }
  }

  function addMovement(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0.01 || Number(amount) > 1e9 || !date || date < start || date > end) {
      setError('Completa el concepto, una fecha dentro del horizonte y un importe entre S/ 0.01 y S/ 1,000,000,000.');
      return;
    }
    setMovements(items => [...items, { id: crypto.randomUUID(), date, description: description.trim(), type, amount: Math.round(Number(amount) * 100) / 100 }]);
    setDescription(''); setAmount(''); setError(''); setConfirmed(false);
  }

  return (
    <section className="cash-flow" aria-labelledby="cash-title">
      <header className="cash-hero mb-4">
        <div className="small fw-semibold mb-2">FINVORA / PLANIFICACIÓN FINANCIERA</div>
        <h1 id="cash-title" className="h3 fw-bold">Flujo de caja y liquidez</h1>
        <p className="mb-2">Anticipa tus cobros, pagos y saldo disponible en una sola página.</p>
        <span className="badge bg-white text-primary">Simulación manual · 90 días · PEN (S/)</span>
      </header>

      <div className="alert alert-info small">
        Esta proyección usa únicamente los movimientos previstos que ingreses aquí. No está conectada a un modelo predictivo ni al saldo bancario.
        Guarda el escenario confirmado para consultarlo en el Dashboard y recuperarlo al volver. Los cambios sin guardar se pierden al salir o recargar.
      </div>

      <ModelDataPanel />

      <section className="card p-3 p-md-4 mb-4" aria-labelledby="scenario-title">
        <h2 id="scenario-title" className="h5"><Wallet size={20} aria-hidden="true" /> Configura tu escenario</h2>
        <p className="text-muted small">Del {showDate(start)} al {showDate(end)}. El saldo inicial corresponde al inicio del primer día, antes de los movimientos previstos.</p>
        <div className="row g-3">
          <div className="col-md-4"><label htmlFor="cash-scenario-start" className="form-label">Fecha inicial del escenario</label><input id="cash-scenario-start" type="date" className="form-control" value={start} onChange={e => { setStart(e.target.value); setConfirmed(false); }} /></div>
          <div className="col-md-4"><label htmlFor="cash-opening" className="form-label">Saldo inicial disponible (S/)</label><input id="cash-opening" type="number" step="0.01" min="-1000000000" max="1000000000" className="form-control" value={opening} onChange={e => changeOpening(e.target.value)} placeholder="Ingresa tu saldo real" /></div>
          <div className="col-md-4"><label htmlFor="cash-reserve" className="form-label">Reserva mínima deseada (S/)</label><input id="cash-reserve" type="number" step="0.01" min="0" max="1000000000" className="form-control" value={reserve} onChange={e => changeReserve(e.target.value)} placeholder="Define tu umbral de alerta" /></div>
        </div>
        {!valid && <p className="small text-muted mt-2 mb-0">Completa la fecha y los importes con hasta dos decimales. La reserva debe ser cero o mayor y todos los movimientos deben estar dentro del horizonte. Máximo por campo: S/ 1,000,000,000.</p>}
        <hr />
        <h3 className="h6">Cobros y pagos previstos</h3>
        <form onSubmit={addMovement} className="row g-2 align-items-end">
          <div className="col-sm-6 col-xl-2"><label htmlFor="cash-date" className="form-label small">Fecha</label><input id="cash-date" type="date" className="form-control" min={start} max={end} required value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="col-sm-6 col-xl-2"><label htmlFor="cash-type" className="form-label small">Movimiento</label><select id="cash-type" className="form-select" value={type} onChange={e => setType(e.target.value as 'income' | 'expense')}><option value="income">Ingreso / cobro</option><option value="expense">Egreso / pago</option></select></div>
          <div className="col-sm-6 col-xl-4"><label htmlFor="cash-description" className="form-label small">Concepto</label><input id="cash-description" className="form-control" maxLength={100} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Cobro de factura o alquiler" /></div>
          <div className="col-sm-6 col-xl-2"><label htmlFor="cash-amount" className="form-label small">Importe (S/)</label><input id="cash-amount" type="number" min="0.01" max="1000000000" step="0.01" required className="form-control" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="col-xl-2"><button className="btn btn-primary w-100" type="submit">Agregar</button></div>
        </form>
        {error && <p role="alert" className="text-danger mt-2">{error}</p>}
        {movements.length === 0 ? <p className="small text-muted mt-3">Aún no hay movimientos previstos. Agrega los cobros y pagos del horizonte.</p> : (
          <div className="table-responsive mt-3"><table className="table align-middle"><caption>Movimientos incluidos en la simulación</caption><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th className="text-end">Importe</th><th>Acción</th></tr></thead><tbody>
            {[...movements].sort((a, b) => a.date.localeCompare(b.date)).map(item => <tr key={item.id}><td>{showDate(item.date)}</td><td className="cash-concept">{item.description}</td><td>{item.type === 'income' ? 'Ingreso' : 'Egreso'}</td><td className="text-end text-nowrap">{formatCurrency(item.amount)}</td><td><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Eliminar ${item.description}`} onClick={() => { setMovements(items => items.filter(m => m.id !== item.id)); setConfirmed(false); }}><Trash2 size={16} /></button></td></tr>)}
          </tbody></table></div>
        )}
        <div className="form-check mt-3"><input id="cash-confirm" type="checkbox" className="form-check-input" disabled={!valid} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><label className="form-check-label small" htmlFor="cash-confirm">He revisado el saldo y los movimientos previstos para estos 90 días{movements.length === 0 ? '; deseo simular sin cobros ni pagos' : ''}.</label></div>
        <div className="mt-3"><button type="button" className="btn btn-primary" disabled={!ready || !userId || Boolean(initial.error)} onClick={saveScenario}>Guardar escenario para el Dashboard</button>{saved && <p className="small text-muted mt-2 mb-0">Último guardado: {new Date(saved.savedAt).toLocaleString('es-PE')}. El Dashboard usa el escenario guardado.</p>}</div>
        {saveMessage && <div className="alert alert-info small mt-3 mb-0" role="status">{saveMessage}</div>}
      </section>

      {!result ? <div className="card p-4 text-center"><Activity className="mx-auto mb-2 text-primary" aria-hidden="true" /><h2 className="h5">Tu proyección aparecerá aquí</h2><p className="text-muted mb-0">Completa y confirma el escenario para calcular los saldos y evaluar la liquidez.</p></div> : <>
        <div className="row g-3 mb-4" aria-live="polite">
          {[
            { label: 'Saldo al final de 90 días', value: formatCurrency(result.closing) },
            { label: 'Saldo mínimo del horizonte', value: formatCurrency(result.minimum) },
            { label: 'Riesgo de liquidez del escenario', value: result.risk },
          ].map(item => <div className="col-md-4" key={item.label}><div className="card p-3 h-100"><span className="small text-muted">{item.label}</span><strong className="h4 mt-2 mb-0">{item.value}</strong></div></div>)}
        </div>
        <section className="card p-3 p-md-4 mb-4" aria-labelledby="projection-title">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"><h2 id="projection-title" className="h5 mb-0"><CalendarDays size={20} aria-hidden="true" /> Proyección {view === 'weekly' ? 'semanal' : 'mensual'}</h2><div className="btn-group" role="group" aria-label="Agrupación de la proyección"><button type="button" className={`btn btn-${view === 'weekly' ? '' : 'outline-'}primary`} aria-pressed={view === 'weekly'} onClick={() => setView('weekly')}>Semanal</button><button type="button" className={`btn btn-${view === 'monthly' ? '' : 'outline-'}primary`} aria-pressed={view === 'monthly'} onClick={() => setView('monthly')}>Mensual</button></div></div>
          <p className="small text-muted">{view === 'weekly' ? 'Bloques de 7 días desde la fecha inicial; el último puede ser parcial.' : 'Meses calendario; el primero y el último pueden ser parciales.'} Ambas vistas cubren los mismos 90 días. Riesgo calculado con el saldo inicial y los cierres diarios, sin evaluar el orden de cobros y pagos dentro del día.</p>
          <div className="table-responsive"><table className="table align-middle cash-table"><caption>Saldo final = saldo inicial + ingresos − egresos. El riesgo usa el saldo mínimo de cada período.</caption><thead><tr><th>Período</th><th className="text-end">Saldo inicial</th><th className="text-end">Ingresos</th><th className="text-end">Egresos</th><th className="text-end">Saldo final</th><th>Riesgo</th></tr></thead><tbody>{result.periods.map(period => <tr key={period.start}><th scope="row">{showDate(period.start)} – {showDate(period.end)}</th><td className="text-end">{formatCurrency(period.opening)}</td><td className="text-end">{formatCurrency(period.income)}</td><td className="text-end">{formatCurrency(period.expense)}</td><td className="text-end fw-bold">{formatCurrency(period.closing)}</td><td><span className={`badge bg-${tone(riskFor(period.minimum, Number(reserve)))}-subtle text-${tone(riskFor(period.minimum, Number(reserve)))}`}>{riskFor(period.minimum, Number(reserve))}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="card p-3 p-md-4" aria-labelledby="alerts-title">
          <h2 id="alerts-title" className="h5"><BellRing size={20} aria-hidden="true" /> Alertas preventivas de liquidez</h2>
          <p className="small text-muted">Reglas del escenario: alto si el saldo es negativo; medio si es menor a tu reserva de {formatCurrency(Number(reserve))}; bajo si alcanza o supera la reserva. Se muestra una alerta al iniciar o cambiar un nivel de riesgo. Solo se calculan mientras usas esta página.</p>
          {result.alerts.length === 0 ? <div className="alert alert-success mb-0">Sin alertas en el escenario ingresado. El saldo inicial y los cierres diarios cubren la reserva durante los 90 días.</div> : result.alerts.map((alert, i) => <div key={`${alert.date}-${i}`} className={`alert alert-${tone(alert.risk)}`}><strong>{showDate(alert.date)} · Riesgo {alert.risk.toLowerCase()}</strong><p className="mb-1">Saldo previsto: {formatCurrency(alert.balance)}. {alert.risk === 'Alto' ? `Déficit estimado: ${formatCurrency(-alert.balance)}.` : `Faltan ${formatCurrency(Number(reserve) - alert.balance)} para cubrir la reserva.`}</p><span className="small">Revisa los cobros y pagos previstos antes de esta fecha y ajusta el escenario.</span></div>)}
        </section>
      </>}
    </section>
  );
}
