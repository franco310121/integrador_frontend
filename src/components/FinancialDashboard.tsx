import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BellRing,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDefaultLedger, loadFinancialLedger, saveFinancialLedger } from '../services/financialService';
import {
  FINANCIAL_UPDATED_EVENT,
  getDefaultScenario,
  loadCashScenario,
  saveCashScenario,
} from '../services/cashScenarioService';
import { getDashboardFinancieroIa, marcarAlertaLeida } from '../services/flujoCajaIaService';
import type { DashboardFinancieroResponse } from '../types/finanzas';
import { addDays, dateKey } from '../utils/cashFlow';
import { ledgerSummary, type FinancialLedger } from '../utils/financialLedger';
import { compareCashPeriods } from '../utils/financialDashboard';
import { formatCurrency } from '../utils/formatters';
import './FinancialDashboard.css';

const money = (cents: number) => formatCurrency(cents / 100);
const showDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

function readData(userId: string) {
  const errors: string[] = [];
  let ledger: FinancialLedger | null = null;
  let scenario: ReturnType<typeof loadCashScenario> = null;
  try {
    ledger = loadFinancialLedger(userId);
    if (!ledger) {
      ledger = getDefaultLedger();
      saveFinancialLedger(userId, ledger, null);
    }
  } catch {
    errors.push('No se pudo leer el registro de tu dinero.');
  }
  try {
    scenario = loadCashScenario(userId);
    if (!scenario) {
      scenario = getDefaultScenario();
      saveCashScenario(userId, scenario, null);
    }
  } catch {
    errors.push('No se pudo leer la estimación de tus próximos movimientos.');
  }
  return { ledger, scenario, errors, updatedAt: new Date().toISOString() };
}

export default function FinancialDashboard() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || !String(session.userId).trim()) {
    return (
      <div className="alert alert-warning">
        Vuelve a iniciar sesión para ver el resumen del dinero de tu negocio.
      </div>
    );
  }
  return <FinancialPanel key={String(session.userId)} userId={String(session.userId)} />;
}

