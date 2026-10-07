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
function getDefaultLedger(): FinancialLedger {
  const now = new Date();
  const d = (daysAgo: number) => {
    const dt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return dt.toISOString().slice(0, 10);
  };
  return {
    openingDate: d(30),
    openingCents: 1500000,
    movements: [
      {
        id: 'seed-mov-1',
        date: d(25),
        type: 'ingreso',
        concept: 'Cobro de venta POS - Laptops y Monitores',
        category: 'Cobro de venta',
        amountCents: 450000,
        contact: 'Cliente General',
        method: 'Tarjeta',
        reference: 'F001-0089',
        status: 'activo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'seed-mov-2',
        date: d(20),
        type: 'egreso',
        concept: 'Pago de compra de lote de inventario',
        category: 'Pago de compra',
        amountCents: 650000,
        contact: 'Distribuidora Tech Perú S.A.C.',
        method: 'Transferencia',
        reference: 'TR-98214',
        status: 'activo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'seed-mov-3',
        date: d(15),
        type: 'egreso',
        concept: 'Pago de alquiler de local comercial',
        category: 'Alquiler',
        amountCents: 180000,
        contact: 'Inmobiliaria San Isidro',
        method: 'Transferencia',
        reference: 'REC-4412',
        status: 'activo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'seed-mov-4',
        date: d(10),
        type: 'ingreso',
        concept: 'Cobro de venta corporativa',
        category: 'Cobro de venta',
        amountCents: 380000,
        contact: 'Inversiones Santa Rosa E.I.R.L.',
        method: 'Transferencia',
        reference: 'F001-0095',
        status: 'activo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'seed-mov-5',
        date: d(5),
        type: 'ingreso',
        concept: 'Ventas minoristas de accesorios y mouses',
        category: 'Cobro de venta',
        amountCents: 125000,
        contact: 'Venta Mostrador',
        method: 'Yape / Plin',
        reference: 'OPER-33190',
        status: 'activo',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function loadFinancialLedger(userId: string): FinancialLedger | null {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) {
    const defaultLedger = getDefaultLedger();
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(defaultLedger));
    } catch {
      /* ignorar error de escritura */
    }
    return defaultLedger;
  }
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
