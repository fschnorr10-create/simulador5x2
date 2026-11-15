import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultScenario } from '../src/defaults.ts';
import { calculate, restIsValid, validateScenario, DAY, WEEK } from '../src/engine.ts';
import { analyzeEmployment, planHiring, planOvertime } from '../src/staffing.ts';
import { contractIssues, defaultEmploymentSettings, MINIMUM_WAGE_2026, payrollCost } from '../src/payroll.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
function oneWorker(split = true) {
  const scenario = defaultScenario();
  scenario.employees = 1; scenario.salary = 1800;
  scenario.planning!.taxConfirmed = true; scenario.planning!.overtimeAuthorized = true;
  scenario.days.forEach((day, index) => { day.bands = index < 5 ? split ? [
    { id: `${index}-am`, open: '08:00', close: '12:00', people: 1 },
    { id: `${index}-pm`, open: '13:00', close: '18:00', people: 1 },
  ] : [{ id: String(index), open: '08:00', close: '18:00', people: 1 }] : []; });
  return scenario;
}

test('minimum wage reference and monthly provisions avoid a thirteenth ordinary vacation salary', () => {
  assert.equal(MINIMUM_WAGE_2026, 1621);
  const p = defaultEmploymentSettings(); p.taxProfile = 'cebas'; p.taxConfirmed = true;
  const result = payrollCost(1621, 1, p);
  close(result.total, 1621 * (1 + 1 / 12 + 1 / 36) * 1.08);
  close(result.cash, 1621 * 1.08);
  close(result.provision, result.total - result.cash);
});

test('normal, Simples, Annex IV and confirmed immunity produce distinct employer charges', () => {
  const p = defaultEmploymentSettings(); p.taxConfirmed = true;
  const normal = payrollCost(1800, 1, p);
  close(normal.total, 1800 * (1 + 1 / 12 + 1 / 36) * 1.358);
  close(payrollCost(1800, 1, { ...p, taxProfile: 'simples' }).total, 1800 * (1 + 1 / 12 + 1 / 36) * 1.08);
  close(payrollCost(1800, 1, { ...p, taxProfile: 'simplesIV' }).total, 1800 * (1 + 1 / 12 + 1 / 36) * 1.30);
  assert.ok(payrollCost(1800, 1, { ...p, taxProfile: 'cebas', taxConfirmed: false }).total > payrollCost(1800, 1, { ...p, taxProfile: 'cebas' }).total);
});

test('payroll PIS, benefits and termination reserves are explicit and do not become employee withholdings', () => {
  const p = defaultEmploymentSettings(); p.payrollPis = 1; p.benefits = 100; p.severanceReserve = 3.2;
  const value = payrollCost(2000, 2, p);
  close(value.lines.find(line => line.label === 'PIS sobre folha, quando devido')!.value, 2000 * (1 + 1 / 12 + 1 / 36) * .01);
  assert.equal(value.lines.find(line => line.label === 'Benefícios e custos por pessoa')!.value, 200);
  assert.equal(value.lines.find(line => line.label === 'Reserva rescisória informada')!.value, 64);
});

test('harvest hiring includes its statutory indemnity without adding it to existing monthly staff', () => {
  const p = { ...defaultEmploymentSettings(), contract: 'harvest' as const };
  const existing = payrollCost(1800, 1, p);
  const term = payrollCost(1800, 1, p, 'term', true, true);
  assert.equal(existing.lines.find(line => line.label === 'Reserva de indenização de safra · art. 14')!.value, 0);
  close(term.lines.find(line => line.label === 'Reserva de indenização de safra · art. 14')!.value, 150);
  close(term.lines.find(line => line.label === 'FGTS')!.value, (1800 + 150) * .08);
  close(term.lines.find(line => line.label === 'Férias proporcionais indenizadas · reserva')!.value, 150);
});

test('intermittent payments include proportional vacation, thirteenth, DSR and taxable levies', () => {
  const p = defaultEmploymentSettings(); const result = payrollCost(1200, 1, p, 'intermittent');
  const base = 1200 * (1 + 1 / 6);
  const taxable = base * (1 + 1 / 12 + 1 / 12 + 1 / 36);
  close(result.total, taxable * 1.358);
  close(result.lines.find(line => line.label === 'FGTS')!.value, taxable * .08);
  assert.equal(result.provision, 0);
});

