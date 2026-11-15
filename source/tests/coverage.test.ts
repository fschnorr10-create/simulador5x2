import test from 'node:test';
import assert from 'node:assert/strict';
import { coverageSummary, coverageIntervals, visibleCoveragePercent, addWorkerCoverage } from '../src/coverage.ts';
import { WEEK, DAY, calculate } from '../src/engine.ts';
import { defaultScenario } from '../src/defaults.ts';
import { analyzeEmployment } from '../src/staffing.ts';

test('coverage distinguishes full, partial, zero and no demand without relying on color', () => {
  const demand = new Float64Array(WEEK), coverage = new Float64Array(WEEK);
  assert.equal(coverageSummary(demand, coverage, 0, 60).status, 'closed');
  demand.fill(4, 0, 60);
  assert.equal(coverageSummary(demand, coverage, 0, 60).status, 'empty');
  coverage.fill(2, 0, 60); const partial = coverageSummary(demand, coverage, 0, 60);
  assert.equal(partial.status, 'partial'); assert.equal(partial.ratio, .5); assert.equal(partial.gap, 2);
  coverage.fill(6, 0, 60); const full = coverageSummary(demand, coverage, 0, 60);
  assert.equal(full.status, 'covered'); assert.equal(full.covered, 4);
});

test('hour details show exact people and changing minutes rather than fractional average people', () => {
  const demand = new Float64Array(WEEK), coverage = new Float64Array(WEEK);
  demand.fill(9, 8 * 60, 9 * 60); coverage.fill(9, 8 * 60, 8 * 60 + 24); coverage.fill(8, 8 * 60 + 24, 9 * 60);
  const intervals = coverageIntervals(demand, coverage, 0, 8);
  assert.deepEqual(intervals, [{start:480,end:504,needed:9,available:9,missing:0},{start:504,end:540,needed:9,available:8,missing:1}]);
  const summary = coverageSummary(demand, coverage, 480, 540);
  assert.equal(summary.covered, 8.4); assert.equal(summary.gap, .6);
});

test('near-complete coverage cannot round to 100%, and low partial coverage cannot look empty', () => {
  const demand = new Float64Array(WEEK), coverage = new Float64Array(WEEK);
  demand.fill(500, 0, 60); coverage.fill(500, 0, 60); coverage[0] = 499;
  const summary = coverageSummary(demand, coverage, 0, 60);
  assert.equal(summary.status, 'partial'); assert.equal(visibleCoveragePercent(summary.ratio, summary.status), 99.9);
  assert.equal(visibleCoveragePercent(.00001, 'partial'), .1);
});

test('exact intervals include closed portions of a partially operating hour', () => {
  const demand = new Float64Array(WEEK), coverage = new Float64Array(WEEK);
  demand.fill(3, 30, 60); coverage.fill(3, 30, 60);
  assert.equal(coverageIntervals(demand, coverage, 0, 0).length, 2);
  assert.equal(coverageSummary(demand, coverage, 0, 60).status, 'covered');
});

test('daily coverage totals reconcile with the entire week, including overnight demand', () => {
  const s = defaultScenario(); s.days[6].bands = [{id:'overnight',open:'22:00',close:'02:00',people:2}];
  const result = calculate(s, 42); const week = coverageSummary(result.demand, result.coverage);
  const days = Array.from({length:7},(_,day)=>coverageSummary(result.demand,result.coverage,day*DAY,(day+1)*DAY));
  for (const key of ['needed','covered','gap'] as const) assert.ok(Math.abs(days.reduce((sum,day)=>sum+day[key],0)-week[key])<1e-8);
  assert.ok(Math.abs(week.covered-result.coveredHours)<1e-8);
});

test('new-hire map adds real productive shifts, subtracts breaks and preserves baseline arrays', () => {
  const s = defaultScenario(); s.planning!.overtimeAuthorized = true;
  const result = calculate(s,42), plan = analyzeEmployment(s,result); const original = result.coverage.slice();
  const expanded = addWorkerCoverage(result.coverage,plan.hiring.workers);
  const hybrid = addWorkerCoverage(plan.overtime.coverage,plan.complementary.workers);
  assert.deepEqual(result.coverage,original);
  assert.ok(Math.abs(coverageSummary(result.demand,expanded).gap-plan.hiring.remaining)<1e-8);
  assert.ok(Math.abs(coverageSummary(result.demand,hybrid).gap-plan.complementary.remaining)<1e-8);
});
