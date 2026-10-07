import { addDays, type PlannedMovement } from '../utils/cashFlow.ts';
import { validDate } from '../utils/financialLedger.ts';

export interface CashScenario {
  start: string;
  opening: number;
  reserve: number;
  movements: PlannedMovement[];
  savedAt: string;
}
export const FINANCIAL_UPDATED_EVENT = 'finvora-financial-updated';
const keyFor = (userId: string) => `finvora:escenario-caja:v1:${encodeURIComponent(userId)}`;
function validate(scenario: CashScenario) {
  if (!scenario || !validDate(scenario.start) || !Number.isFinite(scenario.opening) || Math.abs(scenario.opening) > 1e9
    || !Number.isFinite(scenario.reserve) || scenario.reserve < 0 || scenario.reserve > 1e9
    || !Number.isFinite(Date.parse(scenario.savedAt)) || !Array.isArray(scenario.movements)
    || !scenario.movements.every(item => typeof item.id === 'string' && Boolean(item.id) && validDate(item.date) && item.date >= scenario.start && item.date <= addDays(scenario.start, 89)
      && ['income', 'expense'].includes(item.type) && typeof item.description === 'string' && Boolean(item.description.trim())
      && Number.isFinite(item.amount) && item.amount >= 0.01 && item.amount <= 1e9)
    || new Set(scenario.movements.map(item => item.id)).size !== scenario.movements.length) throw new Error('El escenario guardado contiene datos inválidos.');
}
function getDefaultScenario(): CashScenario {
  const startDate = new Date().toISOString().slice(0, 10);
  return {
    start: startDate,
    opening: 15000,
    reserve: 10000,
    movements: [
      { id: 'scen-1', date: addDays(startDate, 5), description: 'Cobro proyectado por facturación corporativa', type: 'income', amount: 8500 },
      { id: 'scen-2', date: addDays(startDate, 10), description: 'Pago programado de compra de lote de inventario', type: 'expense', amount: 12000 },
      { id: 'scen-3', date: addDays(startDate, 15), description: 'Pago de alquiler y servicios de local', type: 'expense', amount: 2500 },
      { id: 'scen-4', date: addDays(startDate, 22), description: 'Ventas de mostrador POS estimadas', type: 'income', amount: 4200 },
      { id: 'scen-5', date: addDays(startDate, 28), description: 'Pago quincenal de planilla y personal', type: 'expense', amount: 5800 },
      { id: 'scen-6', date: addDays(startDate, 35), description: 'Cobro de contrato de mantenimiento técnico', type: 'income', amount: 9800 },
      { id: 'scen-7', date: addDays(startDate, 42), description: 'Reposición de inventario para campaña', type: 'expense', amount: 7500 },
      { id: 'scen-8', date: addDays(startDate, 50), description: 'Ingresos estimados por campaña comercial', type: 'income', amount: 14500 },
      { id: 'scen-9', date: addDays(startDate, 58), description: 'Pago de gratificaciones y alquiler mensual', type: 'expense', amount: 6200 },
      { id: 'scen-10', date: addDays(startDate, 68), description: 'Ventas estimadas de inicio de año', type: 'income', amount: 8200 },
      { id: 'scen-11', date: addDays(startDate, 78), description: 'Compra de suministros operativos Q1', type: 'expense', amount: 5000 },
      { id: 'scen-12', date: addDays(startDate, 85), description: 'Cobro de renovación de licencias y proyectos', type: 'income', amount: 6500 },
    ],
    savedAt: new Date().toISOString(),
  };
}

export function loadCashScenario(userId: string): CashScenario | null {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) {
    const defaultScen = getDefaultScenario();
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(defaultScen));
    } catch {
      /* ignore */
    }
    return defaultScen;
  }
  const scenario = JSON.parse(raw) as CashScenario;
  validate(scenario);
  return scenario;
}
export function saveCashScenario(userId: string, scenario: CashScenario, previous: CashScenario | null) {
  validate(scenario);
  if (JSON.stringify(loadCashScenario(userId)) !== JSON.stringify(previous)) throw new Error('El escenario cambió en otra pestaña. Recarga para revisarlo antes de guardar.');
  localStorage.setItem(keyFor(userId), JSON.stringify(scenario));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FINANCIAL_UPDATED_EVENT));
}