test('same-role probation, non-seasonal harvest and invalid short-term rural contracts are blocked', () => {
  const p = defaultEmploymentSettings();
  assert.ok(contractIssues({ ...p, contract: 'experience', priorSameRole: true }, 'rural').length);
  assert.ok(contractIssues({ ...p, contract: 'harvest' }, 'rural').length);
  assert.equal(contractIssues({ ...p, contract: 'harvest', need: 'harvest' }, 'rural').length, 0);
  assert.ok(contractIssues({ ...p, contract: 'short', employer: 'pj', need: 'temporary' }, 'rural').length);
  assert.equal(contractIssues({ ...p, contract: 'short', employer: 'pf', need: 'temporary', durationMonths: 1, previousShortMonths: 1 }, 'rural').length, 0);
  assert.ok(contractIssues({ ...p, contract: 'short', employer: 'pf', need: 'temporary', durationMonths: 1, previousShortMonths: 1.1 }, 'rural').length);
  assert.ok(contractIssues({ ...p, contract: 'intermittent', intermittentConfirmed: true }, 'rural').length);
});

test('a genuine daily gap can be covered with capped overtime and compared against real hires', () => {
  const scenario = oneWorker(); const result = calculate(scenario, 40); const analysis = analyzeEmployment(scenario, result);
  close(result.gap, 5); close(analysis.overtime.extraHours, 5); close(analysis.overtime.remaining, 0);
  assert.equal(analysis.overtime.people, 1); assert.equal(analysis.overtime.assignments.length, 5);
  assert.equal(analysis.hiring.remaining, 0); assert.ok(analysis.hiring.count > 0);
  assert.match(analysis.recommendation, /^Horas extras têm/);
  assert.ok(analysis.savings > 0);
});

test('overtime does not hide meal-break gaps or treat a partial solution as full coverage', () => {
  const scenario = oneWorker(false); const result = calculate(scenario, 40); const analysis = analyzeEmployment(scenario, result);
  assert.ok(analysis.overtime.extraHours > 0); assert.ok(analysis.overtime.remaining > 0);
  assert.ok(analysis.complementary.count > 0); close(analysis.complementary.remaining, 0);
  assert.notEqual(analysis.recommendation, 'Horas extras têm o menor custo estimado para esta cobertura.');
});

test('overtime preserves daily limits, workdays and cyclic rests at 42h and 40h', () => {
  for (const stage of [42, 40] as const) {
    const scenario = oneWorker(false); const result = calculate(scenario, stage); const plan = planOvertime(scenario, result);
    for (const item of plan.assignments) assert.ok(item.extraMinutes <= Math.min(120, 600 - result.dailyCap));
    for (const worker of plan.workers) {
      assert.ok(restIsValid(worker.shifts)); assert.ok(worker.shifts.every(shift => shift.workMinutes <= 600));
      assert.ok(worker.shifts.every(shift => shift.start >= shift.day * DAY));
      assert.deepEqual(worker.shifts.map(shift => shift.day), result.workers[worker.number - 1].shifts.map(shift => shift.day));
    }
  }
});

test('disabled, unauthorized, insalubrious and special-regime overtime is blocked', () => {
  for (const change of ['disabled', 'unauthorized', 'insalubrious', 'special']) {
    const scenario = oneWorker();
    if (change === 'disabled') scenario.planning!.overtimeEnabled = false;
    if (change === 'unauthorized') scenario.planning!.overtimeAuthorized = false;
    if (change === 'insalubrious') scenario.insalubrious = true;
    if (change === 'special') scenario.scale = '12x36';
    const plan = planOvertime(scenario, calculate(scenario, 40));
    assert.equal(plan.extraHours, 0); assert.equal(plan.cost, 0); assert.ok(plan.reasons.length);
  }
});

