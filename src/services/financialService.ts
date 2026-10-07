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
  const movements: FinancialMovement[] = [];

  for (let i = 59; i >= 1; i--) {
    const dateStr = d(i);
    const posAmountCents = Math.round((850 + ((i * 37) % 2200)) * 100);
    movements.push({
      id: `seed-pos-${i}`,
      date: dateStr,
      type: 'ingreso',
      concept: `Ventas del día - Mostrador POS ${dateStr}`,
      category: 'Cobro de venta',
      amountCents: posAmountCents,
      contact: 'Cliente General',
      method: i % 2 === 0 ? 'Tarjeta' : 'Yape / Plin',
      reference: `POS-${1000 + i}`,
      status: 'activo',
      createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
    });

    if (i % 4 === 0) {
      movements.push({
        id: `seed-corp-${i}`,
        date: dateStr,
        type: 'ingreso',
        concept: 'Cobro de factura corporativa a cliente',
        category: 'Cobro de venta',
        amountCents: Math.round((3500 + ((i * 83) % 4500)) * 100),
        contact: 'Inversiones Santa Rosa E.I.R.L.',
        method: 'Transferencia',
        reference: `F001-${200 + i}`,
        status: 'activo',
        createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      });
    }

    if (i % 7 === 0) {
      movements.push({
        id: `seed-purchase-${i}`,
        date: dateStr,
        type: 'egreso',
        concept: 'Pago de compra de lote de inventario',
        category: 'Pago de compra',
        amountCents: Math.round((4200 + ((i * 97) % 5000)) * 100),
        contact: 'Distribuidora Tech Perú S.A.C.',
        method: 'Transferencia',
        reference: `TR-${500 + i}`,
        status: 'activo',
        createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      });
    }

    if (i % 15 === 0) {
      movements.push({
        id: `seed-serv-${i}`,
        date: dateStr,
        type: 'egreso',
        concept: 'Pago de servicios públicos y luz/agua',
        category: 'Servicios',
        amountCents: Math.round((450 + ((i * 19) % 350)) * 100),
        contact: 'Enel / Sedapal',
        method: 'Transferencia',
        reference: `SERV-${i}`,
        status: 'activo',
        createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      });
    }

    if (i % 30 === 0) {
      movements.push({
        id: `seed-rent-${i}`,
        date: dateStr,
        type: 'egreso',
        concept: 'Pago de alquiler de local comercial',
        category: 'Alquiler',
        amountCents: 220000,
        contact: 'Inmobiliaria San Isidro',
        method: 'Transferencia',
        reference: `ALQ-${i}`,
        status: 'activo',
        createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      });
    }
  }

  return {
    openingDate: d(60),
    openingCents: 2500000,
    movements,
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
