import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSession } from '../src/utils/session.ts';

test('existing nested design session gains the expected identity and lowercase admin role on reload', () => {
  const session = normalizeSession({ token: 'design-token', user: { id: 1, nombre: 'Usuario de Diseño', email: 'demo@example.com', rol: 'ADMIN' } });
  assert.equal(session?.userId, 1);
  assert.equal(session?.rol, 'admin');
  assert.equal(session?.role, 'admin');
  assert.equal(session?.correo, 'demo@example.com');
  assert.equal(session?.displayName, 'Usuario de Diseño');
  assert.equal(session?.accessToken, 'design-token');
});
test('flat sessions preserve stable account keys and roles across normalization and reload', () => {
  const session = normalizeSession({ userId: 'account-42', correo: 'worker@example.com', displayName: 'Trabajador', rol: 'VENDEDOR', accessToken: 'example-token' });
  assert.equal(session?.userId, 'account-42');
  assert.equal(session?.role, 'vendedor');
  assert.deepEqual(normalizeSession(JSON.parse(JSON.stringify(session))), session);
  assert.equal(normalizeSession({ id: 2, role: 'ADMIN' })?.userId, 2);
});
test('missing or invalid identity never becomes a generic account; role does not default to admin', () => {
  for (const value of [null, [], {}, { user: {} }, { userId: '' }, { userId: '  ' }, { userId: {} }, { userId: Infinity }]) assert.equal(normalizeSession(value), null);
  assert.equal(normalizeSession({ userId: 0 })?.userId, 0);
  assert.equal(normalizeSession({ userId: 3 })?.role, 'vendedor');
});
