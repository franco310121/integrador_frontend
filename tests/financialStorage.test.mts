import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFinancialLedger, saveFinancialLedger } from '../src/services/financialService.ts';

test('storage isolates accounts and prevents overwriting other tabs or corrupt data', () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  try {
    const first = { openingDate: '2026-10-01', openingCents: 10000, movements: [] };
    assert.equal(loadFinancialLedger('a'), null);
    saveFinancialLedger('a', first, null);
    assert.deepEqual(loadFinancialLedger('a'), first);
    assert.equal(loadFinancialLedger('b'), null);
    const updated = { ...first, openingCents: 20000 };
    saveFinancialLedger('a', updated, first);
    assert.throws(() => saveFinancialLedger('a', first, first), /otra pestaña/);
    assert.deepEqual(loadFinancialLedger('a'), updated);
    data.set('finvora:movimientos-financieros:v1:b', '{invalid');
    assert.throws(() => loadFinancialLedger('b'));
    assert.throws(() => saveFinancialLedger('b', first, null));
    assert.equal(data.get('finvora:movimientos-financieros:v1:b'), '{invalid');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => null, setItem: () => { throw new Error('Storage full'); },
    } });
    assert.throws(() => saveFinancialLedger('c', first, null), /Storage full/);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
