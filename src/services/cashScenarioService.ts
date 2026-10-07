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
export function loadCashScenario(userId: string): CashScenario | null {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) return null;
  const scenario = JSON.parse(raw) as CashScenario; validate(scenario); return scenario;
}
export function saveCashScenario(userId: string, scenario: CashScenario, previous: CashScenario | null) {
  validate(scenario);
  if (JSON.stringify(loadCashScenario(userId)) !== JSON.stringify(previous)) throw new Error('El escenario cambió en otra pestaña. Recarga para revisarlo antes de guardar.');
  localStorage.setItem(keyFor(userId), JSON.stringify(scenario));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FINANCIAL_UPDATED_EVENT));
}
