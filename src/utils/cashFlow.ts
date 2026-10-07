export type Risk = 'Bajo' | 'Medio' | 'Alto';
export interface PlannedMovement {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
}
export interface CashPeriod {
  start: string;
  end: string;
  opening: number;
  income: number;
  expense: number;
  closing: number;
  minimum: number;
}
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export function riskFor(balance: number, reserve: number): Risk {
  return balance < 0 ? 'Alto' : balance < reserve ? 'Medio' : 'Bajo';
}

// All calculations use integer cents. Risk includes opening and daily closing balances.
export function projectCashFlow(start: string, opening: number, reserve: number, movements: PlannedMovement[], view: 'weekly' | 'monthly') {
  const periods: CashPeriod[] = [];
  const alerts: { date: string; balance: number; risk: Risk }[] = [];
  let balance = Math.round(opening * 100);
  let minimum = balance;
  let previousRisk = riskFor(opening, reserve);
  if (previousRisk !== 'Bajo') alerts.push({ date: start, balance: opening, risk: previousRisk });
  let currentKey = '';
  for (let day = 0; day < 90; day++) {
    const date = addDays(start, day);
    const key = view === 'weekly' ? String(Math.floor(day / 7)) : date.slice(0, 7);
    if (key !== currentKey || periods.length === 0) {
      currentKey = key;
      periods.push({ start: date, end: date, opening: balance / 100, income: 0, expense: 0, closing: balance / 100, minimum: balance / 100 });
    }
    const period = periods[periods.length - 1];
    for (const item of movements.filter(item => item.date === date)) {
      const cents = Math.round(item.amount * 100);
      if (item.type === 'income') { balance += cents; period.income += cents; }
      else { balance -= cents; period.expense += cents; }
    }
    period.end = date;
    period.closing = balance / 100;
    period.minimum = Math.min(period.minimum, balance / 100);
    minimum = Math.min(minimum, balance);
    const risk = riskFor(balance / 100, reserve);
    if (risk !== 'Bajo' && risk !== previousRisk) alerts.push({ date, balance: balance / 100, risk });
    previousRisk = risk;
  }
  return {
    periods: periods.map(period => ({ ...period, income: period.income / 100, expense: period.expense / 100 })),
    alerts, minimum: minimum / 100, closing: balance / 100, risk: riskFor(minimum / 100, reserve),
  };
}
