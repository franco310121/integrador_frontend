import { moneyToCents, movementCategories, paymentMethods, validDate, type FinancialLedger, type FinancialMovement } from './financialLedger.ts';

export const importHeaders = ['fecha', 'tipo', 'concepto', 'importe', 'categoria', 'medio_pago', 'contacto', 'referencia'];
export const maxImportRows = 5000;
export type ImportedMovement = Omit<FinancialMovement, 'id' | 'status' | 'createdAt'>;
export interface ImportRow {
  line: number;
  raw: Record<string, string>;
  movement: ImportedMovement | null;
  errors: string[];
  notes: string[];
  duplicate: boolean;
}
export interface ImportPreview { rows: ImportRow[]; delimiter: string; warnings: string[] }
const fold = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const headerKey = (value: string) => fold(value).replace(/\s+/g, '_');

// Parse quoted CSV fields, escaped quotes and embedded newlines without splitting records blindly.
export function parseFinancialCSV(text: string): { records: { line: number; cells: string[] }[]; delimiter: string } {
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim()) throw new Error('El archivo está vacío.');
  if (text.includes('\u0000')) throw new Error('El archivo no parece un CSV de texto.');
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      if (quoted && text[i + 1] === '"') { i++; continue; }
      quoted = !quoted;
    }
    if (!quoted && (text[i] === '\n' || text[i] === '\r')) break;
    if (!quoted && text[i] === ',') commas++;
    if (!quoted && text[i] === ';') semicolons++;
  }
  const delimiter = semicolons > commas ? ';' : ',';
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let field = '';
  let line = 1;
  let recordLine = 1;
  let state: 'field' | 'quoted' | 'closed' = 'field';
  const endField = () => { cells.push(field); field = ''; state = 'field'; };
  const endRecord = () => {
    endField();
    if (cells.some(cell => cell.trim() !== '')) records.push({ line: recordLine, cells });
    if (records.length > maxImportRows + 1) throw new Error(`El archivo supera el límite de ${maxImportRows} movimientos.`);
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else state = 'closed';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        field += '\n'; line++;
      } else field += char;
    } else if (char === delimiter) endField();
    else if (char === '\r' || char === '\n') {
      endRecord();
      if (char === '\r' && text[i + 1] === '\n') i++;
      line++; recordLine = line;
    } else if (char === '"' && state === 'field' && field.trim() === '') { field = ''; state = 'quoted'; }
    else if (state === 'closed') {
      if (char !== ' ' && char !== '\t') throw new Error(`CSV inválido en la línea ${line}: hay texto después de una comilla de cierre.`);
    } else {
      if (char === '"') throw new Error(`CSV inválido en la línea ${line}: usa comillas alrededor de todo el campo.`);
      field += char;
    }
  }
  if (state === 'quoted') throw new Error(`CSV inválido: falta cerrar una comilla en el registro de la línea ${recordLine}.`);
  if (field.length || cells.length || state === 'closed') endRecord();
  return { records, delimiter };
}

function normalizeDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}
export function movementFingerprint(item: ImportedMovement): string {
  return JSON.stringify([item.date, item.type, item.amountCents, fold(item.concept), fold(item.category), fold(item.method), fold(item.contact), fold(item.reference)]);
}

export function previewFinancialImport(text: string, ledger: FinancialLedger, today: string): ImportPreview {
  const { records, delimiter } = parseFinancialCSV(text);
  if (records.length < 2) throw new Error('El CSV debe contener una cabecera y al menos un movimiento.');
  const headers = records[0].cells.map(headerKey);
  if (headers.some(header => !header)) throw new Error('La cabecera contiene una columna sin nombre.');
  if (new Set(headers).size !== headers.length) throw new Error('Hay columnas repetidas en la cabecera.');
  const missing = ['fecha', 'tipo', 'concepto', 'importe'].filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`);
  const unknown = headers.filter(header => !importHeaders.includes(header));
  const warnings = unknown.length ? [`Se ignorarán estas columnas: ${unknown.join(', ')}.`] : [];
  const seen = new Set(ledger.movements.map(movementFingerprint));
  const rows = records.slice(1).map(record => {
    const raw = Object.fromEntries(headers.map((key, index) => [key, (record.cells[index] ?? '').trim()]));
    const errors: string[] = [];
    const notes: string[] = [];
    if (record.cells.length !== headers.length) errors.push(`Se esperaban ${headers.length} columnas y se encontraron ${record.cells.length}.`);
    const date = normalizeDate(raw.fecha);
    if (!validDate(date)) errors.push('Fecha inválida. Usa AAAA-MM-DD o DD/MM/AAAA.');
    else if (date < ledger.openingDate || date > today) errors.push(`Fecha fuera del rango ${ledger.openingDate} a ${today}.`);
    else if (date !== raw.fecha) notes.push('Fecha convertida a AAAA-MM-DD.');
    const normalizedType = fold(raw.tipo);
    const type = ['ingreso', 'cobro'].includes(normalizedType) ? 'ingreso' : ['egreso', 'pago'].includes(normalizedType) ? 'egreso' : null;
    if (!type) errors.push('Tipo inválido. Usa ingreso o egreso (también se aceptan cobro y pago).');
    else if (type !== raw.tipo) notes.push(`Tipo normalizado a ${type}.`);
    const concept = raw.concepto;
    if (!concept || concept.length > 180) errors.push('El concepto es obligatorio y debe tener hasta 180 caracteres.');
    const amount = raw.importe.replace(',', '.');
    const amountCents = moneyToCents(amount);
    if (amountCents === null || amountCents < 1) errors.push('Importe inválido: positivo, hasta dos decimales, sin separador de miles y máximo S/ 1,000,000,000.');
    else if (amount !== raw.importe) notes.push('Coma decimal convertida a punto.');
    const category = type ? (raw.categoria ? movementCategories[type].find(value => fold(value) === fold(raw.categoria)) : type === 'ingreso' ? 'Otro ingreso' : 'Otro egreso') : undefined;
    if (type && !category) errors.push('La categoría no corresponde al tipo de movimiento.');
    if (category && category !== raw.categoria) notes.push(`Categoría: ${category}.`);
    const method = raw.medio_pago ? paymentMethods.find(value => fold(value) === fold(raw.medio_pago)) : 'Efectivo';
    if (!method) errors.push('Medio de pago no reconocido.');
    else if (method !== raw.medio_pago) notes.push(`Medio de pago: ${method}.`);
    if ((raw.contacto ?? '').length > 150) errors.push('Contacto: máximo 150 caracteres.');
    if ((raw.referencia ?? '').length > 80) errors.push('Referencia: máximo 80 caracteres.');
    const movement: ImportedMovement | null = errors.length ? null : { date, type: type!, concept, category: category!, amountCents: amountCents!, method: method!, contact: raw.contacto ?? '', reference: raw.referencia ?? '' };
    const fingerprint = movement ? movementFingerprint(movement) : '';
    const duplicate = Boolean(movement && seen.has(fingerprint));
    if (duplicate) notes.push('Coincide con un movimiento existente o una fila anterior; se omitirá.');
    if (movement) seen.add(fingerprint);
    return { line: record.line, raw, movement, errors, notes, duplicate };
  });
  return { rows, delimiter, warnings };
}
