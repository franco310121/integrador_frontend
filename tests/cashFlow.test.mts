import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, projectCashFlow, riskFor } from '../src/utils/cashFlow.ts';

test('weekly and monthly totals agree and retain a temporary daily deficit', () => {
  const movements = [
    { id: '1', date: '2026-10-08', description: 'Pago', type: 'expense' as const, amount: 150 },
    { id: '2', date: '2026-10-09', description: 'Cobro', type: 'income' as const, amount: 250 },
  ];
  for (const view of ['weekly', 'monthly'] as const) {
    const result = projectCashFlow('2026-10-07', 100, 50, movements, view);
    assert.equal(result.closing, 200);
    assert.equal(result.minimum, -50);
    assert.equal(result.risk, 'Alto');
    assert.deepEqual(result.alerts, [{ date: '2026-10-08', balance: -50, risk: 'Alto' }]);
    assert.equal(result.periods.reduce((sum, p) => sum + p.income, 0), 250);
    assert.equal(result.periods.reduce((sum, p) => sum + p.expense, 0), 150);
    result.periods.forEach((p, i) => {
      assert.equal(p.closing, p.opening + p.income - p.expense);
      if (i) assert.equal(p.opening, result.periods[i - 1].closing);
    });
  }
});

test('includes exactly 90 days across years and handles partial months', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  const start = '2026-10-07';
  const last = addDays(start, 89);
  const result = projectCashFlow(start, 0, 0, [
    { id: '1', date: last, description: 'Incluido', type: 'income', amount: 0.1 },
    { id: '2', date: last, description: 'Incluido', type: 'income', amount: 0.2 },
    { id: '3', date: addDays(start, 90), description: 'Fuera', type: 'expense', amount: 10 },
  ], 'monthly');
  assert.equal(result.closing, 0.3);
  assert.equal(result.periods[0].end, '2026-10-31');
  assert.equal(result.periods.at(-1)?.end, last);
  assert.equal(projectCashFlow(start, 0, 0, [], 'weekly').periods.length, 13);
});

test('risk boundaries, initial deficit and repeated risk do not spam alerts', () => {
  assert.equal(riskFor(0, 0), 'Bajo');
  assert.equal(riskFor(50, 50), 'Bajo');
  assert.equal(riskFor(0, 50), 'Medio');
  assert.equal(riskFor(-0.01, 0), 'Alto');
  const result = projectCashFlow('2026-10-07', -10, 50, [], 'weekly');
  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].date, '2026-10-07');
  assert.equal(result.minimum, -10);
});