test('hiring shifts respect caps, rests, explicit intermittent call-up capacity and partial hours', () => {
  for (const contract of ['indefinite', 'partial', 'intermittent'] as const) {
    const scenario = oneWorker(false); scenario.planning!.contract = contract;
    scenario.planning!.need = 'alternating'; scenario.planning!.intermittentConfirmed = true;
    const result = calculate(scenario, 40); const plan = planHiring(scenario, result);
    for (const worker of plan.workers) {
      assert.ok(restIsValid(worker.shifts)); assert.ok(worker.shifts.length <= 5);
      assert.ok(worker.minutes / 60 <= plan.weeklyHours + 1e-8);
      if (contract === 'intermittent') assert.ok(worker.minutes / 60 * scenario.monthlyWeeks <= scenario.planning!.intermittentHours + 1e-8);
    }
    assert.ok(plan.count <= 100); assert.ok(plan.remaining <= result.gap);
  }
});

test('incomplete tax inputs cannot produce a definitive economic recommendation', () => {
  const scenario = oneWorker(); scenario.planning!.taxConfirmed = false;
  assert.match(analyzeEmployment(scenario, calculate(scenario, 40)).recommendation, /^Confirme/);
  scenario.planning!.taxConfirmed = true; scenario.planning!.taxProfile = 'ruralRevenue';
  assert.match(analyzeEmployment(scenario, calculate(scenario, 40)).recommendation, /^Confirme/);
});

test('revenue contribution and fixed group costs are charged once, not per employee or per new hire', () => {
  const scenario = oneWorker(); scenario.planning!.taxProfile = 'ruralRevenue'; scenario.planning!.monthlyRevenue = 100000; scenario.planning!.revenueRate = 2.5; scenario.planning!.otherMonthly = 100;
  const result = analyzeEmployment(scenario, calculate(scenario, 40));
  assert.equal(result.revenue, 2500); close(result.currentMonthly, result.base.total + 2600);
  const copy = structuredClone(scenario); copy.planning!.monthlyRevenue = 0;
  const second = analyzeEmployment(copy, calculate(copy, 40));
  close(result.hiring.cost, second.hiring.cost);
});

test('invalid imported settings are rejected, while legacy JSON stays supported', () => {
  const scenario = oneWorker();
  for (const patch of [{ overtimeDailyLimit: 3 }, { experienceDays: 91 }, { cpp: NaN }, { payrollPis: -1 }, { intermittentHours: Infinity }, { contract: 'invalid' }, { fgts: 0 }]) {
    assert.ok(validateScenario({ ...scenario, planning: { ...scenario.planning, ...patch } }).length);
  }
  delete scenario.planning; assert.equal(validateScenario(scenario).length, 0);
  const result = calculate(scenario, 40); close(result.fullCost, result.fullCount * scenario.salary * (1 + scenario.charges / 100));
});

test('empty demand has no hiring or overtime and never produces non-finite costs', () => {
  const scenario = oneWorker(); scenario.days.forEach(day => { day.bands = []; });
  const result = analyzeEmployment(scenario, calculate(scenario, 40));
  assert.equal(result.hiring.count, 0); assert.equal(result.hiring.cost, 0); assert.equal(result.overtime.cost, 0);
  assert.ok(Number.isFinite(result.currentMonthly));
});

test('additional overtime never creates more than six continuous hours before or after a meal break', () => {
  const scenario = oneWorker(false); const plan = planOvertime(scenario, calculate(scenario, 40));
  for (const worker of plan.workers) for (const shift of worker.shifts) {
    assert.ok(shift.breakStart - shift.start <= 360);
    assert.ok(shift.end - shift.breakStart - shift.breakMinutes <= 360);
  }
});

test('switching from part-time to intermittent keeps the call-up cap, including stale form choices', () => {
  const scenario = oneWorker(false); scenario.planning!.partTime = true; scenario.planning!.contract = 'intermittent';
  scenario.planning!.need = 'alternating'; scenario.planning!.intermittentConfirmed = true; scenario.planning!.intermittentHours = 20;
  const plan = planHiring(scenario, calculate(scenario, 40));
  assert.ok(plan.workers.every(worker => worker.minutes / 60 * scenario.monthlyWeeks <= 20 + 1e-8));
});

test('a company with zero existing employees can size a new team without inventing existing payroll', () => {
  const scenario = oneWorker(); scenario.employees = 0;
  assert.equal(validateScenario(scenario).length, 0);
  const result = analyzeEmployment(scenario, calculate(scenario, 40));
  assert.equal(result.base.total, 0); assert.equal(result.overtime.people, 0);
  assert.ok(result.hiring.count > 0); assert.equal(result.hiring.remaining, 0);
});
