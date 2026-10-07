import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFinancialCSV, previewFinancialImport } from '../src/utils/financialImport.ts';
import { ledgerSummary, type FinancialLedger } from '../src/utils/financialLedger.ts';

const ledger: FinancialLedger = { openingDate: '2026-10-01', openingCents: 10000, movements: [] };
const today = '2026-10-07';

test('semicolon CSV normalizes BOM, dates, case, accents and decimal comma', () => {
  const result = previewFinancialImport('\uFEFF FECHA ;TIPO;concepto;importe;categoria;medio_pago\r\n02/10/2026; COBRO ; Cobro recibido ;1250,50;otro ingreso;TRANSFERENCIA\r\n', ledger, today);
  assert.equal(result.delimiter, ';');
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0].movement, { date: '2026-10-02', type: 'ingreso', concept: 'Cobro recibido', amountCents: 125050, category: 'Otro ingreso', method: 'Transferencia', contact: '', reference: '' });
  assert.equal(result.rows[0].errors.length, 0);
  assert.ok(result.rows[0].notes.length);
});

test('comma CSV supports quoted delimiters, escaped quotes and embedded newlines', () => {
  const result = previewFinancialImport('fecha,tipo,concepto,importe\n2026-10-03,pago,"Pago, local ""A""\nsegunda línea","10,25"\n', ledger, today);
  assert.equal(result.rows[0].movement?.concept, 'Pago, local "A"\nsegunda línea');
  assert.equal(result.rows[0].movement?.amountCents, 1025);
  assert.equal(result.rows[0].movement?.category, 'Otro egreso');
  assert.equal(result.rows[0].movement?.method, 'Efectivo');
  assert.equal(result.rows[0].line, 2);
});

test('rejects malformed quotes, missing headers, duplicate headers and uneven columns', () => {
  assert.throws(() => parseFinancialCSV('fecha;tipo\n"sin cierre'), /comilla/);
  assert.throws(() => parseFinancialCSV('fecha;tipo\n"dato"extra;pago'), /comilla/);
  assert.throws(() => previewFinancialImport('fecha;tipo\n2026-10-01;ingreso', ledger, today), /Faltan columnas/);
  assert.throws(() => previewFinancialImport('fecha;tipo;concepto;importe;FECHA\n1;2;3;4;5', ledger, today), /repetidas/);
  const result = previewFinancialImport('fecha;tipo;concepto;importe\n2026-10-02;ingreso;Cobro;1;extra', ledger, today);
  assert.equal(result.rows[0].movement, null);
  assert.match(result.rows[0].errors.join(' '), /columnas/);
});

test('rejects dates outside range, negative amounts, ambiguous thousands and mismatched categories', () => {
  const result = previewFinancialImport('fecha;tipo;concepto;importe;categoria;medio_pago\n2026-10-08;ingreso;Futuro;5;Alquiler;Inventado\n2026-09-30;egreso;Antes;-10;Alquiler;Efectivo\n2026-02-30;ingreso;Inválida;1,234.50;Otro ingreso;Efectivo\n2026-10-01;ingreso;Tres decimales;1.005;Otro ingreso;Efectivo', ledger, today);
  assert.ok(result.rows.every(row => row.errors.length > 0 && row.movement === null));
});

test('skips duplicates within CSV and against cancelled history without modifying existing records', () => {
  const text = 'fecha;tipo;concepto;importe;referencia\n2026-10-02;ingreso;Cobro;10.00;F-1\n02/10/2026;COBRO; cobro ;10;f-1\n2026-10-02;ingreso;Cobro;10;F-2';
  const result = previewFinancialImport(text, ledger, today);
  assert.deepEqual(result.rows.map(row => row.duplicate), [false, true, false]);
  const existing = { ...ledger, movements: [{ ...result.rows[0].movement!, id: 'old', status: 'anulado' as const, createdAt: '2026-10-02T12:00:00Z' }] };
  const repeated = previewFinancialImport(text, existing, today);
  assert.deepEqual(repeated.rows.map(row => row.duplicate), [true, true, false]);
  const additions = repeated.rows.filter(row => row.movement && !row.duplicate).map(row => ({ ...row.movement!, id: 'new', status: 'activo' as const, createdAt: '2026-10-07T12:00:00Z' }));
  assert.equal(ledgerSummary({ ...existing, movements: [...existing.movements, ...additions] }, '', '').closingCents, 11000);
  assert.equal(existing.movements.length, 1);
});

test('ignores blank lines, reports unknown headers and enforces the row limit', () => {
  const result = previewFinancialImport('fecha;tipo;concepto;importe;nota\n\n2026-10-02;ingreso;Cobro;1;extra\n\n', ledger, today);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].line, 3);
  assert.equal(result.warnings.length, 1);
  assert.throws(() => parseFinancialCSV('fecha;tipo;concepto;importe\n' + '2026-10-02;ingreso;Cobro;1\n'.repeat(5001)), /límite/);
});
