import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultEmploymentSettings, contractIssues, validateEmploymentSettings } from '../src/payroll.ts';
import { contractPeriodCost } from '../src/periodCost.ts';
import { addMonths, dateString, defaultPeriod, parseDate, salaryMonths, serviceAvos, thirteenthAvos, validatePeriod } from '../src/periodDates.ts';
import { defaultScenario } from '../src/defaults.ts';
import { calculate } from '../src/engine.ts';
import { compareAllContracts } from '../src/contractComparison.ts';
import { journeyScenario } from '../src/journey.ts';
const settings = () => ({ ...defaultEmploymentSettings(), taxConfirmed: true, period: { start: '2026-01-01', end: '2026-01-31', fixedEnd: '2026-01-31', exit: 'employer' as const, reciprocalClause: false } });
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const value = (result: ReturnType<typeof contractPeriodCost>, label: string) => result.lines.find(line => line.label === label)?.value ?? 0;

test('calendar months, leap years and 15-day avos are independent of timezone', () => {
  assert.equal(parseDate('2026-02-30'), undefined);
  assert.equal(dateString(addMonths(parseDate('2026-01-31')!, 1)), '2026-02-28');
  assert.equal(salaryMonths(parseDate('2024-02-01')!, parseDate('2024-02-29')!), 1);
  assert.equal(thirteenthAvos(parseDate('2026-01-01')!, parseDate('2026-01-14')!), 0);
  assert.equal(thirteenthAvos(parseDate('2026-01-01')!, parseDate('2026-01-15')!), 1);
  assert.equal(serviceAvos(parseDate('2026-01-16')!, parseDate('2026-02-14')!), 1);
  assert.equal(defaultPeriod(1, new Date(2026, 0, 1)).end, '2026-01-31');
});

test('ordinary fixed-term expiry includes proportional rights but no notice, FGTS fine or art. 479', () => {
  const p = { ...settings(), contract: 'experience' as const, experienceDays: 31 };
  const result = contractPeriodCost(3000, 1, p);
  assert.equal(result.normalExpiry, true); assert.equal(result.noticeDays, 0);
  close(value(result, 'Salários do período'), 3000);
  close(value(result, '13º proporcional no encerramento'), 250);
  close(value(result, 'Férias adquiridas e proporcionais indenizadas'), 250);
  close(value(result, 'Terço das férias indenizadas'), 250 / 3);
  assert.equal(value(result, 'Multa de 40% do FGTS'), 0);
  assert.equal(value(result, 'Indenização por término antecipado · art. 479'), 0);
  close(result.total, result.operation + result.settlement);
  close(result.total, result.lines.filter(line => line.category !== 'included').reduce((sum, line) => sum + line.value, 0));
});

test('indefinite dismissal projects notice rights and excludes notice projection from FGTS fine', () => {
  const result = contractPeriodCost(3000, 1, settings());
  assert.equal(result.noticeDays, 30); assert.equal(result.projectedEnd, '2026-03-02');
  close(value(result, 'Aviso prévio indenizado'), 3000);
  close(value(result, '13º proporcional no encerramento'), 500);
  close(value(result, 'FGTS sobre aviso indenizado'), 240);
  close(value(result, 'Multa de 40% do FGTS'), (3000 + 250) * .08 * .4);
  close(value(result, 'Encargos patronais sobre o 13º do encerramento'), 500 * .278);
});

test('early fixed-term dismissal uses half remaining wages, while art. 481 uses notice', () => {
  const p = { ...settings(), contract: 'experience' as const, experienceDays: 60 };
  const result = contractPeriodCost(3000, 1, p);
  close(value(result, 'Indenização por término antecipado · art. 479'), 1550); // Full February plus March 1, half.
  assert.equal(result.noticeDays, 0);
  const clause = contractPeriodCost(3000, 1, { ...p, period: { ...p.period, reciprocalClause: true } });
  assert.equal(clause.noticeDays, 30); assert.equal(value(clause, 'Indenização por término antecipado · art. 479'), 0);
});

test('harvest expiry adds art. 14 once and does not add generic severance reserves', () => {
  const p = { ...settings(), contract: 'harvest' as const, need: 'harvest' as const, severanceReserve: 50 };
  const result = contractPeriodCost(3000, 1, p);
  close(value(result, 'Indenização de safra · art. 14'), 250);
  close(result.total, contractPeriodCost(3000, 1, { ...p, severanceReserve: 0 }).total);
  assert.equal(value(result, 'Multa de 40% do FGTS'), 0);
});

test('intermittent prepaid proportional rights are not paid again on termination', () => {
  const result = contractPeriodCost(1200, 1, { ...settings(), contract: 'intermittent', need: 'alternating', intermittentConfirmed: true });
  assert.ok(value(result, '13º proporcional pago durante o período') > 0);
  assert.ok(value(result, 'Férias proporcionais e terço pagos durante o período') > 0);
  assert.equal(value(result, '13º proporcional no encerramento'), 0);
  assert.equal(value(result, 'Férias adquiridas e proporcionais indenizadas'), 0);
  close(value(result, 'Aviso prévio indenizado'), 1400 * (1 + 1 / 12 + 1 / 9));
});

