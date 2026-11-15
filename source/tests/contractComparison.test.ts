import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultScenario } from '../src/defaults.ts';
import { calculate, validateScenario } from '../src/engine.ts';
import { compareAllContracts, applyComparisonOption, contractVariants } from '../src/contractComparison.ts';
import { planHiring } from '../src/staffing.ts';

function readyScenario() {
  const scenario = defaultScenario();
  scenario.planning!.taxConfirmed = true;
  scenario.planning!.overtimeAuthorized = true;
  return scenario;
}

test('all six contract types and their partial variations are displayed together', () => {
  const scenario = readyScenario(); const result = compareAllContracts(scenario, calculate(scenario, 42));
  assert.equal(result.rows.length, 9);
  assert.deepEqual(new Set(result.rows.map(row => row.variant.contract)), new Set(['indefinite', 'partial', 'harvest', 'experience', 'intermittent', 'short']));
  for (const row of result.rows) {
    assert.ok(Number.isFinite(row.hiring.addedCost)); assert.ok(Number.isFinite(row.hybrid.addedCost));
    assert.ok(row.hiring.addedCost >= 0); assert.ok(row.hybrid.addedCost >= 0);
  }
});

test('a cheaper but legally incompatible intermittent contract is not recommended', () => {
  const scenario = readyScenario(); const result = compareAllContracts(scenario, calculate(scenario, 42));
  const intermittent = result.rows.find(row => row.variant.contract === 'intermittent')!;
  assert.ok(intermittent.hybrid.addedCost < result.best!.addedCost);
  assert.ok(intermittent.legalReasons.length); assert.equal(intermittent.hybrid.eligible, false);
  assert.notEqual(result.best!.variant?.contract, 'intermittent');
  assert.equal(result.best!.id, 'partial-hybrid');
  assert.ok(result.candidates.every(option => option.eligible && !option.reasons.length && option.remaining < 1e-8));
});

test('the same demand and assumptions are preserved while comparing; caches do not change costs', () => {
  const scenario = readyScenario(); const original = JSON.stringify(scenario); const base = calculate(scenario, 40); const coverage = base.coverage.slice();
  const comparison = compareAllContracts(scenario, base);
  for (const row of comparison.rows) {
    const copy = { ...scenario, planning: { ...scenario.planning!, contract: row.variant.contract, partTime: row.variant.partTime } };
    const independent = planHiring(copy, base, base.coverage, { illustrateIneligible: true });
    assert.equal(row.hiring.hiring!.cost, independent.cost); assert.equal(row.hiring.newPeople, independent.count);
    assert.equal(row.hiring.remaining, independent.remaining);
  }
  assert.equal(JSON.stringify(scenario), original); assert.deepEqual(base.coverage, coverage);
});

test('probation for the same role and a period shorter than demand stay excluded', () => {
  const scenario = readyScenario(); scenario.planning!.priorSameRole = true;
  let result = compareAllContracts(scenario, calculate(scenario, 42));
  for (const row of result.rows.filter(row => row.variant.contract === 'experience')) assert.equal(row.hiring.eligible, false);
  scenario.planning!.priorSameRole = false; scenario.planning!.durationMonths = 4;
  result = compareAllContracts(scenario, calculate(scenario, 42));
  for (const row of result.rows.filter(row => row.variant.contract === 'experience')) assert.ok(row.legalReasons.some(reason => reason.includes('não cobre')));
});

test('overtime strategies require authorization and full coverage, while pure hiring stays comparable', () => {
  const scenario = readyScenario(); scenario.planning!.overtimeAuthorized = false;
  const comparison = compareAllContracts(scenario, calculate(scenario, 42));
  assert.ok(comparison.rows.every(row => !row.hybrid.eligible)); assert.equal(comparison.overtimeOnly.eligible, false);
  assert.equal(comparison.best!.kind, 'hiring');
  assert.ok(comparison.candidates.every(option => option.kind === 'hiring'));
});

