import { useState, useEffect, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Plus,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { addDays, dateKey, projectCashFlow, riskFor, type PlannedMovement, type Risk } from '../utils/cashFlow';
import { formatCurrency } from '../utils/formatters';
import './FlujoCaja.css';
import ModelDataPanel from '../components/ModelDataPanel';
import { useAuth } from '../hooks/useAuth';
import { getDefaultScenario, loadCashScenario, saveCashScenario, type CashScenario } from '../services/cashScenarioService';
import {
  crearSimulacionFinanciera,
  eliminarSimulacionFinanciera,
  generarProyeccionIa,
  getRecomendacionesPreventivas,
  listarSimulacionesFinancieras,
  marcarAlertaLeida,
} from '../services/flujoCajaIaService';
import type {
  ProyeccionFlujoResponse,
  RecomendacionPreventivaResponse,
  SimulacionFinancieraResponse,
} from '../types/finanzas';
import { moneyToCents, validDate } from '../utils/financialLedger';

const tone = (risk: Risk) => (risk === 'Alto' ? 'danger' : risk === 'Medio' ? 'warning' : 'success');
const showDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

function friendlyTipTitle(raw: string): string {
  if (/reabastecer|rotaci/i.test(raw)) return 'Compra mercadería con descuento';
  if (/mantener|pol[ií]tica|control/i.test(raw)) return 'Anota tus ventas y gastos al día';
  if (/cobranza|clientes/i.test(raw)) return 'Adelanta el cobro a tus clientes';
  if (/gasto|costo|proveedor/i.test(raw)) return 'Revisa tus próximos pagos';
  return raw;
}

function buildExplanatoryMovements(startDate: string): PlannedMovement[] {
  return [
    { id: 'scen-1', date: addDays(startDate, 5), description: 'Cobro de ventas a clientes frecuentes', type: 'income', amount: 8500 },
    { id: 'scen-2', date: addDays(startDate, 10), description: 'Pago a proveedor por mercadería', type: 'expense', amount: 12000 },
    { id: 'scen-3', date: addDays(startDate, 15), description: 'Pago de alquiler del local, luz y agua', type: 'expense', amount: 2500 },
    { id: 'scen-4', date: addDays(startDate, 22), description: 'Ventas esperadas de fin de mes en tienda', type: 'income', amount: 4200 },
    { id: 'scen-5', date: addDays(startDate, 28), description: 'Pago al personal de apoyo y sueldos', type: 'expense', amount: 5800 },
    { id: 'scen-6', date: addDays(startDate, 35), description: 'Cobro de pedido especial a empresa', type: 'income', amount: 9800 },
    { id: 'scen-7', date: addDays(startDate, 42), description: 'Compra de reposición de productos más vendidos', type: 'expense', amount: 7500 },
    { id: 'scen-8', date: addDays(startDate, 50), description: 'Ventas esperadas por campaña comercial', type: 'income', amount: 14500 },
    { id: 'scen-9', date: addDays(startDate, 58), description: 'Pago de alquiler mensual y servicios', type: 'expense', amount: 6200 },
    { id: 'scen-10', date: addDays(startDate, 68), description: 'Ventas estimadas del nuevo mes', type: 'income', amount: 8200 },
    { id: 'scen-11', date: addDays(startDate, 78), description: 'Compra de materiales y bolsas para tienda', type: 'expense', amount: 5000 },
    { id: 'scen-12', date: addDays(startDate, 85), description: 'Cobro de clientes con pago a cuenta', type: 'income', amount: 6500 },
  ];
}

export default function FlujoCaja() {
  const { session } = useAuth();
  const userId = session?.userId === undefined || session?.userId === null ? '' : String(session.userId);
  return <CashFlowForm key={userId} userId={userId} />;
}

function CashFlowForm({ userId }: { userId: string }) {
  const [initial] = useState(() => {
    try {
      let current = userId ? loadCashScenario(userId) : null;
      if (!current && userId) {
        current = getDefaultScenario();
        saveCashScenario(userId, current, null);
      }
      return { scenario: current, error: '' };
    } catch {
      return { scenario: null, error: 'No se pudo leer tu planificación guardada.' };
    }
  });
  const [saved, setSaved] = useState<CashScenario | null>(initial.scenario);
  const [saveMessage, setSaveMessage] = useState(initial.error);
  const [start, setStart] = useState(initial.scenario?.start ?? dateKey(new Date()));
  const end = addDays(start, 89);
  const [opening, setOpening] = useState(initial.scenario ? String(initial.scenario.opening) : '15000');
  const [reserve, setReserve] = useState(initial.scenario ? String(initial.scenario.reserve) : '10000');
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [movements, setMovements] = useState<PlannedMovement[]>(
    initial.scenario?.movements && initial.scenario.movements.length >= 5
      ? initial.scenario.movements
      : buildExplanatoryMovements(start)
  );
  const [date, setDate] = useState(start);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [movFilter, setMovFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAllMovs, setShowAllMovs] = useState(false);

  // Backend IA y Simulador interactivo
  const [proyeccionIa, setProyeccionIa] = useState<ProyeccionFlujoResponse | null>(null);
  const [loadingProyIa, setLoadingProyIa] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionPreventivaResponse | null>(null);
  const [simulaciones, setSimulaciones] = useState<SimulacionFinancieraResponse[]>([]);
  const [simNombre, setSimNombre] = useState('Mi prueba de ventas');
  const [simPctIngresos, setSimPctIngresos] = useState('15');
  const [simPctEgresos, setSimPctEgresos] = useState('0');
  const [creatingSim, setCreatingSim] = useState(false);
  const [apiNotice, setApiNotice] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState<1 | 2 | 3>(1);
  const [guideGoal, setGuideGoal] = useState<'campana' | 'ahorro' | 'inversion' | 'prevencion'>('campana');
  const [liveChartView, setLiveChartView] = useState<'bars' | 'curve'>('bars');
  const [showAllSims, setShowAllSims] = useState(false);

  const loadBackendData = async () => {
    try {
      const [recData, simList] = await Promise.all([
        getRecomendacionesPreventivas('todos').catch(() => null),
        listarSimulacionesFinancieras().catch(() => []),
      ]);
      if (recData) setRecomendaciones(recData);
      setSimulaciones(simList);
    } catch {
      /* mantener modo local */
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  const handleGenerarProyeccionIa = async (tipo: 'semanal' | 'mensual') => {
    setLoadingProyIa(true);
    setApiNotice('');
    try {
      const proy = await generarProyeccionIa(tipo);
      setProyeccionIa(proy);
      loadBackendData();
    } catch {
      setApiNotice('No se pudo actualizar el cálculo automático.');
    } finally {
      setLoadingProyIa(false);
    }
  };

  const handleMarcarAlertaLeida = async (alertaId: number) => {
    try {
      await marcarAlertaLeida(alertaId);
      loadBackendData();
    } catch {
      /* ignore */
    }
  };

  const handleCrearSimulacion = async (e: FormEvent) => {
    e.preventDefault();
    const label =
      simNombre.trim() ||
      `Ventas ${Number(simPctIngresos) >= 0 ? '+' : ''}${simPctIngresos}%, Gastos ${
        Number(simPctEgresos) >= 0 ? '+' : ''
      }${simPctEgresos}%`;
    setCreatingSim(true);
    setApiNotice('');
    try {
      const created = await crearSimulacionFinanciera(
        {
          nombreEscenario: label,
          porcentajeAjusteIngresos: Number(simPctIngresos) || 0,
          porcentajeAjusteEgresos: Number(simPctEgresos) || 0,
        },
        { ingresosBase: baseIng, egresosBase: baseEgr }
      );
      setSimulaciones(prev => [created, ...prev]);
      setApiNotice(`¡Listo! Guardamos tu prueba "${created.nombreEscenario}".`);
    } catch {
      setApiNotice('No se pudo guardar la simulación.');
    } finally {
      setCreatingSim(false);
    }
  };

  const handleEliminarSimulacion = async (id: number) => {
    try {
      await eliminarSimulacionFinanciera(id);
      setSimulaciones(prev => prev.filter(s => s.id !== id));
    } catch {
      /* ignore */
    }
  };

  const applyPresetSim = (nombre: string, pctIng: string, pctEgr: string) => {
    setSimNombre(nombre);
    setSimPctIngresos(pctIng);
    setSimPctEgresos(pctEgr);
  };

  const selectGuideGoal = (
    goal: 'campana' | 'ahorro' | 'inversion' | 'prevencion',
    nombre: string,
    pctIng: string,
    pctEgr: string
  ) => {
    setGuideGoal(goal);
    setSimNombre(nombre);
    setSimPctIngresos(pctIng);
    setSimPctEgresos(pctEgr);
    setGuideStep(2);
  };

  const saveGuidedSimulacion = async () => {
    const label =
      simNombre.trim() ||
      `Ventas ${Number(simPctIngresos) >= 0 ? '+' : ''}${simPctIngresos}%, Gastos ${
        Number(simPctEgresos) >= 0 ? '+' : ''
      }${simPctEgresos}%`;
    setCreatingSim(true);
    setApiNotice('');
    try {
      const created = await crearSimulacionFinanciera(
        {
          nombreEscenario: label,
          porcentajeAjusteIngresos: Number(simPctIngresos) || 0,
          porcentajeAjusteEgresos: Number(simPctEgresos) || 0,
        },
        { ingresosBase: baseIng, egresosBase: baseEgr }
      );
      setSimulaciones(prev => [created, ...prev]);
      setApiNotice(`¡Listo! Guardamos tu prueba "${created.nombreEscenario}".`);
    } catch {
      setApiNotice('No se pudo guardar la simulación.');
    } finally {
      setCreatingSim(false);
    }
  };

  const valid =
    validDate(start) &&
    moneyToCents(opening, true) !== null &&
    moneyToCents(reserve) !== null &&
    movements.every(item => item.date >= start && item.date <= end);
  const result = valid ? projectCashFlow(start, Number(opening), Number(reserve), movements, view) : null;

  function loadExplanatoryScenario() {
    const startDate = dateKey(new Date());
    setStart(startDate);
    setOpening('15000');
    setReserve('10000');
    const fullMovements = buildExplanatoryMovements(startDate);
    setMovements(fullMovements);
    setError('');

    if (userId && !initial.error) {
      const next: CashScenario = {
        start: startDate,
        opening: 15000,
        reserve: 10000,
        movements: fullMovements,
        savedAt: new Date().toISOString(),
      };
      try {
        saveCashScenario(userId, next, saved);
        setSaved(next);
        setSaveMessage('Ejemplo cargado y actualizado.');
      } catch {
        setSaveMessage('Ejemplo cargado.');
      }
    }
  }

  function saveScenario() {
    if (!valid || !userId || initial.error) return;
    try {
      const next: CashScenario = {
        start,
        opening: Number(opening),
        reserve: Number(reserve),
        movements,
        savedAt: new Date().toISOString(),
      };
      saveCashScenario(userId, next, saved);
      setSaved(next);
      setSaveMessage('¡Guardado en el Resumen de mi negocio!');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  function addMovement(event: FormEvent) {
    event.preventDefault();
    if (
      !description.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0.01 ||
      Number(amount) > 1e9 ||
      !date ||
      date < start ||
      date > end
    ) {
      setError('Completa la descripción, fecha y monto mayor a S/ 0.01.');
      return;
    }
    setMovements(items => [
      ...items,
      {
        id: crypto.randomUUID(),
        date,
        description: description.trim(),
        type,
        amount: Math.round(Number(amount) * 100) / 100,
      },
    ]);
    setDescription('');
    setAmount('');
    setError('');
  }

  // Cálculos visuales dinámicos
  const dineroCajaHoy = Number(recomendaciones?.saldoActualCaja ?? opening ?? 0);
  const ratioRespaldo = Number(recomendaciones?.ratioCoberturaLiquidez ?? 1.5);
  const riesgoActual = recomendaciones?.nivelRiesgoActual ?? 'bajo';
  const pctIngresosBarra = Math.min(85, Math.max(20, Math.round((ratioRespaldo / (ratioRespaldo + 1)) * 100)));

  // Vista previa en vivo del simulador mientras el usuario mueve los controles deslizantes
  const totalIngPlan = movements.filter(m => m.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalEgrPlan = movements.filter(m => m.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const baseIng = simulaciones[0]?.ingresosBase ? Number(simulaciones[0].ingresosBase) : totalIngPlan || 25000;
  const baseEgr = simulaciones[0]?.egresosBase ? Number(simulaciones[0].egresosBase) : totalEgrPlan || 12000;
  const baseSaldo = baseIng - baseEgr;
  const pctI = Number(simPctIngresos) || 0;
  const pctE = Number(simPctEgresos) || 0;
  const liveIng = baseIng * (1 + pctI / 100);
  const liveEgr = baseEgr * (1 + pctE / 100);
  const liveSaldo = liveIng - liveEgr;
  const liveDiff = liveSaldo - baseSaldo;
  const diffIng = liveIng - baseIng;
  const diffEgr = liveEgr - baseEgr;
  const baseRatio = baseIng / Math.max(1, baseEgr);
  const liveRatio = liveIng / Math.max(1, liveEgr);
  const maxSimBar = Math.max(1, baseIng, liveIng, baseEgr, liveEgr, Math.max(0, baseSaldo), Math.max(0, liveSaldo));

  // Serie en vivo de 4 semanas para el gráfico de curva en vivo del simulador
  const simSteps = [0.25, 0.5, 0.75, 1];
  const baseStepPoints = simSteps.map((f, i) => {
    const val = baseSaldo * f;
    const x = 45 + i * 110;
    const maxCurve = Math.max(1, baseSaldo, liveSaldo, Math.abs(liveSaldo));
    const minCurve = Math.min(0, baseSaldo, liveSaldo);
    const span = Math.max(1, maxCurve - minCurve);
    const y = 110 - ((val - minCurve) / span) * 85;
    return { x, y, val };
  });
  const liveStepPoints = simSteps.map((f, i) => {
    const val = liveSaldo * f;
    const x = 45 + i * 110;
    const maxCurve = Math.max(1, baseSaldo, liveSaldo, Math.abs(liveSaldo));
    const minCurve = Math.min(0, baseSaldo, liveSaldo);
    const span = Math.max(1, maxCurve - minCurve);
    const y = 110 - ((val - minCurve) / span) * 85;
    return { x, y, val };
  });
  const basePolyline = baseStepPoints.map(p => `${p.x},${p.y.toFixed(1)}`).join(' ');
  const livePolyline = liveStepPoints.map(p => `${p.x},${p.y.toFixed(1)}`).join(' ');

  // Filtrado de movimientos planeados
  const sortedMovs = [...movements].sort((a, b) => a.date.localeCompare(b.date));
  const filteredMovs = sortedMovs.filter(m => movFilter === 'all' || m.type === movFilter);
  const visibleMovs = showAllMovs ? filteredMovs : filteredMovs.slice(0, 5);
  const incomeCount = movements.filter(m => m.type === 'income').length;
  const expenseCount = movements.filter(m => m.type === 'expense').length;

  // Gráficos de líneas y barras
  const periods = result?.periods ?? [];
  const maxBarAmount = Math.max(1, ...periods.flatMap(p => [p.income, p.expense]));
  const reserveNum = Number(reserve) || 0;
  const minLineVal = Math.min(0, reserveNum, ...periods.map(p => p.closing));
  const maxLineVal = Math.max(1000, reserveNum, ...periods.map(p => p.closing));
  const lineSpan = Math.max(1, maxLineVal - minLineVal);
  const linePoints = periods
    .map((p, idx) => {
      const x = periods.length === 1 ? 300 : 40 + (idx / (periods.length - 1)) * 520;
      const y = 135 - ((p.closing - minLineVal) / lineSpan) * 105;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const reserveY = 135 - ((reserveNum - minLineVal) / lineSpan) * 105;

  return (
    <section className="cash-flow" aria-labelledby="cash-title">
      {/* Banner compacto e intuitivo */}
      <header className="cash-hero mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h1 id="cash-title" className="h4 fw-bold mb-0">
            Dinero disponible y proyecciones
          </h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light btn-sm fw-semibold d-inline-flex align-items-center gap-2 px-3 py-2"
            disabled={loadingProyIa}
            onClick={() => handleGenerarProyeccionIa('semanal')}
          >
            <Sparkles size={16} className="text-primary" />
            <span>{loadingProyIa ? 'Calculando...' : 'Ver próxima semana'}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-light btn-sm fw-semibold d-inline-flex align-items-center gap-2 px-3 py-2"
            disabled={loadingProyIa}
            onClick={() => handleGenerarProyeccionIa('mensual')}
          >
            <CalendarDays size={16} />
            <span>Ver próximo mes</span>
          </button>
        </div>
      </header>

      {apiNotice && (
        <div className="alert alert-success small py-2 px-3 d-flex align-items-center gap-2" role="status">
          <CheckCircle2 size={16} /> <span>{apiNotice}</span>
        </div>
      )}

      {/* Tarjeta rápida si el usuario pulsó "Ver próxima semana" o "Ver próximo mes" */}
      {proyeccionIa && (
        <section className="card p-3 mb-4 border-primary border-opacity-25 bg-primary-subtle bg-opacity-10">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <span className="badge bg-primary text-white mb-1">
                {proyeccionIa.tipoProyeccion === 'semanal' ? 'PRÓXIMOS 7 DÍAS' : 'PRÓXIMOS 30 DÍAS'}
              </span>
              <h2 className="h5 fw-bold mb-1">
                Tendrás aprox. {formatCurrency(Number(proyeccionIa.saldoFinalEstimado || 0))} disponibles
              </h2>
              <span className="small text-muted">
                Del {proyeccionIa.periodoInicio} al {proyeccionIa.periodoFin}
              </span>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="p-2 bg-white rounded-3 border d-flex align-items-center gap-2">
                <ArrowUpRight size={22} className="text-success flex-shrink-0" />
                <div>
                  <span className="small text-muted d-block">Recibirás</span>
                  <strong className="text-success">
                    +{formatCurrency(Number(proyeccionIa.ingresoProyectado || 0))}
                  </strong>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="p-2 bg-white rounded-3 border d-flex align-items-center gap-2">
                <ArrowDownRight size={22} className="text-danger flex-shrink-0" />
                <div>
                  <span className="small text-muted d-block">Gastarás</span>
                  <strong className="text-danger">
                    -{formatCurrency(Number(proyeccionIa.egresoProyectado || 0))}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 1. SALUD DE TU DINERO (Indicadores visuales con semáforo y barras) */}
      <section className="card p-3 p-md-4 mb-4" aria-labelledby="rec-preventivas-title">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="cf-step-badge">1</span>
            <h2 id="rec-preventivas-title" className="h5 fw-bold mb-0">
              Estado actual de tu dinero y consejos rápidos
            </h2>
          </div>
          <div className="cf-traffic-dots" title="Semáforo de tranquilidad financiera">
            <span className={`cf-dot cf-dot--green ${riesgoActual === 'bajo' ? 'active' : ''}`} />
            <span className={`cf-dot cf-dot--amber ${riesgoActual === 'medio' ? 'active' : ''}`} />
            <span className={`cf-dot cf-dot--red ${riesgoActual === 'critico' ? 'active' : ''}`} />
            <span className="small fw-semibold ms-1">
              {riesgoActual === 'critico'
                ? 'Requiere atención'
                : riesgoActual === 'medio'
                ? 'Con precaución'
                : 'Negocio saludable'}
            </span>
          </div>
        </div>

        <div className="row g-3 mb-3">
          {/* Indicador 1: Dinero disponible hoy */}
          <div className="col-md-4">
            <div className="cf-indicator-card">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Dinero en caja hoy</span>
                <Wallet size={18} className="text-primary" />
              </div>
              <strong className="h3 d-block text-primary my-1">{formatCurrency(dineroCajaHoy)}</strong>
              <div className="cf-meter-track mt-2">
                <div className="cf-meter-fill bg-primary" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Indicador 2: Relación visual Ingresos vs Gastos */}
          <div className="col-md-4">
            <div className="cf-indicator-card">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Por cada S/ 1 que gastas</span>
                <TrendingUp size={18} className="text-success" />
              </div>
              <strong className="h3 d-block text-success my-1">
                Recibes S/ {ratioRespaldo.toFixed(2)}
              </strong>
              <div className="cf-meter-track mt-2" title="Verde: lo que entra · Rojo: lo que sale">
                <div className="cf-meter-fill bg-success" style={{ width: `${pctIngresosBarra}%` }} />
                <div className="cf-meter-fill bg-danger" style={{ width: `${100 - pctIngresosBarra}%` }} />
              </div>
            </div>
          </div>

          {/* Indicador 3: Nivel de seguridad */}
          <div className="col-md-4">
            <div className="cf-indicator-card">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted fw-semibold">Riesgo de quedarte sin dinero</span>
                <ShieldCheck
                  size={18}
                  className={`text-${
                    riesgoActual === 'critico' ? 'danger' : riesgoActual === 'medio' ? 'warning' : 'success'
                  }`}
                />
              </div>
              <strong
                className={`h3 d-block my-1 text-${
                  riesgoActual === 'critico' ? 'danger' : riesgoActual === 'medio' ? 'warning' : 'success'
                }`}
              >
                {riesgoActual === 'critico' ? 'Alto' : riesgoActual === 'medio' ? 'Moderado' : 'Bajo'}
              </strong>
              <div className="cf-meter-track mt-2">
                <div
                  className={`cf-meter-fill bg-${
                    riesgoActual === 'critico' ? 'danger' : riesgoActual === 'medio' ? 'warning' : 'success'
                  }`}
                  style={{ width: riesgoActual === 'critico' ? '90%' : riesgoActual === 'medio' ? '55%' : '25%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consejos breves en pastillas visuales (sin textos largos) */}
        {recomendaciones && recomendaciones.accionesSugeridas.length > 0 && (
          <div className="row g-2">
            {recomendaciones.accionesSugeridas.map((acc, idx) => (
              <div className="col-md-6" key={idx}>
                <div className="p-2 px-3 border rounded-3 bg-white d-flex align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <Lightbulb size={18} className="text-warning flex-shrink-0" />
                    <strong className="small text-dark">{friendlyTipTitle(acc.titulo)}</strong>
                  </div>
                  <span className="badge bg-success-subtle text-success text-nowrap">
                    {acc.prioridad === 'ALTA' ? 'Prioritario' : 'Consejo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {recomendaciones?.alertasActivas && recomendaciones.alertasActivas.filter(a => !a.leido).length > 0 && (
          <div className="mt-2 d-flex flex-column gap-2">
            {recomendaciones.alertasActivas
              .filter(a => !a.leido)
              .slice(0, 2)
              .map(alerta => (
                <div
                  key={alerta.id}
                  className="alert alert-warning mb-0 py-2 px-3 small d-flex justify-content-between align-items-center gap-2"
                >
                  <span>
                    <strong>Aviso:</strong> {alerta.mensajeAlerta}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark py-0 px-2"
                    onClick={() => handleMarcarAlertaLeida(alerta.id)}
                  >
                    Leído
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* 2. SIMULADOR DINÁMICO DISTRIBUIDO DE FORMA SECUENCIAL */}
      <section className="card p-3 p-md-4 mb-4" aria-labelledby="sim-api-title">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-3 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span className="cf-step-badge">2</span>
            <div>
              <h2 id="sim-api-title" className="h5 fw-bold mb-0">
                <Sliders size={20} className="text-primary" /> Simulador paso a paso: ¿Qué pasa si cambian mis ventas o gastos?
              </h2>
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-sm fw-semibold d-inline-flex align-items-center gap-1 rounded-pill px-3 ${
              showGuide ? 'btn-primary' : 'btn-outline-primary'
            }`}
            onClick={() => setShowGuide(v => !v)}
          >
            <Sparkles size={14} />
            <span>{showGuide ? 'Ocultar asistente guiado' : '🧭 Asistente guiado (¿Primera vez?)'}</span>
          </button>
        </div>

        {/* GUÍA INTERACTIVA PASO A PASO PARA EMPRENDEDORES NUEVOS (OPCIONAL) */}
        {showGuide && (
          <div className="cf-guide-box mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">ASISTENTE GUIADO</span>
                <strong className="small text-dark">
                  Elige una situación real y te mostraremos cómo aplicarla
                </strong>
              </div>
              <div className="d-flex gap-1" role="tablist" aria-label="Pasos de la guía">
                <button
                  type="button"
                  className={`btn btn-sm cf-guide-tab ${guideStep === 1 ? 'active' : ''}`}
                  onClick={() => setGuideStep(1)}
                >
                  1. Elige tu meta
                </button>
                <button
                  type="button"
                  className={`btn btn-sm cf-guide-tab ${guideStep === 2 ? 'active' : ''}`}
                  onClick={() => setGuideStep(2)}
                >
                  2. Ajusta montos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm cf-guide-tab ${guideStep === 3 ? 'active' : ''}`}
                  onClick={() => setGuideStep(3)}
                >
                  3. Plan aplicable
                </button>
              </div>
            </div>

            {guideStep === 1 && (
              <div>
                <div className="small fw-semibold text-dark mb-2">
                  Paso 1: ¿Qué situación quieres evaluar hoy en tu negocio?
                </div>
                <div className="row g-3">
                  <div className="col-sm-6 col-xl-3">
                    <button
                      type="button"
                      className={`cf-goal-card w-100 text-start ${guideGoal === 'campana' ? 'active' : ''}`}
                      onClick={() => selectGuideGoal('campana', 'Campaña de mayores ventas', '20', '10')}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fs-5">🛍️</span>
                        <span className="badge bg-success-subtle text-success">Ventas +20%</span>
                      </div>
                      <strong className="small d-block text-dark">Hacer una promoción</strong>
                      <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                        Vender más invirtiendo un poco más en mercadería.
                      </span>
                    </button>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <button
                      type="button"
                      className={`cf-goal-card w-100 text-start ${guideGoal === 'ahorro' ? 'active' : ''}`}
                      onClick={() => selectGuideGoal('ahorro', 'Ahorro en compras y gastos', '0', '-15')}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fs-5">🤝</span>
                        <span className="badge bg-success-subtle text-success">Gastos -15%</span>
                      </div>
                      <strong className="small d-block text-dark">Reducir costos</strong>
                      <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                        Ver cuánto dinero extra te queda si bajas tus gastos.
                      </span>
                    </button>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <button
                      type="button"
                      className={`cf-goal-card w-100 text-start ${guideGoal === 'inversion' ? 'active' : ''}`}
                      onClick={() => selectGuideGoal('inversion', 'Inversión en mercadería o personal', '15', '25')}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fs-5">🏪</span>
                        <span className="badge bg-primary-subtle text-primary">Gastos +25%</span>
                      </div>
                      <strong className="small d-block text-dark">Comprar más stock</strong>
                      <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                        Comprobar si tu negocio puede pagar un gasto nuevo.
                      </span>
                    </button>
                  </div>

                  <div className="col-sm-6 col-xl-3">
                    <button
                      type="button"
                      className={`cf-goal-card w-100 text-start ${guideGoal === 'prevencion' ? 'active' : ''}`}
                      onClick={() => selectGuideGoal('prevencion', 'Plan ante caída de ventas', '-20', '-5')}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fs-5">🛡️</span>
                        <span className="badge bg-warning-subtle text-warning">Ventas -20%</span>
                      </div>
                      <strong className="small d-block text-dark">Prevenir un mes bajo</strong>
                      <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                        Saber si resistirías si bajan los clientes este mes.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {guideStep === 2 && (
              <div>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <span className="small fw-semibold text-dark">
                    Paso 2: Elige cuánto cambiarían tus números con «{simNombre}»
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 text-decoration-none"
                    onClick={() => setGuideStep(1)}
                  >
                    ← Cambiar de meta
                  </button>
                </div>

                <div className="row g-3 align-items-center">
                  <div className="col-md-6">
                    <div className="p-3 bg-white rounded-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-semibold">¿Qué pasaría con tus ventas?</span>
                        <strong className="small text-success">
                          {formatCurrency(baseIng)} → {formatCurrency(liveIng)}
                        </strong>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {[
                          ['Bajan (-20%)', '-20'],
                          ['Bajan poco (-10%)', '-10'],
                          ['Igual (0%)', '0'],
                          ['Suben (+15%)', '15'],
                          ['Suben mucho (+30%)', '30'],
                        ].map(([txt, val]) => (
                          <button
                            key={val}
                            type="button"
                            className={`btn btn-sm cf-quick-pill ${simPctIngresos === val ? 'active' : ''}`}
                            onClick={() => setSimPctIngresos(val)}
                          >
                            {txt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-3 bg-white rounded-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-semibold">¿Qué pasaría con tus gastos?</span>
                        <strong className="small text-danger">
                          {formatCurrency(baseEgr)} → {formatCurrency(liveEgr)}
                        </strong>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {[
                          ['Gran ahorro (-20%)', '-20'],
                          ['Ahorro (-10%)', '-10'],
                          ['Igual (0%)', '0'],
                          ['Suben (+10%)', '10'],
                          ['Inversión (+25%)', '25'],
                        ].map(([txt, val]) => (
                          <button
                            key={val}
                            type="button"
                            className={`btn btn-sm cf-quick-pill ${simPctEgresos === val ? 'active' : ''}`}
                            onClick={() => setSimPctEgresos(val)}
                          >
                            {txt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="small text-muted">
                    Resultado inmediato: te quedarían <strong>{formatCurrency(liveSaldo)}</strong> disponibles.
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-3 fw-semibold"
                    onClick={() => setGuideStep(3)}
                  >
                    Ver plan aplicable →
                  </button>
                </div>
              </div>
            )}

            {guideStep === 3 && (
              <div>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <span className="small fw-semibold text-dark">
                    Paso 3: Resumen listo para aplicar «{simNombre}»
                  </span>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setGuideStep(1)}
                    >
                      Probar otra meta
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm px-3 fw-semibold"
                      disabled={creatingSim}
                      onClick={saveGuidedSimulacion}
                    >
                      {creatingSim ? 'Guardando...' : '💾 Guardar esta simulación'}
                    </button>
                  </div>
                </div>
                <div className="small text-muted">
                  Revisa debajo el <strong>Paso B</strong> y el <strong>Paso C</strong> para ver el resultado completo en vivo.
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO A: CONTROLES DE SIMULACIÓN (ESPACIOSOS Y EN 2 COLUMNAS) */}
        <div className="cf-seq-block mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="cf-substep-pill">Paso A</span>
              <strong className="text-dark">Elige un ejemplo rápido o mueve las barras para simular</strong>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn cf-preset-btn ${pctI === 15 && pctE === 5 ? 'active' : ''}`}
                onClick={() => applyPresetSim('Suben mis ventas (+15%)', '15', '5')}
              >
                📈 +15% Ventas
              </button>
              <button
                type="button"
                className={`btn cf-preset-btn ${pctI === 0 && pctE === -10 ? 'active' : ''}`}
                onClick={() => applyPresetSim('Ahorro en gastos (-10%)', '0', '-10')}
              >
                ✂️ -10% Gastos
              </button>
              <button
                type="button"
                className={`btn cf-preset-btn ${pctI === -15 && pctE === 0 ? 'active' : ''}`}
                onClick={() => applyPresetSim('Bajan mis ventas (-15%)', '-15', '0')}
              >
                📉 -15% Ventas
              </button>
              <button
                type="button"
                className={`btn cf-preset-btn ${pctI === 0 && pctE === 0 ? 'active' : ''}`}
                onClick={() => applyPresetSim('Situación actual (0%)', '0', '0')}
              >
                🔄 Volver a 0%
              </button>
            </div>
          </div>

          <div className="row g-3">
            {/* Barra 1: Ventas */}
            <div className="col-md-6">
              <div className="p-3 p-md-4 border rounded-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label htmlFor="sim-ing" className="fw-bold text-dark mb-0">
                    1. Ventas / Ingresos
                  </label>
                  <span className={`badge fs-6 bg-${pctI >= 0 ? 'success' : 'danger'}-subtle text-${pctI >= 0 ? 'success' : 'danger'}`}>
                    {pctI >= 0 ? `+${pctI}%` : `${pctI}%`} ({formatCurrency(liveIng)})
                  </span>
                </div>
                <input
                  id="sim-ing"
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  className="form-range my-2"
                  value={simPctIngresos}
                  onChange={e => setSimPctIngresos(e.target.value)}
                />
                <div className="d-flex justify-content-between text-muted small">
                  <span>-50% (La mitad)</span>
                  <span>Hoy: {formatCurrency(baseIng)}</span>
                  <span>+50% (Mucho más)</span>
                </div>
              </div>
            </div>

            {/* Barra 2: Gastos */}
            <div className="col-md-6">
              <div className="p-3 p-md-4 border rounded-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label htmlFor="sim-egr" className="fw-bold text-dark mb-0">
                    2. Gastos / Costos
                  </label>
                  <span className={`badge fs-6 bg-${pctE <= 0 ? 'success' : 'danger'}-subtle text-${pctE <= 0 ? 'success' : 'danger'}`}>
                    {pctE >= 0 ? `+${pctE}%` : `${pctE}%`} ({formatCurrency(liveEgr)})
                  </span>
                </div>
                <input
                  id="sim-egr"
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  className="form-range my-2"
                  value={simPctEgresos}
                  onChange={e => setSimPctEgresos(e.target.value)}
                />
                <div className="d-flex justify-content-between text-muted small">
                  <span>-50% (Gran ahorro)</span>
                  <span>Hoy: {formatCurrency(baseEgr)}</span>
                  <span>+50% (Más gastos)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PASO B: RESULTADO EN VIVO Y PLAN APLICABLE (ANCHO COMPLETO, 3 COLUMNAS CLARAS) */}
        <div className="cf-seq-block mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="cf-substep-pill">Paso B</span>
            <strong className="text-dark">Resultado en vivo: ¿Cómo quedaría tu dinero y qué te conviene hacer?</strong>
          </div>

          <div className="cf-sim-preview p-3 p-md-4">
            <div className="row g-4 align-items-center">
              {/* Columna 1: Cifra principal y comparación directa */}
              <div className="col-lg-4 border-end-lg">
                <span className="badge bg-primary-subtle text-primary mb-2">DINERO QUE TE QUEDARÍA</span>
                <div className="d-flex align-items-baseline flex-wrap gap-2 my-1">
                  <strong className={`display-6 fw-bold mb-0 ${liveSaldo < 0 ? 'text-danger' : 'text-primary'}`}>
                    {formatCurrency(liveSaldo)}
                  </strong>
                  <span className={`badge bg-${liveDiff >= 0 ? 'success' : 'danger'}-subtle text-${liveDiff >= 0 ? 'success' : 'danger'}`}>
                    {liveDiff >= 0 ? `+${formatCurrency(liveDiff)}` : formatCurrency(liveDiff)} vs hoy
                  </span>
                </div>
                <div className="small fw-semibold mt-2">
                  {liveSaldo < 0
                    ? '⚠️ Con este cambio te faltaría dinero.'
                    : liveDiff >= 0
                    ? '✅ Ganarías más dinero disponible que hoy.'
                    : '🟡 Aún tendrías saldo a favor, pero menor que hoy.'}
                </div>
              </div>

              {/* Columna 2: Barras comparativas Hoy vs. Con tu cambio */}
              <div className="col-lg-4 border-end-lg">
                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-muted">Tu dinero disponible hoy</span>
                    <strong>{formatCurrency(baseSaldo)}</strong>
                  </div>
                  <div className="cf-meter-track">
                    <div
                      className="cf-meter-fill bg-secondary"
                      style={{
                        width: `${Math.min(100, Math.max(15, (Math.max(0, baseSaldo) / Math.max(1, Math.max(baseSaldo, liveSaldo))) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold">Con tu simulación</span>
                    <strong className={liveDiff >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(liveSaldo)}
                    </strong>
                  </div>
                  <div className="cf-meter-track">
                    <div
                      className={`cf-meter-fill bg-${liveSaldo < 0 ? 'danger' : liveDiff >= 0 ? 'success' : 'warning'}`}
                      style={{
                        width: `${Math.min(100, Math.max(15, (Math.max(0, liveSaldo) / Math.max(1, Math.max(baseSaldo, liveSaldo))) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Columna 3: Indicadores clave aplicables a la empresa */}
              <div className="col-lg-4">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="p-2.5 px-3 rounded-3 bg-white border h-100">
                      <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                        Por cada S/ 1 que gastas
                      </span>
                      <strong className={`fs-6 d-block my-0.5 ${liveRatio >= 1 ? 'text-success' : 'text-danger'}`}>
                        Recibes S/ {liveRatio.toFixed(2)}
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                        Hoy recibes: S/ {baseRatio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2.5 px-3 rounded-3 bg-white border h-100">
                      <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>
                        Tope seguro de gasto
                      </span>
                      <strong className="fs-6 text-primary d-block my-0.5">
                        {formatCurrency(Math.max(0, liveIng - reserveNum))}
                      </strong>
                      <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                        Cuidando tu reserva
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PASO C: DETALLE COMPARATIVO EN VIVO (2 COLUMNAS AMPLIAS: TABLA + GRÁFICO INTERCAMBIABLE) */}
        <div className="cf-seq-block mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="cf-substep-pill">Paso C</span>
            <strong className="text-dark">Compara tus números en detalle (Tabla y gráfico en vivo)</strong>
          </div>

          <div className="row g-3 align-items-stretch">
            {/* Columna izquierda: Tabla comparativa amplia y fácil de leer */}
            <div className="col-lg-7">
              <div className="p-3 p-md-4 border rounded-4 bg-white h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong className="text-dark">Tabla comparativa: Hoy vs. Tu simulación</strong>
                  <span className="badge bg-light text-secondary border">Se actualiza en vivo</span>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Concepto</th>
                        <th className="text-end">Hoy</th>
                        <th className="text-end">Con tu cambio</th>
                        <th className="text-end">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-medium py-2.5">Ventas / Ingresos</td>
                        <td className="text-end text-muted">{formatCurrency(baseIng)}</td>
                        <td className="text-end fw-semibold text-success">{formatCurrency(liveIng)}</td>
                        <td className={`text-end fw-semibold ${diffIng >= 0 ? 'text-success' : 'text-danger'}`}>
                          {diffIng >= 0 ? `+${formatCurrency(diffIng)}` : formatCurrency(diffIng)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium py-2.5">Gastos / Costos</td>
                        <td className="text-end text-muted">{formatCurrency(baseEgr)}</td>
                        <td className="text-end fw-semibold text-danger">{formatCurrency(liveEgr)}</td>
                        <td className={`text-end fw-semibold ${diffEgr <= 0 ? 'text-success' : 'text-danger'}`}>
                          {diffEgr >= 0 ? `+${formatCurrency(diffEgr)}` : formatCurrency(diffEgr)}
                        </td>
                      </tr>
                      <tr className="table-light">
                        <td className="fw-bold text-dark py-2.5">Dinero disponible</td>
                        <td className="text-end fw-semibold">{formatCurrency(baseSaldo)}</td>
                        <td className={`text-end fw-bold ${liveSaldo < 0 ? 'text-danger' : 'text-primary'}`}>
                          {formatCurrency(liveSaldo)}
                        </td>
                        <td className={`text-end fw-bold ${liveDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                          {liveDiff >= 0 ? `+${formatCurrency(liveDiff)}` : formatCurrency(liveDiff)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium py-2.5">Por cada S/ 1 gastado</td>
                        <td className="text-end text-muted">S/ {baseRatio.toFixed(2)}</td>
                        <td className="text-end fw-semibold">S/ {liveRatio.toFixed(2)}</td>
                        <td className={`text-end fw-semibold ${liveRatio - baseRatio >= 0 ? 'text-success' : 'text-warning'}`}>
                          {liveRatio - baseRatio >= 0
                            ? `+S/ ${(liveRatio - baseRatio).toFixed(2)}`
                            : `-S/ ${Math.abs(liveRatio - baseRatio).toFixed(2)}`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Columna derecha: Un solo gráfico amplio con selector de vista */}
            <div className="col-lg-5">
              <div className="p-3 p-md-4 border rounded-4 bg-white h-100 d-flex flex-column justify-content-between">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <strong className="text-dark">Gráfico en vivo</strong>
                  <div className="btn-group btn-group-sm" role="group" aria-label="Cambiar tipo de gráfico en vivo">
                    <button
                      type="button"
                      className={`btn ${liveChartView === 'bars' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setLiveChartView('bars')}
                    >
                      📊 Barras
                    </button>
                    <button
                      type="button"
                      className={`btn ${liveChartView === 'curve' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setLiveChartView('curve')}
                    >
                      📈 4 semanas
                    </button>
                  </div>
                </div>

                {liveChartView === 'bars' ? (
                  <>
                    <div className="cf-live-bars my-auto">
                      <div className="cf-live-bar-col">
                        <div className="cf-live-bar-pair">
                          <div
                            className="cf-live-bar bg-secondary opacity-50"
                            style={{ height: `${Math.max(8, (baseIng / maxSimBar) * 100)}%` }}
                            title={`Ventas hoy: ${formatCurrency(baseIng)}`}
                          />
                          <div
                            className="cf-live-bar bg-success"
                            style={{ height: `${Math.max(8, (liveIng / maxSimBar) * 100)}%` }}
                            title={`Ventas con cambio: ${formatCurrency(liveIng)}`}
                          />
                        </div>
                        <span className="fw-semibold">Ventas</span>
                        <small className={pctI >= 0 ? 'text-success' : 'text-danger'}>
                          {pctI >= 0 ? `+${pctI}%` : `${pctI}%`}
                        </small>
                      </div>

                      <div className="cf-live-bar-col">
                        <div className="cf-live-bar-pair">
                          <div
                            className="cf-live-bar bg-secondary opacity-50"
                            style={{ height: `${Math.max(8, (baseEgr / maxSimBar) * 100)}%` }}
                            title={`Gastos hoy: ${formatCurrency(baseEgr)}`}
                          />
                          <div
                            className="cf-live-bar bg-danger"
                            style={{ height: `${Math.max(8, (liveEgr / maxSimBar) * 100)}%` }}
                            title={`Gastos con cambio: ${formatCurrency(liveEgr)}`}
                          />
                        </div>
                        <span className="fw-semibold">Gastos</span>
                        <small className={pctE <= 0 ? 'text-success' : 'text-danger'}>
                          {pctE >= 0 ? `+${pctE}%` : `${pctE}%`}
                        </small>
                      </div>

                      <div className="cf-live-bar-col">
                        <div className="cf-live-bar-pair">
                          <div
                            className="cf-live-bar bg-secondary opacity-50"
                            style={{ height: `${Math.max(8, (Math.max(0, baseSaldo) / maxSimBar) * 100)}%` }}
                            title={`Disponible hoy: ${formatCurrency(baseSaldo)}`}
                          />
                          <div
                            className={`cf-live-bar bg-${liveSaldo < 0 ? 'danger' : 'primary'}`}
                            style={{ height: `${Math.max(8, (Math.max(0, liveSaldo) / maxSimBar) * 100)}%` }}
                            title={`Disponible con cambio: ${formatCurrency(liveSaldo)}`}
                          />
                        </div>
                        <span className="fw-semibold">Disponible</span>
                        <small className={liveDiff >= 0 ? 'text-success' : 'text-danger'}>
                          {liveDiff >= 0 ? 'Sube' : 'Baja'}
                        </small>
                      </div>
                    </div>
                    <div className="d-flex justify-content-center gap-4 text-muted small mt-2 pt-2 border-top">
                      <span>● Barra gris: Hoy</span>
                      <span className="text-primary fw-semibold">● Barra color: Con tu cambio</span>
                    </div>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 420 145" style={{ width: '100%', height: 150 }} role="img" aria-label="Curva de tendencia en vivo">
                      <polyline
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        points={basePolyline}
                      />
                      <polyline
                        fill="none"
                        stroke={liveSaldo < 0 ? '#dc3545' : liveDiff >= 0 ? '#1f8a5b' : '#27187e'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={livePolyline}
                      />
                      {liveStepPoints.map((pt, idx) => (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill={liveSaldo < 0 ? '#dc3545' : liveDiff >= 0 ? '#1f8a5b' : '#27187e'}
                          />
                          <text x={pt.x} y="135" textAnchor="middle" fill="#64748b" fontSize="11">
                            Semana {idx + 1}
                          </text>
                        </g>
                      ))}
                    </svg>
                    <div className="d-flex justify-content-center gap-4 text-muted small mt-2 pt-2 border-top">
                      <span>--- Sin cambios</span>
                      <span className="fw-semibold text-primary">─── Con tu simulación</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PASO D: GUARDAR ESTA PRUEBA Y CONSULTAR HISTORIAL */}
        <div className="cf-seq-block">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="cf-substep-pill">Paso D</span>
              <strong className="text-dark">Guarda esta simulación para compararla después</strong>
            </div>
            {simulaciones.length > 3 && (
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0"
                onClick={() => setShowAllSims(v => !v)}
              >
                {showAllSims ? 'Mostrar menos' : `Ver todas las guardadas (${simulaciones.length})`}
              </button>
            )}
          </div>

          <form onSubmit={handleCrearSimulacion} className="p-3 border rounded-4 bg-light-subtle mb-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-8 col-lg-9">
                <input
                  id="sim-nombre"
                  type="text"
                  className="form-control"
                  placeholder="Ponle un nombre a esta prueba (ej. Campaña de fiestas o Reducción de gastos)"
                  value={simNombre}
                  onChange={e => setSimNombre(e.target.value)}
                />
              </div>
              <div className="col-md-4 col-lg-3 d-grid">
                <button type="submit" className="btn btn-primary fw-semibold" disabled={creatingSim}>
                  {creatingSim ? 'Guardando...' : '💾 Guardar prueba'}
                </button>
              </div>
            </div>
          </form>

          {simulaciones.length > 0 && (
            <div className="row g-3">
              {(showAllSims ? simulaciones.slice(0, 6) : simulaciones.slice(0, 3)).map(sim => {
                const saldoBase = Number(sim.saldoBase ?? 0);
                const saldoSim = Number(sim.saldoSimulado ?? 0);
                const diff = Number(sim.variacionSaldo ?? saldoSim - saldoBase);
                return (
                  <div className="col-md-4" key={sim.id}>
                    <div
                      className="cf-sim-card d-flex flex-column justify-content-between"
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        applyPresetSim(
                          sim.nombreEscenario,
                          String(Math.round(Number(sim.porcentajeAjusteIngresos || 0))),
                          String(Math.round(Number(sim.porcentajeAjusteEgresos || 0)))
                        )
                      }
                      title="Clic para cargar esta prueba en el simulador"
                    >
                      <div>
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <strong className="small text-dark text-truncate" title={sim.nombreEscenario}>
                            {sim.nombreEscenario}
                          </strong>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={ev => {
                              ev.stopPropagation();
                              handleEliminarSimulacion(sim.id);
                            }}
                            aria-label={`Eliminar simulación ${sim.nombreEscenario}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="d-flex gap-1 mb-2">
                          <span className="badge bg-success-subtle text-success">
                            Ventas {Number(sim.porcentajeAjusteIngresos) >= 0 ? '+' : ''}
                            {sim.porcentajeAjusteIngresos}%
                          </span>
                          <span className="badge bg-danger-subtle text-danger">
                            Gastos {Number(sim.porcentajeAjusteEgresos) >= 0 ? '+' : ''}
                            {sim.porcentajeAjusteEgresos}%
                          </span>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-baseline pt-2 border-top">
                        <div>
                          <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                            Te quedaría:
                          </span>
                          <strong className="text-primary">{formatCurrency(saldoSim)}</strong>
                        </div>
                        <span className={`badge bg-${diff >= 0 ? 'success' : 'warning'}-subtle text-${diff >= 0 ? 'success' : 'warning'}`}>
                          {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 3. PLANIFICADOR COMPACTO DE PRÓXIMOS COBROS Y PAGOS */}
      <section className="card p-3 p-md-4 mb-4" aria-labelledby="scenario-title">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="cf-step-badge">3</span>
            <h2 id="scenario-title" className="h5 fw-bold mb-0">
              <Wallet size={20} aria-hidden="true" /> Tus próximos cobros y pagos (90 días)
            </h2>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
              onClick={loadExplanatoryScenario}
            >
              <Sparkles size={15} /> Cargar ejemplo
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!valid || !userId || Boolean(initial.error)}
              onClick={saveScenario}
            >
              Guardar cambios
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="alert alert-info small py-2 px-3 mb-3" role="status">
            {saveMessage}
          </div>
        )}

        {/* 3 campos base limpios */}
        <div className="row g-2 mb-3 p-2 rounded-3 bg-light border">
          <div className="col-md-4">
            <label htmlFor="cash-scenario-start" className="form-label small fw-semibold mb-1">
              Fecha de inicio
            </label>
            <input
              id="cash-scenario-start"
              type="date"
              className="form-control form-control-sm"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="cash-opening" className="form-label small fw-semibold mb-1">
              Dinero con el que empiezas (S/)
            </label>
            <input
              id="cash-opening"
              type="number"
              step="0.01"
              className="form-control form-control-sm"
              value={opening}
              onChange={e => setOpening(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="cash-reserve" className="form-label small fw-semibold mb-1">
              Colchón mínimo de seguridad (S/)
            </label>
            <input
              id="cash-reserve"
              type="number"
              step="0.01"
              className="form-control form-control-sm"
              value={reserve}
              onChange={e => setReserve(e.target.value)}
            />
          </div>
        </div>

        {/* Formulario en 1 sola fila para agregar cobro o gasto */}
        <form onSubmit={addMovement} className="row g-2 align-items-end mb-3">
          <div className="col-sm-6 col-lg-2">
            <label htmlFor="cash-type" className="form-label small mb-1">
              Tipo
            </label>
            <select
              id="cash-type"
              className="form-select form-select-sm"
              value={type}
              onChange={e => setType(e.target.value as 'income' | 'expense')}
            >
              <option value="income">+ Cobro a recibir</option>
              <option value="expense">- Gasto por pagar</option>
            </select>
          </div>
          <div className="col-sm-6 col-lg-2">
            <label htmlFor="cash-date" className="form-label small mb-1">
              Fecha
            </label>
            <input
              id="cash-date"
              type="date"
              className="form-control form-control-sm"
              min={start}
              max={end}
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="col-sm-8 col-lg-4">
            <label htmlFor="cash-description" className="form-label small mb-1">
              Descripción
            </label>
            <input
              id="cash-description"
              className="form-control form-control-sm"
              maxLength={100}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Alquiler o cobro a cliente"
            />
          </div>
          <div className="col-sm-4 col-lg-2">
            <label htmlFor="cash-amount" className="form-label small mb-1">
              Monto (S/)
            </label>
            <input
              id="cash-amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="form-control form-control-sm"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="col-lg-2">
            <button className="btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1" type="submit">
              <Plus size={15} /> Agregar
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-danger small mb-2">
            {error}
          </p>
        )}

        {/* Filtros visuales y pastillas de resumen para no saturar la tabla */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="btn-group btn-group-sm" role="group" aria-label="Filtrar movimientos">
            <button
              type="button"
              className={`btn btn-${movFilter === 'all' ? '' : 'outline-'}secondary`}
              onClick={() => setMovFilter('all')}
            >
              Todos ({movements.length})
            </button>
            <button
              type="button"
              className={`btn btn-${movFilter === 'income' ? '' : 'outline-'}success`}
              onClick={() => setMovFilter('income')}
            >
              Por cobrar ({incomeCount}) · +{formatCurrency(totalIngPlan)}
            </button>
            <button
              type="button"
              className={`btn btn-${movFilter === 'expense' ? '' : 'outline-'}danger`}
              onClick={() => setMovFilter('expense')}
            >
              Por pagar ({expenseCount}) · -{formatCurrency(totalEgrPlan)}
            </button>
          </div>

          {filteredMovs.length > 5 && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none p-0 d-inline-flex align-items-center gap-1"
              onClick={() => setShowAllMovs(v => !v)}
            >
              {showAllMovs ? (
                <>
                  <span>Ver lista corta</span> <ChevronUp size={15} />
                </>
              ) : (
                <>
                  <span>Ver los {filteredMovs.length} movimientos</span> <ChevronDown size={15} />
                </>
              )}
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="text-end">Monto</th>
                <th className="text-end" style={{ width: 60 }}>
                  Quitar
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleMovs.map(item => (
                <tr key={item.id}>
                  <td className="text-nowrap fw-medium">{showDate(item.date)}</td>
                  <td className="cash-concept">{item.description}</td>
                  <td>
                    <span
                      className={`badge bg-${item.type === 'income' ? 'success' : 'danger'}-subtle text-${
                        item.type === 'income' ? 'success' : 'danger'
                      }`}
                    >
                      {item.type === 'income' ? 'Cobro' : 'Pago'}
                    </span>
                  </td>
                  <td
                    className={`text-end text-nowrap fw-bold ${
                      item.type === 'income' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      aria-label={`Eliminar ${item.description}`}
                      onClick={() => setMovements(items => items.filter(m => m.id !== item.id))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. GRÁFICOS Y ALERTAS VISUALES (Tarjetas tipo calendario sin texto repetitivo) */}
      {result && (
        <>
          <section className="card p-3 p-md-4 mb-4" aria-labelledby="projection-title">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className="cf-step-badge">4</span>
                <h2 id="projection-title" className="h5 fw-bold mb-0">
                  Evolución de tu dinero ({view === 'weekly' ? 'Por semanas' : 'Por meses'})
                </h2>
              </div>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-${view === 'weekly' ? '' : 'outline-'}primary`}
                  onClick={() => setView('weekly')}
                >
                  Por semanas
                </button>
                <button
                  type="button"
                  className={`btn btn-${view === 'monthly' ? '' : 'outline-'}primary`}
                  onClick={() => setView('monthly')}
                >
                  Por meses
                </button>
              </div>
            </div>

            {/* 3 Indicadores clave arriba de los gráficos */}
            <div className="row g-2 mb-3">
              <div className="col-sm-4">
                <div className="p-2 px-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Terminas los 90 días con</span>
                  <strong className="text-primary">{formatCurrency(result.closing)}</strong>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-2 px-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Punto más bajo</span>
                  <strong className={result.minimum < reserveNum ? 'text-warning' : 'text-dark'}>
                    {formatCurrency(result.minimum)}
                  </strong>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="p-2 px-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Nivel de riesgo</span>
                  <span className={`badge bg-${tone(result.risk)}-subtle text-${tone(result.risk)}`}>
                    {result.risk}
                  </span>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong className="small">Tu dinero disponible en el tiempo</strong>
                    <span className="badge bg-warning-subtle text-warning">
                      Línea punteada: Colchón {formatCurrency(reserveNum)}
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <svg viewBox="0 0 600 160" style={{ width: '100%', minWidth: 320, height: 155 }}>
                      <line
                        x1="35"
                        y1={reserveY}
                        x2="565"
                        y2={reserveY}
                        stroke="#e09f3e"
                        strokeWidth="1.5"
                        strokeDasharray="5,5"
                      />
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
                              fill={p.closing < 0 ? '#dc3545' : p.closing < reserveNum ? '#f0b429' : '#27187e'}
                            />
                            <text x={x} y="154" textAnchor="middle" fill="#5c607d" fontSize="10">
                              {p.start.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong className="small">Comparación: Cobros vs. Pagos</strong>
                    <div className="d-flex gap-2 small">
                      <span className="text-success fw-semibold">● Cobros</span>
                      <span className="text-danger fw-semibold">● Pagos</span>
                    </div>
                  </div>
                  <div className="cf-bars">
                    {periods.map(p => (
                      <div className="cf-bar-group" key={p.start}>
                        <div className="cf-bar-pair">
                          <div
                            className="cf-bar cf-income"
                            title={`Recibes: ${formatCurrency(p.income)}`}
                            style={{ height: `${(p.income / maxBarAmount) * 100}%` }}
                          />
                          <div
                            className="cf-bar cf-expense"
                            title={`Gastas: ${formatCurrency(p.expense)}`}
                            style={{ height: `${(p.expense / maxBarAmount) * 100}%` }}
                          />
                        </div>
                        <span>{p.start.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tarjetas visuales de fechas clave (sin bloques de texto repetitivos) */}
          <section className="card p-3 p-md-4 mb-4" aria-labelledby="alerts-title">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 id="alerts-title" className="h5 fw-bold mb-0">
                <BellRing size={19} className="text-warning" aria-hidden="true" /> Fechas clave que debes vigilar
              </h2>
              <span className="small text-muted">
                Colchón de seguridad configurado: <strong>{formatCurrency(reserveNum)}</strong>
              </span>
            </div>

            {result.alerts.length === 0 ? (
              <div className="alert alert-success small mb-0 d-flex align-items-center gap-2">
                <CheckCircle2 size={18} />
                <span>
                  ¡Todo en orden! En ningún día de los próximos 90 días tu dinero baja de tu colchón de seguridad.
                </span>
              </div>
            ) : (
              <div className="row g-3">
                {result.alerts.map((alert, i) => {
                  const [dayStr, monthStr] = showDate(alert.date).split(' ');
                  const faltante = Math.max(0, reserveNum - alert.balance);
                  const pctCovered = reserveNum > 0 ? Math.min(100, Math.max(8, Math.round((Math.max(0, alert.balance) / reserveNum) * 100))) : 50;
                  return (
                    <div className="col-md-4" key={`${alert.date}-${i}`}>
                      <div className={`cf-alert-card ${alert.risk === 'Alto' ? 'cf-alert-card--danger' : ''}`}>
                        <div className="d-flex align-items-center gap-3 mb-2">
                          <div className="cf-date-pill">
                            <span className="fs-5">{dayStr}</span>
                            <span className="text-uppercase" style={{ fontSize: '0.65rem' }}>
                              {monthStr}
                            </span>
                          </div>
                          <div>
                            <span
                              className={`badge bg-${tone(alert.risk)}-subtle text-${tone(alert.risk)} mb-1`}
                            >
                              {alert.risk === 'Alto' ? 'Falta efectivo' : 'Baja de tu colchón'}
                            </span>
                            <div className="small text-muted">Tendrás ese día:</div>
                            <strong className="h5 mb-0 text-dark">{formatCurrency(alert.balance)}</strong>
                          </div>
                        </div>

                        <div className="cf-meter-track my-2" title="Nivel frente a tu colchón">
                          <div
                            className={`cf-meter-fill bg-${tone(alert.risk)}`}
                            style={{ width: `${pctCovered}%` }}
                          />
                        </div>

                        <div className="d-flex justify-content-between align-items-center small">
                          <span className="text-muted">Debajo del colchón:</span>
                          <strong className="text-danger">-{formatCurrency(faltante)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Opciones avanzadas colapsadas */}
      <ModelDataPanel />
    </section>
  );
}
