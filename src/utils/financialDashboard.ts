import { addDays, projectCashFlow } from './cashFlow.ts';
import { ledgerSummary, type FinancialLedger } from './financialLedger.ts';
import type { CashScenario } from '../services/cashScenarioService.ts';

// Comparison uses the same period and cutoff on both sides; future actuals remain unavailable.
export function compareCashPeriods(ledger: FinancialLedger | null, scenario: CashScenario, today: string, view: 'weekly' | 'monthly') {
  const projection = projectCashFlow(scenario.start, scenario.opening, scenario.reserve, scenario.movements, view);
  const comparisons = projection.periods.map(period => {
    const cutoff = period.end < today ? period.end : today;
    const covered = Boolean(ledger && ledger.openingDate <= period.start && cutoff >= period.start);
    let expectedClosing = Math.round(period.opening * 100);
    let income = 0;
    let expense = 0;
    for (const item of scenario.movements.filter(item => item.date >= period.start && item.date <= cutoff)) {
      if (item.type === 'income') income += Math.round(item.amount * 100);
      else expense += Math.round(item.amount * 100);
    }
    expectedClosing += income - expense;
    return { period, cutoff, actual: covered ? ledgerSummary(ledger!, period.start, cutoff) : null, expectedToCutoff: { incomeCents: income, expenseCents: expense, closingCents: expectedClosing } };
  });
  const base = ledger && ledger.openingDate <= scenario.start ? ledgerSummary(ledger, scenario.start, scenario.start).openingCents : null;
  return { projection, comparisons, openingDifferenceCents: base === null ? null : base - Math.round(scenario.opening * 100), expired: addDays(scenario.start, 89) < today };
}