test('unconfirmed taxes withhold a definitive winner without hiding illustrative costs', () => {
  const scenario = readyScenario(); scenario.planning!.taxConfirmed = false;
  const comparison = compareAllContracts(scenario, calculate(scenario, 42));
  assert.equal(comparison.best, undefined); assert.equal(comparison.tied.length, 0);
  assert.ok(comparison.rows.some(row => row.hiring.addedCost > 0));
});

test('applying the winning option preserves demand, salary, fiscal data and overtime comparison', () => {
  const scenario = readyScenario(); const comparison = compareAllContracts(scenario, calculate(scenario, 42));
  const applied = applyComparisonOption(scenario, comparison.best!);
  assert.deepEqual(applied.days, scenario.days); assert.equal(applied.salary, scenario.salary);
  assert.equal(applied.planning!.cpp, scenario.planning!.cpp); assert.equal(applied.planning!.need, scenario.planning!.need);
  assert.equal(applied.planning!.overtimeEnabled, true); assert.equal(applied.planning!.preferredStrategy, 'hybrid');
  assert.equal(applied.planning!.contract, comparison.best!.variant!.contract); assert.equal(validateScenario(applied).length, 0);
  const invalid = comparison.rows.find(row => row.variant.contract === 'intermittent')!.hiring;
  assert.throws(() => applyComparisonOption(scenario, invalid));
  const pure = comparison.rows.find(row => row.variant.contract === 'partial')!.hiring;
  const hiring = applyComparisonOption(scenario, pure);
  assert.equal(hiring.planning!.preferredStrategy, 'hiring'); assert.equal(hiring.planning!.overtimeEnabled, true);
});

test('a fully covered team is retained rather than recommending unnecessary contracts', () => {
  const scenario = readyScenario(); scenario.days.forEach(day => { day.bands = []; });
  const comparison = compareAllContracts(scenario, calculate(scenario, 42));
  assert.equal(comparison.best!.kind, 'current'); assert.equal(comparison.candidates.length, 1); assert.equal(comparison.best!.addedCost, 0);
});

test('lower monetary cost with incomplete coverage never wins; the reported saving uses an eligible comparator', () => {
  const scenario = readyScenario(); const comparison = compareAllContracts(scenario, calculate(scenario, 42));
  assert.ok(comparison.overtimeOnly.addedCost < comparison.best!.addedCost);
  assert.ok(comparison.overtimeOnly.remaining > 0); assert.equal(comparison.overtimeOnly.eligible, false);
  assert.ok(comparison.savingToNext > 0);
  const next = comparison.candidates.find(option => Math.round(option.totalCost * 100) > Math.round(comparison.best!.totalCost * 100))!;
  assert.equal(comparison.savingToNext, next.totalCost - comparison.best!.totalCost);
});

test('special arrangements and unreviewed unhealthy transitional hours cannot receive a global recommendation', () => {
  for (const kind of ['special', 'unhealthy']) {
    const scenario = readyScenario();
    if (kind === 'special') scenario.scale = '12x36'; else scenario.insalubrious = true;
    const comparison = compareAllContracts(scenario, calculate(scenario, 42));
    assert.equal(comparison.best, undefined); assert.equal(comparison.candidates.length, 0);
    assert.ok(comparison.rows.every(row => row.legalReasons.length > 0));
  }
});

test('ties highlight all equally priced eligible alternatives without inventing a saving between them', () => {
  const scenario = readyScenario(); scenario.currentHours = 30;
  const comparison = compareAllContracts(scenario, calculate(scenario, 40));
  assert.ok(comparison.best); assert.ok(comparison.tied.length >= 2);
  assert.ok(comparison.tied.every(option => Math.round(option.totalCost * 100) === Math.round(comparison.best!.totalCost * 100)));
  assert.ok(comparison.tied.every(option => option.eligible));
});
