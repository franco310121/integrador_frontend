import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareModelData, modelDataCSV } from '../src/utils/modelData.ts';
import type { FinancialLedger, FinancialMovement } from '../src/utils/financialLedger.ts';

function movement(id: string, date: string, type: 'ingreso' | 'egreso', amountCents: number): FinancialMovement {
  return { id, date, type, amountCents, category: type === 'ingreso' ? 'Otro ingreso' : 'Otro egreso', concept: id, contact: '', reference: id, method: 'Efectivo', status: 'activo', createdAt: '2026-10-01T12:00:00Z' };
}
const ledger: FinancialLedger = { openingDate: '2026-10-01', openingCents: 10000, movements: [
  movement('income', '2026-10-01', 'ingreso', 5000),
  movement('expense', '2026-10-01', 'egreso', 1000),
  movement('later', '2026-10-03', 'egreso', 2000),
  { ...movement('cancelled', '2026-10-03', 'ingreso', 90000), status: 'anulado' },
] };

test('daily aggregation uses cents and excludes cancelled movements', () => {
  const result = prepareModelData(ledger, '2026-10-01', '2026-10-03', '2026-10-07', true, 3);
  assert.equal(result.ready, true);
  assert.equal(result.movementCount, 3);
  assert.equal(result.cancelledCount, 1);
  assert.equal(result.recordedDays, 2);
  assert.equal(result.missingDays, 1);
  assert.deepEqual(result.rows.map(row => [row.incomeCents, row.expenseCents, row.netCents, row.closingCents]), [[5000, 1000, 4000, 14000], [0, 0, 0, 14000], [0, 2000, -2000, 12000]]);
  assert.equal(result.rows[1].coverage, 'sin_movimientos_confirmado');
});

test('unreviewed empty days are unknown and propagate unknown balances, not fabricated zeros', () => {
  const result = prepareModelData(ledger, '2026-10-01', '2026-10-03', '2026-10-07', false, 3);
  assert.equal(result.ready, false);
  assert.equal(result.rows[1].incomeCents, null);
  assert.equal(result.rows[1].closingCents, null);
  assert.equal(result.rows[2].closingCents, null);
  assert.equal(result.rows[2].expenseCents, 2000);
  const csv = modelDataCSV(result.rows);
  assert.match(csv, /2026-10-02,,,,,0,sin_verificar/);
});

test('selected period retains prior balances and reviews missing coverage before the selected period', () => {
  const ready = prepareModelData(ledger, '2026-10-03', '2026-10-03', '2026-10-07', true, 1);
  assert.equal(ready.rows[0].closingCents, 12000);
  assert.equal(ready.missingBefore, 1);
  const pending = prepareModelData(ledger, '2026-10-03', '2026-10-03', '2026-10-07', false, 1);
  assert.equal(pending.rows[0].closingCents, null);
  assert.equal(pending.ready, false);
});

test('possible duplicates block preparation without silently deleting or changing transactions', () => {
  const duplicate = { ...ledger.movements[0], id: 'copy' };
  const source = { ...ledger, movements: [...ledger.movements, duplicate] };
  const result = prepareModelData(source, '2026-10-01', '2026-10-03', '2026-10-07', true, 3);
  assert.equal(result.duplicates, 1);
  assert.equal(result.ready, false);
  assert.equal(result.rows[0].incomeCents, 10000);
  assert.equal(source.movements.length, 5);
});

test('minimum days and movement availability are explicit readiness checks', () => {
  const short = prepareModelData(ledger, '2026-10-01', '2026-10-03', '2026-10-07', true, 30);
  assert.equal(short.ready, false);
  assert.match(short.issues.join(' '), /30/);
  const empty = prepareModelData({ ...ledger, movements: [] }, '2026-10-01', '2026-10-03', '2026-10-07', true, 3);
  assert.equal(empty.ready, false);
  assert.equal(empty.rows[0].incomeCents, 0);
  assert.match(empty.issues.join(' '), /movimientos activos/);
});

test('invalid, future or excessively large ranges fail; leap day and CSV output stay correct', () => {
  assert.throws(() => prepareModelData(ledger, '2026-09-30', '2026-10-03', '2026-10-07', true, 1), /rango/);
  assert.throws(() => prepareModelData(ledger, '2026-10-04', '2026-10-03', '2026-10-07', true, 1), /rango/);
  assert.throws(() => prepareModelData(ledger, '2026-10-01', '2026-10-08', '2026-10-07', true, 1), /rango/);
  assert.throws(() => prepareModelData(ledger, '2026-10-01', '2026-10-03', '2026-10-07', true, 0), /mínimo/);
  assert.throws(() => prepareModelData({ ...ledger, openingDate: '2000-01-01' }, '2026-10-01', '2026-10-03', '2026-10-07', true, 1), /3,660/);
  const leap = prepareModelData({ openingDate: '2028-02-28', openingCents: 0, movements: [movement('cent', '2028-02-28', 'ingreso', 10), movement('two', '2028-02-28', 'ingreso', 20)] }, '2028-02-28', '2028-03-01', '2028-03-01', true, 3);
  assert.deepEqual(leap.rows.map(row => row.date), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.match(modelDataCSV(leap.rows), /2028-02-28,0.30,0.00,0.30,0.30,2,registrado/);
});