function FinancialPanel({ userId }: { userId: string }) {
  const [data, setData] = useState(() => readData(userId));
  const [range, setRange] = useState('month');
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [apiDashboard, setApiDashboard] = useState<DashboardFinancieroResponse | null>(null);

  const fetchBackendDashboard = useCallback(() => {
    getDashboardFinancieroIa()
      .then(setApiDashboard)
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    setData(readData(userId));
    fetchBackendDashboard();
  }, [userId, fetchBackendDashboard]);

  useEffect(() => {
    fetchBackendDashboard();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener(FINANCIAL_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(FINANCIAL_UPDATED_EVENT, refresh);
    };
  }, [refresh, fetchBackendDashboard]);

  const handleMarkAlertRead = async (id: number) => {
    try {
      await marcarAlertaLeida(id);
      fetchBackendDashboard();
    } catch {
      /* ignore */
    }
  };

  const today = dateKey(new Date());
  const { ledger, scenario } = data;
  const desiredFrom =
    range === 'month'
      ? `${today.slice(0, 7)}-01`
      : range === '30'
      ? addDays(today, -29)
      : ledger?.openingDate ?? today;
  const from = ledger && desiredFrom < ledger.openingDate ? ledger.openingDate : desiredFrom;
  const actual = ledger && ledger.openingDate <= today ? ledgerSummary(ledger, from, today) : null;
  const comparison = scenario ? compareCashPeriods(ledger, scenario, today, view) : null;

  // Preferimos los saldos del servidor si están disponibles, o usamos el registro local
  const dineroDisponibleHoy = apiDashboard
    ? Number(apiDashboard.saldoActualCaja || 0)
    : actual
    ? actual.closingCents / 100
    : 0;
  const dineroRecibidoMes = apiDashboard
    ? Number(apiDashboard.totalIngresosMes || 0)
    : actual
    ? actual.incomeCents / 100
    : 0;
  const gastosPagadosMes = apiDashboard
    ? Number(apiDashboard.totalEgresosMes || 0)
    : actual
    ? actual.expenseCents / 100
    : 0;

  // Próximo período (primera semana o primer mes proyectado)
  const periods = comparison?.projection.periods ?? [];
  const nextPeriod = periods.find(p => p.end >= today) ?? periods[0] ?? null;
  const totalExpectedIncome = periods.reduce((acc, p) => acc + p.income, 0);
  const totalExpectedExpense = periods.reduce((acc, p) => acc + p.expense, 0);

  const maxBarAmount = Math.max(
    1,
    ...periods.flatMap(period => [period.income, period.expense])
  );

  // Datos para el gráfico de líneas sencillo (evolución del dinero disponible)
  const closingValues = periods.map(p => p.closing);
  const reserveValue = scenario?.reserve ?? 0;
  const minLineVal = Math.min(0, reserveValue, ...closingValues);
  const maxLineVal = Math.max(1000, reserveValue, ...closingValues);
  const lineSpan = Math.max(1, maxLineVal - minLineVal);

  const linePoints = periods
    .map((p, idx) => {
      const x = periods.length === 1 ? 300 : 40 + (idx / (periods.length - 1)) * 520;
      const y = 135 - ((p.closing - minLineVal) / lineSpan) * 105;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const reserveY = 135 - ((reserveValue - minLineVal) / lineSpan) * 105;

  const riskLevel = comparison?.projection.risk ?? 'Bajo';
  const riskBadgeClass =
    riskLevel === 'Alto' ? 'danger' : riskLevel === 'Medio' ? 'warning' : 'success';
  const riskHumanText =
    riskLevel === 'Alto'
      ? 'Alto'
      : riskLevel === 'Medio'
      ? 'Moderado'
      : 'Bajo';

  return (
    <section className="financial-dashboard mb-4" aria-labelledby="financial-panel-title">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h2 id="financial-panel-title" className="h4 fw-bold mb-0">
          Situación de tu negocio
        </h2>
        <div className="d-flex align-items-center gap-2">
          <select
            id="dashboard-financial-range"
            aria-label="Período de consulta"
            className="form-select form-select-sm fd-range"
            value={range}
            onChange={e => setRange(e.target.value)}
          >
            <option value="month">Este mes</option>
            <option value="30">Últimos 30 días</option>
            <option value="all">Todo el historial</option>
          </select>
          <button type="button" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" onClick={refresh}>
            <RefreshCw size={15} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </div>

      {data.errors.map(error => (
        <div key={error} className="alert alert-warning" role="alert">
          {error}
        </div>
      ))}

      {/* 1. SITUACIÓN ACTUAL */}
      <div className="card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fd-step-badge">1</span>
            <h3 className="h5 fw-bold mb-0">Tu dinero hoy</h3>
          </div>
          <Link to="/movimientos-financieros" className="btn btn-sm btn-outline-primary">
            Anotar ingreso o gasto
          </Link>
        </div>

        <div className="row g-3">
          <div className="col-md-4">
            <div className="fd-main-card fd-main-card--highlight">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-muted">Dinero disponible hoy</span>
                <Wallet size={20} className="text-primary" aria-hidden="true" />
              </div>
              <strong className={`h3 d-block mb-0 mt-1 ${dineroDisponibleHoy < 0 ? 'text-danger' : 'text-primary'}`}>
                {formatCurrency(dineroDisponibleHoy)}
              </strong>
            </div>
          </div>

          <div className="col-md-4">
            <div className="fd-main-card">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-muted">Dinero recibido</span>
                <TrendingUp size={20} className="text-success" aria-hidden="true" />
              </div>
              <strong className="h3 d-block mb-0 mt-1 text-success">
                {formatCurrency(dineroRecibidoMes)}
              </strong>
            </div>
          </div>

          <div className="col-md-4">
            <div className="fd-main-card">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-muted">Gastos pagados</span>
                <TrendingDown size={20} className="text-danger" aria-hidden="true" />
              </div>
              <strong className="h3 d-block mb-0 mt-1 text-danger">
                {formatCurrency(gastosPagadosMes)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRÓXIMOS MOVIMIENTOS */}
      {scenario && comparison && (
        <div className="card p-3 p-md-4 mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fd-step-badge">2</span>
              <h3 className="h5 fw-bold mb-0">
                Próximos cobros y pagos
              </h3>
            </div>
            <Link className="btn btn-outline-primary btn-sm" to="/flujo-caja">
              Editar cobros y pagos
            </Link>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <span className="small text-muted d-block">Dinero que esperas recibir</span>
                <strong className="h4 text-success d-block mb-0 mt-1">
                  {formatCurrency(nextPeriod ? nextPeriod.income : totalExpectedIncome)}
                </strong>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <span className="small text-muted d-block">Gastos que tendrás</span>
                <strong className="h4 text-danger d-block mb-0 mt-1">
                  {formatCurrency(nextPeriod ? nextPeriod.expense : totalExpectedExpense)}
                </strong>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 rounded-3 border bg-light h-100">
                <span className="small text-muted d-block">Riesgo de quedarte sin dinero</span>
                <span className={`badge bg-${riskBadgeClass}-subtle text-${riskBadgeClass} mt-1 px-2 py-1`}>
                  {riskHumanText}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROYECCIÓN */}
      {scenario && comparison && (
        <div className="card p-3 p-md-4 mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fd-step-badge">3</span>
              <h3 className="h5 fw-bold mb-0">
                Evolución de tu dinero
              </h3>
            </div>
            <div className="btn-group" role="group" aria-label="Ver por semanas o meses">
              {(['weekly', 'monthly'] as const).map(option => (
                <button
                  type="button"
                  key={option}
                  className={`btn btn-sm btn-${view === option ? '' : 'outline-'}primary`}
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option === 'weekly' ? 'Por semanas' : 'Por meses'}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-4 mb-3">
            {/* Gráfico 1: Línea sencilla de evolución del dinero disponible */}
            <div className="col-lg-6">
              <div className="p-3 border rounded-3 h-100 bg-white">
                <h4 className="h6 fw-bold mb-2">Dinero disponible en el tiempo</h4>
                {periods.length > 0 && (
                  <div className="fd-line-chart-wrap">
                    <svg viewBox="0 0 600 165" className="fd-line-svg" role="img" aria-label="Evolución del dinero disponible">
                      {/* Línea de reserva mínima */}
                      <line
                        x1="35"
                        y1={reserveY}
                        x2="565"
                        y2={reserveY}
                        stroke="#e09f3e"
                        strokeWidth="1.5"
                        strokeDasharray="5,5"
                      />
                      <text x="40" y={Math.max(14, reserveY - 5)} fill="#b07418" fontSize="10">
                        Colchón: {formatCurrency(reserveValue)}
                      </text>
                      {/* Línea de dinero disponible */}
                      <polyline
                        fill="none"
                        stroke="#27187e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={linePoints}
                      />
                      {periods.map((p, idx) => {
                        const x = periods.length === 1 ? 300 : 40 + (idx / (periods.length - 1)) * 520;
                        const y = 135 - ((p.closing - minLineVal) / lineSpan) * 105;
                        return (
                          <g key={p.start}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4.5"
                              fill={p.closing < 0 ? '#dc3545' : p.closing < reserveValue ? '#f0b429' : '#27187e'}
                            />
                            <text x={x} y="156" textAnchor="middle" fill="#5c607d" fontSize="10">
                              {p.start.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico 2: Barras sencillas para comparar dinero que recibes vs gastos */}
            <div className="col-lg-6">
              <div className="p-3 border rounded-3 h-100 bg-white">
                <h4 className="h6 fw-bold mb-1">Ingresos vs. gastos</h4>
                <div className="fd-legend mb-2">
                  <span>
                    <i className="fd-income" /> Recibes
                  </span>
                  <span>
                    <i className="fd-expense" /> Gastas
                  </span>
                </div>
                <div
                  className="fd-bars"
                  role="img"
                  aria-label="Comparación de dinero a recibir y gastos por período"
                >
                  {periods.map(period => (
                    <div className="fd-bar-group" key={period.start}>
                      <div className="fd-bar-pair">
                        <div
                          className="fd-bar fd-income"
                          title={`Recibes: ${formatCurrency(period.income)}`}
                          style={{ height: `${(period.income / maxBarAmount) * 100}%` }}
                        />
                        <div
                          className="fd-bar fd-expense"
                          title={`Gastas: ${formatCurrency(period.expense)}`}
                          style={{ height: `${(period.expense / maxBarAmount) * 100}%` }}
                        />
                      </div>
                      <span>{period.start.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla resumida fácil de entender (solo 4 columnas clave) */}
          <div className="table-responsive">
            <table className="table align-middle fd-table mb-0">
              <thead className="table-light">
                <tr>
                  <th>Fechas</th>
                  <th className="text-end">Recibes</th>
                  <th className="text-end">Gastas</th>
                  <th className="text-end">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {comparison.comparisons.slice(0, 6).map(row => (
                  <tr key={row.period.start}>
                    <th scope="row" className="fw-medium">
                      {showDate(row.period.start)} – {showDate(row.period.end)}
                    </th>
                    <td className="text-end text-success fw-medium">
                      +{formatCurrency(row.period.income)}
                    </td>
                    <td className="text-end text-danger fw-medium">
                      -{formatCurrency(row.period.expense)}
                    </td>
                    <td className={`text-end fw-bold ${row.period.closing < 0 ? 'text-danger' : 'text-primary'}`}>
                      {formatCurrency(row.period.closing)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ALERTAS Y RECOMENDACIONES */}
      <div className="card p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fd-step-badge">4</span>
            <h3 className="h5 fw-bold mb-0">
              <BellRing size={18} className="me-1 text-warning" aria-hidden="true" />
              Avisos importantes
            </h3>
          </div>
          <Link to="/flujo-caja" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1">
            <span>Ir al simulador</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Alertas del servidor (si existen) */}
        {apiDashboard?.alertasLiquidezActivas && apiDashboard.alertasLiquidezActivas.length > 0 && (
          <div className="d-flex flex-column gap-2 mb-2">
            {apiDashboard.alertasLiquidezActivas.slice(0, 2).map(a => (
              <div
                key={a.id}
                className={`alert alert-${
                  a.nivelRiesgo === 'critico' ? 'danger' : a.nivelRiesgo === 'medio' ? 'warning' : 'success'
                } py-2 px-3 small mb-0 d-flex flex-wrap justify-content-between align-items-center gap-2`}
              >
                <span>{a.mensajeAlerta}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleMarkAlertRead(a.id)}
                >
                  Entendido
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Alertas de la planificación de próximos pagos */}
        {comparison && comparison.projection.alerts.length > 0 ? (
          <div className="d-flex flex-column gap-2">
            {comparison.projection.alerts.slice(0, 3).map((alert, index) => (
              <div
                key={`${alert.date}-${index}`}
                className={`alert alert-${alert.risk === 'Alto' ? 'danger' : 'warning'} py-2 px-3 small mb-0`}
              >
                <strong>{showDate(alert.date)}:</strong>{' '}
                {alert.risk === 'Alto'
                  ? `Faltaría efectivo (${formatCurrency(alert.balance)}).`
                  : `Tu dinero disponible (${formatCurrency(alert.balance)}) baja de tu colchón.`}
              </div>
            ))}
          </div>
        ) : (
          (!apiDashboard?.alertasLiquidezActivas || apiDashboard.alertasLiquidezActivas.length === 0) && (
            <div className="alert alert-success py-2 px-3 small mb-0 d-flex align-items-center gap-2">
              <CheckCircle2 size={18} />
              <span>Tienes suficiente dinero para cubrir tus próximos pagos.</span>
            </div>
          )
        )}
      </div>
    </section>
  );
}
