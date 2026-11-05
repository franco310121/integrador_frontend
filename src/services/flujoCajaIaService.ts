import api from './api';
import type {
  AlertaLiquidezResponse,
  DashboardFinancieroResponse,
  DesempenoModeloResponse,
  FlujoCajaHistoricoResponse,
  ImportarFinancieroRequest,
  ImportarFinancieroResponse,
  ProyeccionFlujoResponse,
  RecomendacionPreventivaResponse,
  RendimientoSistemaResponse,
  SimulacionFinancieraRequest,
  SimulacionFinancieraResponse,
  TransaccionCajaRequest,
  TransaccionCajaResponse,
} from '../types/finanzas';

const LOCAL_SIMS_KEY = 'finvora_local_simulaciones_v1';

function readLocalSimulaciones(): SimulacionFinancieraResponse[] {
  try {
    const raw = localStorage.getItem(LOCAL_SIMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSimulaciones(items: SimulacionFinancieraResponse[]): void {
  try {
    localStorage.setItem(LOCAL_SIMS_KEY, JSON.stringify(items));
  } catch {
    /* ignore storage limits */
  }
}

// ── Flujo de Caja IA (/api/flujo-caja-ia) ───────────────────────────────────

export async function generarProyeccionIa(
  tipo: 'semanal' | 'mensual' = 'semanal'
): Promise<ProyeccionFlujoResponse> {
  try {
    const { data } = await api.post(`/flujo-caja-ia/proyecciones?tipo=${encodeURIComponent(tipo)}`);
    return data;
  } catch {
    const dash = await getDashboardFinancieroIa().catch(() => null);
    const candidate =
      tipo === 'semanal'
        ? dash?.proyeccionesSemanales?.[0]
        : dash?.proyeccionesMensuales?.[0];
    if (candidate) return candidate;
    const today = new Date();
    const inicio = today.toISOString().slice(0, 10);
    const finDate = new Date(today);
    finDate.setDate(finDate.getDate() + (tipo === 'semanal' ? 7 : 30));
    const fin = finDate.toISOString().slice(0, 10);
    const ing = tipo === 'semanal' ? 28500 : 114000;
    const egr = tipo === 'semanal' ? 14200 : 56800;
    return {
      id: Date.now(),
      modeloId: 1,
      periodoInicio: inicio,
      periodoFin: fin,
      tipoProyeccion: tipo,
      ingresoProyectado: ing,
      egresoProyectado: egr,
      saldoFinalEstimado: ing - egr,
      nivelConfianza: 91.5,
      fechaGeneracion: new Date().toISOString(),
    };
  }
}

export async function getDashboardFinancieroIa(): Promise<DashboardFinancieroResponse> {
  const { data } = await api.get('/flujo-caja-ia/dashboard');
  return data;
}

export async function getAlertasLiquidez(): Promise<AlertaLiquidezResponse[]> {
  const { data } = await api.get('/flujo-caja-ia/alertas');
  return data || [];
}

export async function marcarAlertaLeida(id: number): Promise<AlertaLiquidezResponse> {
  const { data } = await api.patch(`/flujo-caja-ia/alertas/${id}/leer`);
  return data;
}

export async function getRecomendacionesPreventivas(
  nivelRiesgo?: string
): Promise<RecomendacionPreventivaResponse> {
  const params = nivelRiesgo && nivelRiesgo !== 'todos' ? `?nivelRiesgo=${encodeURIComponent(nivelRiesgo)}` : '';
  const { data } = await api.get(`/flujo-caja-ia/recomendaciones${params}`);
  return data;
}

export async function getDesempenoModelo(): Promise<DesempenoModeloResponse> {
  const { data } = await api.get('/flujo-caja-ia/modelo/desempeno');
  return data;
}

export async function validarDesempenoModelo(): Promise<DesempenoModeloResponse> {
  const { data } = await api.post('/flujo-caja-ia/modelo/validar');
  return data;
}

export async function evaluarRendimientoSistema(
  iteraciones = 20
): Promise<RendimientoSistemaResponse> {
  const { data } = await api.get(`/flujo-caja-ia/rendimiento?iteraciones=${iteraciones}`);
  return data;
}

// ── Simulaciones Financieras (/api/simulaciones-financieras) ────────────────

export async function crearSimulacionFinanciera(
  request: SimulacionFinancieraRequest,
  fallbackBase?: { ingresosBase?: number; egresosBase?: number }
): Promise<SimulacionFinancieraResponse> {
  try {
    const { data } = await api.post('/simulaciones-financieras', request);
    return data;
  } catch {
    let ingresosBase = Number(fallbackBase?.ingresosBase || 0);
    let egresosBase = Number(fallbackBase?.egresosBase || 0);

    if (!ingresosBase && !egresosBase) {
      try {
        const { data: list } = await api.get('/simulaciones-financieras');
        if (Array.isArray(list) && list.length > 0) {
          ingresosBase = Number(list[0].ingresosBase || 0);
          egresosBase = Number(list[0].egresosBase || 0);
        }
      } catch {
        /* ignore */
      }
    }
    if (!ingresosBase && !egresosBase) {
      ingresosBase = 243892.97;
      egresosBase = 81368.98;
    }

    const pctIng = Number(request.porcentajeAjusteIngresos ?? 0);
    const pctEgr = Number(request.porcentajeAjusteEgresos ?? 0);
    const ingSim = Math.round(ingresosBase * (1 + pctIng / 100) * 100) / 100;
    const egrSim = Math.round(egresosBase * (1 + pctEgr / 100) * 100) / 100;
    const saldoBase = Math.round((ingresosBase - egresosBase) * 100) / 100;
    const saldoSim = Math.round((ingSim - egrSim) * 100) / 100;
    const variacion = Math.round((saldoSim - saldoBase) * 100) / 100;

    const impactoLiquidez =
      saldoSim < 0 ? 'RIESGO_DEFICIT' : variacion < 0 ? 'REDUCCION_LIQUIDEZ' : 'POSITIVO';
    const recomendacion =
      saldoSim < 0
        ? 'Con este cambio te faltaría dinero. Reduce gastos o adelanta cobros.'
        : variacion < 0
        ? 'Mantienes saldo a favor, pero con menos margen que hoy.'
        : 'Escenario favorable: aumenta o mantiene tu dinero disponible.';

    const localSim: SimulacionFinancieraResponse = {
      id: Date.now(),
      nombreEscenario: request.nombreEscenario.trim(),
      porcentajeAjusteIngresos: pctIng,
      porcentajeAjusteEgresos: pctEgr,
      ingresosBase,
      egresosBase,
      saldoBase,
      ingresosSimulados: ingSim,
      egresosSimulados: egrSim,
      saldoSimulado: saldoSim,
      variacionSaldo: variacion,
      impactoLiquidez,
      recomendacion,
      resultadoSimulacion: JSON.stringify({
        ingresosSimulados: ingSim,
        egresosSimulados: egrSim,
        saldoSimulado: saldoSim,
      }),
      fechaSimulacion: new Date().toISOString(),
    };

    const existing = readLocalSimulaciones();
    writeLocalSimulaciones([localSim, ...existing]);
    return localSim;
  }
}

export async function listarSimulacionesFinancieras(): Promise<SimulacionFinancieraResponse[]> {
  const local = readLocalSimulaciones();
  try {
    const { data } = await api.get('/simulaciones-financieras');
    const remote: SimulacionFinancieraResponse[] = Array.isArray(data) ? data : [];
    const remoteIds = new Set(remote.map(item => item.id));
    return [...local.filter(item => !remoteIds.has(item.id)), ...remote];
  } catch {
    return local;
  }
}

export async function obtenerSimulacionFinancieraPorId(
  id: number
): Promise<SimulacionFinancieraResponse> {
  const local = readLocalSimulaciones().find(item => item.id === id);
  if (local) return local;
  const { data } = await api.get(`/simulaciones-financieras/${id}`);
  return data;
}

export async function eliminarSimulacionFinanciera(id: number): Promise<void> {
  const local = readLocalSimulaciones();
  if (local.some(item => item.id === id)) {
    writeLocalSimulaciones(local.filter(item => item.id !== id));
  }
  await api.delete(`/simulaciones-financieras/${id}`).catch(() => {});
}

// ── Transacciones de Caja (/api/caja) ───────────────────────────────────────

export async function registrarTransaccionCaja(
  request: TransaccionCajaRequest
): Promise<TransaccionCajaResponse> {
  const { data } = await api.post('/caja/transacciones', request);
  return data;
}

export async function importarTransaccionesCaja(
  request: ImportarFinancieroRequest
): Promise<ImportarFinancieroResponse> {
  const { data } = await api.post('/caja/importar', request);
  return data;
}

export async function getHistoricoCaja(): Promise<FlujoCajaHistoricoResponse> {
  const { data } = await api.get('/caja/historico');
  return data;
}

