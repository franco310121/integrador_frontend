export type MovementType = 'ingreso' | 'egreso';
export interface FinancialMovement {
  id: string;
  date: string;
  type: MovementType;
  concept: string;
  category: string;
  amountCents: number;
  contact: string;
  method: string;
  reference: string;
  status: 'activo' | 'anulado';
  createdAt: string;
}
export interface FinancialLedger {
  openingDate: string;
  openingCents: number;
  movements: FinancialMovement[];
}
export const movementCategories = {
  ingreso: ['Cobro de venta', 'Aporte de capital', 'Préstamo recibido', 'Otro ingreso'],
  egreso: ['Pago de compra', 'Alquiler', 'Servicios', 'Remuneraciones', 'Impuestos', 'Pago de préstamo', 'Otro egreso'],
};
export const paymentMethods = ['Efectivo', 'Transferencia', 'Tarjeta', 'Yape / Plin', 'Otro'];

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function moneyToCents(value: string, signed = false): number | null {
  if (!(signed ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && Math.abs(cents) <= 100_000_000_000 ? cents : null;
}
export function ledgerRows(ledger: FinancialLedger) {
  let balanceCents = ledger.openingCents;
  return [...ledger.movements].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(item => {
    if (item.status === 'activo') balanceCents += item.type === 'ingreso' ? item.amountCents : -item.amountCents;
    return { ...item, balanceCents };
  });
}

export function ledgerSummary(ledger: FinancialLedger, from: string, to: string) {
  let openingCents = ledger.openingCents;
  let incomeCents = 0;
  let expenseCents = 0;
  for (const item of ledger.movements) {
    if (item.status !== 'activo') continue;
    const delta = item.type === 'ingreso' ? item.amountCents : -item.amountCents;
    if (from && item.date < from) openingCents += delta;
    else if (!to || item.date <= to) {
      if (item.type === 'ingreso') incomeCents += item.amountCents;
      else expenseCents += item.amountCents;
    }
  }
  return { openingCents, incomeCents, expenseCents, closingCents: openingCents + incomeCents - expenseCents };
}