test('short rural payments include proportional rights only once at normal expiry', () => {
  const result = contractPeriodCost(3000, 1, { ...settings(), contract: 'short', employer: 'pf', need: 'temporary' });
  close(value(result, '13º proporcional pago durante o período'), 250);
  assert.equal(value(result, '13º proporcional no encerramento'), 0);
  assert.equal(result.settlement, 0);
});

test('past-year thirteenth is paid in operation, current-year and projected avos only at exit', () => {
  const p = settings(); p.period.start = '2025-12-01';
  const result = contractPeriodCost(3000, 1, p);
  close(value(result, '13º de anos anteriores pago no período'), 250);
  close(value(result, '13º proporcional no encerramento'), 500);
});

test('resignation does not create employer notice/fine or speculative credits against employee', () => {
  const p = settings(); const result = contractPeriodCost(3000, 1, { ...p, period: { ...p.period, exit: 'resignation' } });
  assert.equal(result.noticeDays, 0); assert.equal(value(result, 'Multa de 40% do FGTS'), 0);
  assert.ok(result.lines.every(line => line.value >= 0));
});

test('continuing employment keeps accrued rights in total rather than treating deferral as a saving', () => {
  const p = settings(); const result = contractPeriodCost(3000, 1, { ...p, period: { ...p.period, exit: 'continue' } });
  assert.equal(result.settlement, 0); assert.ok(result.accrual > 0);
  close(result.total, result.operation + result.accrual);
});

test('invalid dates are rejected on import; old scenarios without period remain compatible', () => {
  const p = settings(); assert.equal(validateEmploymentSettings(p).length, 0);
  assert.ok(validatePeriod({ ...p.period, end: '2025-01-01' }).length);
  assert.ok(validateEmploymentSettings({ ...p, period: { ...p.period, start: 'not-a-date' } }).length);
  assert.ok(Number.isFinite(contractPeriodCost(3000, 1, defaultEmploymentSettings()).total));
  assert.equal(contractPeriodCost(3000, 0, p).total, 0);
});

test('short term uses calendar months, and demand cannot outlast experience', () => {
  const p = settings(); p.period.end = '2026-02-28'; p.period.fixedEnd = p.period.end;
  assert.equal(contractIssues({ ...p, contract: 'short', employer: 'pf', need: 'temporary' }, 'rural').length, 0);
  assert.ok(contractIssues({ ...p, contract: 'experience', experienceDays: 30 }, 'rural').length);
});

test('long periods and unknown global charges are shown but excluded from period recommendations', () => {
  const p = settings(); p.period.end = '2027-01-31';
  assert.ok(contractPeriodCost(3000, 1, p).reasons.some(reason => reason.includes('férias')));
  assert.ok(contractPeriodCost(3000, 1, { ...settings(), taxProfile: 'custom' }).reasons.length);
});

test('default ranking uses full-period totals with termination; monthly mode remains available', () => {
  const s = defaultScenario(); s.planning = { ...settings(), overtimeAuthorized: true };
  const result = calculate(s, 42); const comparison = compareAllContracts(s, result);
  assert.equal(comparison.basis, 'period'); assert.ok(comparison.best);
  assert.equal(comparison.rankCost(comparison.best!), Math.min(...comparison.candidates.map(option => option.periodTotal!)));
  for (const row of comparison.rows) close(row.hiring.periodTotal!, row.hiring.basePeriod! + row.hiring.period!.total);
  s.planning.comparisonBasis = 'monthly'; const monthly = compareAllContracts(s, result);
  assert.equal(monthly.rankCost(monthly.best!), monthly.best!.totalCost);
});

test('quick calculator is unaffected by contract-specific tax, duration and eligibility changes', () => {
  const s = defaultScenario(); const original = journeyScenario(s);
  s.planning = { ...settings(), contract: 'harvest', partTime: true, taxProfile: 'cebas', salaryFloor: 9000, benefits: 1200, otherMonthly: 2500 };
  const quick = journeyScenario(s);
  assert.equal(quick.planning!.taxProfile, 'custom'); assert.equal(quick.planning!.customCharges, s.charges);
  assert.equal(quick.planning!.salaryFloor, 1); assert.equal(quick.planning!.period, undefined);
  assert.equal(quick.planning!.benefits, 0); assert.equal(quick.planning!.contract, 'indefinite');
  assert.equal(calculate(original, 42).gap, calculate(quick, 42).gap);
  assert.equal(s.planning.contract, 'harvest');
});

test('CNC-style quick costs use one global percentage and preserve Dino 8h24 at 42h', () => {
  const s = journeyScenario(defaultScenario('cnc'));
  const first = calculate(s, 42), second = calculate(s, 40);
  assert.equal(first.dailyCap, 504); assert.equal(second.dailyCap, 480);
  close(first.partialCost, first.gap / 42 * 2200 * 1.4);
  close(first.fullCost, first.fullCount * 2200 * 1.4);
  close(first.overtimeCost, first.gap * 5 * (2200 / 210) * 1.5 * 1.2 * 1.4);
  assert.notEqual(first.gap, second.gap);
});
