import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultScenario } from '../src/defaults.ts';
import { calculate, DAY, validateScenario } from '../src/engine.ts';
import { MAX_WEEK_DAYS, removeOperatingDay, restoreOperatingDay } from '../src/week.ts';

test('excluding a day removes its entire demand without shifting the calendar', () => {
  const scenario = defaultScenario();
  scenario.days = removeOperatingDay(scenario.days, 0);
  const result = calculate(scenario, 42);
  assert.equal(scenario.days.length, MAX_WEEK_DAYS);
  assert.equal(scenario.days[0].bands.length, 0);
  assert.equal(scenario.days[1].name, 'Terça');
  assert.equal(result.demand.slice(0, DAY).reduce((sum, count) => sum + count, 0), 0);
  assert.ok(result.demand[DAY + 9 * 60] > 0);
  assert.ok(result.workers.every(worker => worker.shifts.every(shift => shift.day !== 0)));
});

test('restoring a day cannot duplicate it and starts without additional demand', () => {
  const original = defaultScenario().days;
  const deleted = removeOperatingDay(original, 2);
  const restored = restoreOperatingDay(deleted, 2);
  assert.equal(restored.length, 7);
  assert.equal(restored[2].name, 'Quarta');
  assert.equal(restored[2].bands[0].people, 0);
  assert.equal(restoreOperatingDay(restored, 2), restored);
  assert.equal(original[2].bands[0].people, 9);
  assert.throws(() => restoreOperatingDay(restored, 7));
  assert.throws(() => restoreOperatingDay(restored, -1));
});

test('the seven-day limit applies to current, transitional and final weekly hours', () => {
  for (const hours of [44, 42, 40]) {
    const scenario = defaultScenario();
    scenario.currentHours = hours;
    scenario.days.push({ name: 'Oitavo dia', bands: [] });
    assert.ok(validateScenario(scenario).some(error => error.includes('sete dias')));
    assert.throws(() => removeOperatingDay(scenario.days, 0));
  }
});

test('excluded days survive JSON export/import, including a week with no operating days', () => {
  const scenario = defaultScenario();
  for (let day = 0; day < 7; day++) scenario.days = removeOperatingDay(scenario.days, day);
  const imported = JSON.parse(JSON.stringify(scenario));
  assert.deepEqual(validateScenario(imported), []);
  assert.equal(calculate(imported, 40).demandedHours, 0);
  for (let day = 0; day < 7; day++) imported.days = restoreOperatingDay(imported.days, day);
  assert.equal(imported.days.filter((day: { bands: unknown[] }) => day.bands.length).length, 7);
});
