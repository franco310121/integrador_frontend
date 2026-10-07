import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCashPeriods } from '../src/utils/financialDashboard.ts';
import { loadCashScenario, saveCashScenario, type CashScenario } from '../src/services/cashScenarioService.ts';
import type { FinancialLedger } from '../src/utils/financialLedger.ts';

const scenario: CashScenario = { start: '2026-10-01', opening: 100, reserve: 50, savedAt: '2026-10-01T12:00:00Z', movements: [
  { id: '1', date: '2026-10-02', description: 'Cobro', type: 'income', amount: 50 },
  { id: '2', date: '2026-10-06', description: 'Pago', type: 'expense', amount: 80 },
] };
const ledger: FinancialLedger = { openingDate: '2026-10-01', openingCents: 10000, movements: [
  { id: 'a', date: '2026-10-02', type: 'ingreso', concept: 'Cobro', category: 'Otro ingreso', amountCents: 4000, contact: '', method: 'Efectivo', reference: '', status: 'activo', createdAt: '2026-10-02T12:00:00Z' },
] };

test('actual and expected share the cutoff; future expenses never enter expected-to-cutoff', () => {
  const result = compareCashPeriods(ledger, scenario, '2026-10-03', 'weekly');
  const first = result.comparisons[0];
  assert.equal(first.cutoff, '2026-10-03');
  assert.equal(first.period.expense, 80);
  assert.equal(first.expectedToCutoff.expenseCents, 0);
  assert.equal(first.expectedToCutoff.closingCents, 15000);
  assert.equal(first.actual?.closingCents, 14000);
  assert.equal(result.comparisons[1].actual, null);
  assert.equal(result.openingDifferenceCents, 0);
});
test('missing historical coverage and differing initial balances are explicit', () => {
  assert.equal(compareCashPeriods({ ...ledger, openingDate: '2026-10-02' }, scenario, '2026-10-03', 'weekly').comparisons[0].actual, null);
  assert.equal(compareCashPeriods(null, scenario, '2026-10-03', 'weekly').comparisons[0].actual, null);
  assert.equal(compareCashPeriods({ ...ledger, openingCents: 12000 }, scenario, '2026-10-03', 'weekly').openingDifferenceCents, 2000);
});
test('weekly and monthly views agree on full horizon; expired scenarios are marked', () => {
  const weekly = compareCashPeriods(ledger, scenario, '2027-01-01', 'weekly');
  const monthly = compareCashPeriods(ledger, scenario, '2027-01-01', 'monthly');
  assert.equal(weekly.projection.closing, 70);
  assert.equal(monthly.projection.closing, 70);
  assert.equal(weekly.expired, true);
  assert.equal(weekly.comparisons[0].expectedToCutoff.closingCents, 7000);
});
test('scenario storage survives reloads, isolates accounts and rejects stale or invalid writes', () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  try {
    saveCashScenario('a', scenario, null);
    assert.deepEqual(loadCashScenario('a'), scenario);
    assert.equal(loadCashScenario('b'), null);
    const updated = { ...scenario, reserve: 60 };
    saveCashScenario('a', updated, scenario);
    assert.throws(() => saveCashScenario('a', scenario, scenario), /otra pestaña/);
    assert.throws(() => saveCashScenario('b', { ...scenario, reserve: -1 }, null), /inválidos/);
    assert.throws(() => saveCashScenario('b', { ...scenario, movements: [{ ...scenario.movements[0], date: '2026-09-30' }] }, null), /inválidos/);
    assert.deepEqual(loadCashScenario('a'), updated);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
