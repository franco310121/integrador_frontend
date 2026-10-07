import { addDays } from './cashFlow.ts';
import { validDate, type FinancialLedger } from './financialLedger.ts';
import { movementFingerprint } from './financialImport.ts';

export interface DailyModelRow {
  date: string;
  incomeCents: number | null;
  expenseCents: number | null;
  netCents: number | null;
  closingCents: number | null;
  movementCount: number;
  coverage: 'registrado' | 'sin_verificar' | 'sin_movimientos_confirmado';
}
export function prepareModelData(ledger: FinancialLedger, from: string, to: string, today: string, reviewed: boolean, minDays: number) {
  if (!validDate(from) || !validDate(to) || !validDate(today) || from < ledger.openingDate || to < from || to > today) throw new Error('Selecciona un rango válido desde el inicio de caja hasta hoy.');
  if (!Number.isInteger(minDays) || minDays < 1 || minDays > 3660) throw new Error('El mínimo de días debe estar entre 1 y 3,660.');
  const totalDays = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${ledger.openingDate}T00:00:00Z`)) / 86400000) + 1;
  if (totalDays > 3660) throw new Error('Esta preparación admite hasta 3,660 días desde el inicio de caja.');
  const active = ledger.movements.filter(item => item.status === 'activo' && item.date <= to);
  const groups = new Map<string, { income: number; expense: number; count: number }>();
  const fingerprints = new Set<string>();
  let duplicates = 0;
  for (const item of active) {
    const fingerprint = movementFingerprint(item);
    if (fingerprints.has(fingerprint)) duplicates++;
    fingerprints.add(fingerprint);
    const group = groups.get(item.date) ?? { income: 0, expense: 0, count: 0 };
    if (item.type === 'ingreso') group.income += item.amountCents;
    else group.expense += item.amountCents;
    group.count++; groups.set(item.date, group);
  }
  const rows: DailyModelRow[] = [];
  let balance: number | null = ledger.openingCents;
  let missingBefore = 0;
  let missingDays = 0;
  for (let index = 0; index < totalDays; index++) {
    const date = addDays(ledger.openingDate, index);
    const group = groups.get(date);
    const known = Boolean(group) || reviewed;
    const income = known ? group?.income ?? 0 : null;
    const expense = known ? group?.expense ?? 0 : null;
    const net = known ? income! - expense! : null;
    balance = balance === null || net === null ? null : balance + net;
    if (!group) { if (date < from) missingBefore++; else missingDays++; }
    if (date >= from) rows.push({ date, incomeCents: income, expenseCents: expense, netCents: net, closingCents: balance, movementCount: group?.count ?? 0, coverage: group ? 'registrado' : reviewed ? 'sin_movimientos_confirmado' : 'sin_verificar' });
  }
  const movementCount = rows.reduce((sum, row) => sum + row.movementCount, 0);
  const issues: string[] = [];
  if (!reviewed) issues.push('Confirma que registraste todos los cobros y pagos y cerraste los días hasta la fecha final.');
  if (duplicates) issues.push(`Hay ${duplicates} posibles duplicados activos desde el inicio de caja hasta la fecha final. Revisa el histórico; no se eliminan automáticamente.`);
  if (rows.length < minDays) issues.push(`El rango tiene ${rows.length} días; el criterio provisional requiere ${minDays}.`);
  if (!movementCount) issues.push('El rango no contiene movimientos activos.');
  return {
    rows, issues, ready: issues.length === 0, movementCount, duplicates, missingDays, missingBefore,
    recordedDays: rows.filter(row => row.movementCount > 0).length,
    cancelledCount: ledger.movements.filter(item => item.status === 'anulado' && item.date >= from && item.date <= to).length,
  };
}

export function modelDataCSV(rows: DailyModelRow[]): string {
  const value = (cents: number | null) => cents === null ? '' : (cents / 100).toFixed(2);
  return '\uFEFFfecha,ingresos,egresos,flujo_neto,saldo_cierre,movimientos,cobertura\r\n' + rows.map(row => [row.date, value(row.incomeCents), value(row.expenseCents), value(row.netCents), value(row.closingCents), row.movementCount, row.coverage].join(',')).join('\r\n');
}
