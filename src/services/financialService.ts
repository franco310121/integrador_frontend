import { movementCategories, paymentMethods, validDate, type FinancialLedger, type FinancialMovement } from '../utils/financialLedger.ts';

const keyFor = (userId: string) => `finvora:movimientos-financieros:v1:${encodeURIComponent(userId)}`;
function isMovement(item: FinancialMovement): boolean {
  return Boolean(item) && typeof item.id === 'string' && item.id.length > 0 && validDate(item.date)
    && (item.type === 'ingreso' || item.type === 'egreso')
    && typeof item.concept === 'string' && Boolean(item.concept.trim())
    && movementCategories[item.type].includes(item.category)
    && Number.isSafeInteger(item.amountCents) && item.amountCents > 0 && item.amountCents <= 100_000_000_000
    && ['contact', 'reference', 'method'].every(key => typeof item[key] === 'string')
    && paymentMethods.includes(item.method) && ['activo', 'anulado'].includes(item.status)
    && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt));
}
function validateLedger(data: FinancialLedger) {
  if (!data || !validDate(data.openingDate) || !Number.isSafeInteger(data.openingCents) || Math.abs(data.openingCents) > 100_000_000_000
    || !Array.isArray(data.movements) || !data.movements.every(item => isMovement(item) && item.date >= data.openingDate)
    || new Set(data.movements.map(item => item.id)).size !== data.movements.length) {
    throw new Error('El registro financiero contiene datos inválidos.');
  }
}
export function loadFinancialLedger(userId: string): FinancialLedger | null {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) return null;
  const data = JSON.parse(raw) as FinancialLedger;
  validateLedger(data);
  return data;
}
export function saveFinancialLedger(userId: string, next: FinancialLedger, previous: FinancialLedger | null) {
  validateLedger(next);
  // Avoid overwriting a change saved by another tab.
  if (JSON.stringify(loadFinancialLedger(userId)) !== JSON.stringify(previous)) {
    throw new Error('Hay cambios guardados desde otra pestaña. Recarga esta página antes de continuar.');
  }
  localStorage.setItem(keyFor(userId), JSON.stringify(next));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('finvora-financial-updated'));
}
