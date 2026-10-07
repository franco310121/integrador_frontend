import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerRows, ledgerSummary, moneyToCents, validDate, type FinancialLedger, type FinancialMovement } from '../src/utils/financialLedger.ts';

function movement(id: string, date: string, type: 'ingreso' | 'egreso', amountCents: number, status: 'activo' | 'anulado' = 'activo'): FinancialMovement {
  return { id, date, type, amountCents, status, concept: 'Movimiento', category: type === 'ingreso' ? 'Otro ingreso' : 'Otro egreso', contact: '', method: 'Efectivo', reference: '', createdAt: '2026-10-07T12:00:00.000Z' };
}
const ledger: FinancialLedger = {
  openingDate: '2026-10-01', openingCents: 10000,
  movements: [movement('3', '2026-10-05', 'egreso', 8000), movement('1', '2026-10-02', 'ingreso', 5000), movement('2', '2026-10-03', 'egreso', 90000, 'anulado')],
};

test('ordered cash balances exclude cancelled entries, retaining them in history', () => {
  assert.deepEqual(ledgerRows(ledger).map(item => [item.id, item.balanceCents]), [['1', 15000], ['2', 15000], ['3', 7000]]);
  assert.deepEqual(ledgerSummary(ledger, '', ''), { openingCents: 10000, incomeCents: 5000, expenseCents: 8000, closingCents: 7000 });
  const restored = { ...ledger, movements: ledger.movements.map(item => ({ ...item, status: 'activo' as const })) };
  assert.equal(ledgerSummary(restored, '', '').closingCents, -83000);
});

test('date range opening includes prior movements, inclusive dates and empty ranges', () => {
  assert.deepEqual(ledgerSummary(ledger, '2026-10-05', '2026-10-05'), { openingCents: 15000, incomeCents: 0, expenseCents: 8000, closingCents: 7000 });
  assert.equal(ledgerSummary(ledger, '', '2026-10-02').closingCents, 15000);
  assert.equal(ledgerSummary(ledger, '2026-10-06', '').closingCents, 7000);
  assert.equal(ledgerSummary(ledger, '2026-10-04', '2026-10-04').closingCents, 15000);
  assert.equal(ledger.movements[0].id, '3'); // Sorting never mutates the persisted record.
});

test('cent precision, amount limits and real calendar dates', () => {
  assert.equal(moneyToCents('0.10'), 10);
  assert.equal(moneyToCents('0.20'), 20);
  assert.equal(moneyToCents('-12.34', true), -1234);
  assert.equal(moneyToCents('-1'), null);
  assert.equal(moneyToCents('1.005'), null);
  assert.equal(moneyToCents('1e6'), null);
  assert.equal(moneyToCents(''), null);
  assert.equal(moneyToCents('1000000000'), 100000000000);
  assert.equal(moneyToCents('1000000000.01'), null);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});
