import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, BellRing } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loadFinancialLedger } from '../services/financialService';
import { FINANCIAL_UPDATED_EVENT, loadCashScenario } from '../services/cashScenarioService';
import { addDays, dateKey } from '../utils/cashFlow';
import { ledgerSummary, type FinancialLedger } from '../utils/financialLedger';
import { compareCashPeriods } from '../utils/financialDashboard';
import { formatCurrency } from '../utils/formatters';
import './FinancialDashboard.css';

const money = (cents: number) => formatCurrency(cents / 100);
const showDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('es-PE');
function readData(userId: string) {
  const errors: string[] = [];
  let ledger: FinancialLedger | null = null;
  let scenario: ReturnType<typeof loadCashScenario> = null;
  try { ledger = loadFinancialLedger(userId); } catch { errors.push('No se pudo leer el registro local de caja.'); }
  try { scenario = loadCashScenario(userId); } catch { errors.push('No se pudo leer el escenario local de proyección.'); }
  return { ledger, scenario, errors, updatedAt: new Date().toISOString() };
}
export default function FinancialDashboard() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || !String(session.userId).trim()) return <div className="alert alert-warning">Vuelve a iniciar sesión para consultar el panel financiero de tu cuenta.</div>;
  return <FinancialPanel key={String(session.userId)} userId={String(session.userId)} />;
}
function FinancialPanel({ userId }: { userId: string }) {
  const [data, setData] = useState(() => readData(userId));
  const [range, setRange] = useState('month');
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const refresh = useCallback(() => setData(readData(userId)), [userId]);
  useEffect(() => {
    window.addEventListener('focus', refresh); window.addEventListener('storage', refresh); window.addEventListener(FINANCIAL_UPDATED_EVENT, refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); window.removeEventListener(FINANCIAL_UPDATED_EVENT, refresh); };
  }, [refresh]);
  const today = dateKey(new Date());
  const { ledger, scenario } = data;
  const desiredFrom = range === 'month' ? `${today.slice(0, 7)}-01` : range === '30' ? addDays(today, -29) : ledger?.openingDate ?? today;
  const from = ledger && desiredFrom < ledger.openingDate ? ledger.openingDate : desiredFrom;
  const actual = ledger && ledger.openingDate <= today ? ledgerSummary(ledger, from, today) : null;
  const comparison = scenario ? compareCashPeriods(ledger, scenario, today, view) : null;
  const maxAmount = Math.max(1, ...(comparison?.projection.periods.flatMap(period => [period.income, period.expense]) ?? []));

  return <section className="financial-dashboard mb-4" aria-labelledby="financial-panel-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3"><div><h2 id="financial-panel-title" className="h4 fw-bold mb-1">Situación financiera</h2><p className="small text-muted mb-0">Caja registrada y planificación de tu negocio · PEN (S/)</p></div><button type="button" className="btn btn-sm btn-outline-primary" onClick={refresh}><RefreshCw size={15} aria-hidden="true" /> Actualizar caja</button></div>
    {data.errors.map(error => <div key={error} className="alert alert-warning" role="alert">{error} Los indicadores correspondientes no están disponibles.</div>)}
    <div className="d-flex flex-wrap align-items-center gap-3 mb-3"><label htmlFor="dashboard-financial-range" className="small fw-semibold">Período registrado</label><select id="dashboard-financial-range" className="form-select form-select-sm fd-range" value={range} onChange={e => setRange(e.target.value)}><option value="month">Mes actual</option><option value="30">Últimos 30 días</option><option value="all">Todo el histórico</option></select>{actual && <span className="small text-muted">{showDate(from)} – {showDate(today)} (hoy puede estar incompleto)</span>}</div>
    {actual ? <>
      <div className="row g-3 mb-3">{[
        { label: 'Saldo de caja registrado', value: actual.closingCents, icon: Wallet, detail: 'Saldo inicial + cobros − pagos hasta hoy' },
        { label: 'Ingresos del período', value: actual.incomeCents, icon: TrendingUp, detail: 'Cobros activos registrados' },
        { label: 'Egresos del período', value: actual.expenseCents, icon: TrendingDown, detail: 'Pagos activos registrados' },
        { label: 'Flujo neto del período', value: actual.incomeCents - actual.expenseCents, icon: Wallet, detail: `Saldo de entrada: ${money(actual.openingCents)}` },
      ].map(item => <div key={item.label} className="col-sm-6 col-xl-3"><div className="card p-3 h-100"><div className="d-flex justify-content-between gap-2"><span className="small text-muted">{item.label}</span><item.icon size={19} className="text-primary" aria-hidden="true" /></div><strong className={`h4 mt-2 mb-1${item.value < 0 ? ' text-danger' : ''}`}>{money(item.value)}</strong><span className="small text-muted">{item.detail}</span></div></div>)}</div>
      <p className="small text-muted">Los saldos dependen de los movimientos registrados; no implican conciliación bancaria ni cobertura completa de días sin registros. Se excluyen anulados.</p>
    </> : <div className="card p-4 mb-3"><h3 className="h6">Configura tu caja para ver los indicadores</h3><p className="small text-muted">Registra el saldo inicial y los cobros/pagos realizados o importa un CSV.</p><div className="d-flex flex-wrap gap-2"><Link to="/movimientos-financieros" className="btn btn-primary btn-sm">Registrar movimientos</Link><Link to="/importacion-financiera" className="btn btn-outline-primary btn-sm">Importar datos</Link></div></div>}
    {scenario && comparison ? <>
      <div className="card p-3 p-md-4 mb-3"><div className="d-flex flex-wrap justify-content-between gap-2 mb-3"><div><h3 className="h5">Saldo esperado y liquidez</h3><p className="small text-muted mb-0">Escenario manual guardado: {showDate(scenario.start)} – {showDate(addDays(scenario.start, 89))}. Guardado el {new Date(scenario.savedAt).toLocaleString('es-PE')}.</p></div><Link className="btn btn-outline-primary btn-sm align-self-start" to="/flujo-caja">Revisar escenario</Link></div>
        {comparison.expired && <div className="alert alert-warning small">El horizonte del escenario terminó. Estos resultados corresponden a una planificación anterior; actualiza sus fechas y guarda un nuevo escenario.</div>}
        {!comparison.expired && scenario.start < today && <div className="alert alert-info small">Parte del horizonte ya transcurrió. El riesgo y el saldo mínimo corresponden a los 90 días completos; revisa las fechas de las alertas.</div>}
        <div className="row g-3"><div className="col-md-4"><span className="small text-muted d-block">Saldo esperado al cierre del horizonte</span><strong className="h4">{formatCurrency(comparison.projection.closing)}</strong></div><div className="col-md-4"><span className="small text-muted d-block">Saldo mínimo del escenario</span><strong className="h4">{formatCurrency(comparison.projection.minimum)}</strong></div><div className="col-md-4"><span className="small text-muted d-block">Riesgo del escenario</span><strong className={`h4 text-${comparison.projection.risk === 'Alto' ? 'danger' : comparison.projection.risk === 'Medio' ? 'warning' : 'success'}`}>{comparison.projection.risk}</strong><span className="small text-muted d-block">Reserva: {formatCurrency(scenario.reserve)}</span></div></div>
        <p className="small text-muted mt-3 mb-0">Riesgo alto: saldo negativo. Medio: saldo menor a la reserva. Bajo: saldo igual o mayor a la reserva. Evaluación del escenario manual; la conexión al modelo predictivo está pendiente.</p>
      </div>
      <div className="card p-3 p-md-4 mb-3"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h3 className="h5 mb-0">Ingresos, egresos y saldos esperados</h3><div className="btn-group" role="group" aria-label="Agrupación del escenario">{(['weekly', 'monthly'] as const).map(option => <button type="button" key={option} className={`btn btn-sm btn-${view === option ? '' : 'outline-'}primary`} aria-pressed={view === option} onClick={() => setView(option)}>{option === 'weekly' ? 'Semanal' : 'Mensual'}</button>)}</div></div>
        <div className="fd-legend small mb-3"><span><i className="fd-income" /> Ingresos previstos</span><span><i className="fd-expense" /> Egresos previstos</span></div>
        <div className="fd-bars mb-3" role="img" aria-label="Comparación de ingresos y egresos previstos por período; importes exactos en la tabla siguiente">{comparison.projection.periods.map(period => <div className="fd-bar-group" key={period.start}><div className="fd-bar-pair"><div className="fd-bar fd-income" style={{ height: `${period.income / maxAmount * 100}%` }} /><div className="fd-bar fd-expense" style={{ height: `${period.expense / maxAmount * 100}%` }} /></div><span>{period.start.slice(5)}</span></div>)}</div>
        {comparison.openingDifferenceCents !== null && comparison.openingDifferenceCents !== 0 && <div className="alert alert-warning small">El saldo inicial del escenario difiere en {money(comparison.openingDifferenceCents)} del saldo registrado al inicio de su fecha. Las diferencias de saldo también reflejan esta base distinta.</div>}
        <div className="table-responsive"><table className="table align-middle fd-table"><caption>Los importes previstos cubren cada período completo. La comparación usa los mismos días, hasta el menor entre el cierre del período y hoy; las diferencias no se calculan sin histórico que cubra el período.</caption><thead><tr><th>Período</th><th className="text-end">Ingresos previstos</th><th className="text-end">Egresos previstos</th><th className="text-end">Saldo previsto al cierre</th><th>Corte de comparación</th><th className="text-end">Ingresos registrados / esperados al corte</th><th className="text-end">Egresos registrados / esperados al corte</th><th className="text-end">Saldo registrado / esperado al corte</th><th className="text-end">Diferencia de saldo al corte</th></tr></thead><tbody>{comparison.comparisons.map(row => <tr key={row.period.start}><th scope="row">{showDate(row.period.start)} – {showDate(row.period.end)}</th><td className="text-end">{formatCurrency(row.period.income)}</td><td className="text-end">{formatCurrency(row.period.expense)}</td><td className="text-end fw-bold">{formatCurrency(row.period.closing)}</td><td>{row.actual ? showDate(row.cutoff) : row.period.start > today ? 'Período futuro' : 'Sin cobertura histórica'}</td><td className="text-end">{row.actual ? `${money(row.actual.incomeCents)} / ${money(row.expectedToCutoff.incomeCents)}` : '—'}</td><td className="text-end">{row.actual ? `${money(row.actual.expenseCents)} / ${money(row.expectedToCutoff.expenseCents)}` : '—'}</td><td className="text-end">{row.actual ? `${money(row.actual.closingCents)} / ${money(row.expectedToCutoff.closingCents)}` : '—'}</td><td className="text-end">{row.actual ? money(row.actual.closingCents - row.expectedToCutoff.closingCents) : '—'}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card p-3 p-md-4 mb-3"><h3 className="h5"><BellRing size={19} aria-hidden="true" /> Alertas del escenario</h3>{comparison.projection.alerts.length ? <>{comparison.projection.alerts.slice(0, 3).map((alert, index) => <div key={`${alert.date}-${index}`} className={`alert alert-${alert.risk === 'Alto' ? 'danger' : 'warning'} small mb-2`}><strong>{showDate(alert.date)} · Riesgo {alert.risk.toLowerCase()}</strong> · Saldo previsto {formatCurrency(alert.balance)}{alert.date < today ? ' · Fecha ya transcurrida' : ''}</div>)}{comparison.projection.alerts.length > 3 && <p className="small text-muted">Hay {comparison.projection.alerts.length - 3} alertas adicionales en Flujo de caja.</p>}</> : <p className="small text-success mb-2">Sin alertas en el escenario guardado.</p>}<Link to="/flujo-caja" className="small">Consultar todas las alertas y la preparación de datos</Link></div>
    </> : <div className="card p-4 mb-3"><h3 className="h6">Prepara tu planificación financiera</h3><p className="small text-muted">Configura y confirma un escenario en Flujo de caja y pulsa «Guardar escenario para el Dashboard» para consultar aquí los saldos esperados y las alertas.</p><Link to="/flujo-caja" className="btn btn-outline-primary btn-sm align-self-start">Crear escenario</Link></div>}
    <div className="d-flex flex-wrap justify-content-between gap-2 small text-muted"><span>Datos financieros locales de tu cuenta. Actualizados: {new Date(data.updatedAt).toLocaleString('es-PE')}.</span><Link to="/movimientos-financieros">Consultar histórico de caja</Link></div>
  </section>;
}
