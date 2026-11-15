import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, validateScenario, restIsValid, buildDemand, WEEK, DAY, toMinutes } from '../src/engine.ts';
import { defaultScenario } from '../src/defaults.ts';

function weekdayScenario() {
  const scenario = defaultScenario('cnc');
  scenario.employees = 1;
  scenario.days.forEach((day, index) => { day.bands = [{ id: String(index), open: '08:00', close: '18:00', people: index < 5 ? 1 : 0 }]; });
  return scenario;
}

test('42h allocates 8h24 on five days without manufacturing overtime', () => {
  const result = calculate(weekdayScenario(), 42);
  assert.equal(result.workers[0].minutes, 2520);
  assert.equal(result.workers[0].shifts.length, 5);
  assert.ok(result.workers[0].shifts.every(shift => shift.workMinutes === 504));
  assert.equal(result.coveredHours, 42);
  assert.equal(result.gap, 8);
  assert.equal(result.divisor, 210);
});

test('40h allocates eight hours, with a distinct coverage result', () => {
  const scenario = weekdayScenario();
  const first = calculate(scenario, 42); const second = calculate(scenario, 40);
  assert.equal(second.coveredHours, 40); assert.equal(second.gap, 10);
  assert.equal(second.divisor, 200); assert.notEqual(first.gap, second.gap);
});

test('existing smaller journeys are preserved', () => {
  const scenario = weekdayScenario(); scenario.currentHours = 30;
  for (const stage of [42, 40] as const) {
    const result = calculate(scenario, stage);
    assert.equal(result.target, 30); assert.equal(result.lostHours, 0);
    assert.equal(result.hourlyIncrease, 0); assert.ok(result.workers[0].minutes <= 1800);
  }
});

test('meal breaks create a coverage gap and are not treated as productive time', () => {
  const scenario = weekdayScenario();
  const result = calculate(scenario, 42); const shift = result.workers[0].shifts[0];
  assert.equal(shift.breakMinutes, 60);
  for (let minute = shift.breakStart; minute < shift.breakStart + 60; minute++) assert.equal(result.coverage[minute], 0);
});

test('intermediate lengths use valid break thresholds', () => {
  for (const span of [240, 255, 300, 360, 375, 400, 420, 421, 480, 600]) {
    const scenario = weekdayScenario();
    scenario.days.forEach(day => { day.bands[0].close = `${String(Math.floor((480 + span) / 60)).padStart(2, '0')}:${String((480 + span) % 60).padStart(2, '0')}`; });
    const result = calculate(scenario, 42);
    for (const shift of result.workers[0].shifts) {
      assert.ok(shift.workMinutes <= 504);
      if (shift.workMinutes > 360) assert.ok(shift.breakMinutes >= 60);
      if (shift.workMinutes > 240 && shift.workMinutes <= 360) assert.ok(shift.breakMinutes >= 15);
      assert.equal(shift.end - shift.start, shift.workMinutes + shift.breakMinutes);
    }
  }
});

test('30-minute interval requires collective confirmation', () => {
  const scenario = weekdayScenario(); scenario.interval = 30;
  assert.ok(validateScenario(scenario).some(error => error.includes('30 minutos')));
  scenario.collective = 'sim'; assert.deepEqual(validateScenario(scenario), []);
});

test('overlapping bands are rejected, including cross-week boundaries', () => {
  const scenario = weekdayScenario();
  scenario.days[0].bands.push({ id: 'overlap', open: '10:00', close: '12:00', people: 1 });
  assert.ok(validateScenario(scenario).some(error => error.includes('sobrepostos')));
  const overnight = weekdayScenario(); overnight.days[6].bands[0] = { id: 'sun', open: '22:00', close: '09:00', people: 1 };
  assert.ok(validateScenario(overnight).some(error => error.includes('sobrepostos')));
});

test('overnight operation wraps demand accurately', () => {
  const scenario = weekdayScenario(); scenario.days.forEach(day => day.bands[0].people = 0);
  scenario.days[6].bands[0] = { id: 'sun', open: '22:00', close: '02:00', people: 3 };
  const demand = buildDemand(scenario);
  assert.equal(demand[6 * DAY + 22 * 60], 3); assert.equal(demand[0], 3);
  assert.equal(demand[120], 0);
  assert.equal(demand.reduce((total, count) => total + count, 0) / 60, 12);
});

test('identical opening and closing times mean 24-hour operation', () => {
  const scenario = weekdayScenario(); scenario.days.forEach(day => day.bands[0].people = 0);
  scenario.days[0].bands[0] = { id: '24h', open: '00:00', close: '00:00', people: 2 };
  assert.equal(buildDemand(scenario).reduce((total, value) => total + value, 0) / 60, 48);
});

test('empty demand is finite and does not claim costs or active shifts', () => {
  const scenario = weekdayScenario(); scenario.days.forEach(day => day.bands[0].people = 0);
  const result = calculate(scenario, 42);
  assert.equal(result.gap, 0); assert.equal(result.partialCost, 0); assert.equal(result.coveragePercent, 100);
  assert.equal(result.fullCount, 0); assert.equal(result.workers[0].shifts.length, 0);
});

test('cost formulas and indivisible headcount are consistent', () => {
  const scenario = weekdayScenario(); const result = calculate(scenario, 42);
  assert.equal(result.fullCount, 1); assert.equal(result.fullCost, 3080);
  assert.ok(Math.abs(result.partialCost - 8 / 42 * 3080) < 1e-8);
  assert.equal(result.partialCount, 1); assert.equal(result.partialHours, 8);
  assert.ok(Math.abs(result.overtimeCost - 8 * 5 * (2200 / 210) * 1.5 * 1.2 * 1.4) < 1e-8);
});

test('untrusted inputs reject oversized, missing, negative and non-finite values', () => {
  for (const value of [null, {}, { ...weekdayScenario(), employees: 1.5 }, { ...weekdayScenario(), salary: Infinity }, { ...weekdayScenario(), employees: 101 }, { ...weekdayScenario(), charges: -1 }, { ...weekdayScenario(), extraRate: 49 }, { ...weekdayScenario(), days: [] }]) assert.ok(validateScenario(value).length);
  assert.throws(() => toMinutes('25:00')); assert.throws(() => toMinutes('8:00'));
});

test('generated schedules respect cyclic rest and contractual limits for all presets', () => {
  for (const preset of ['rural', 'cnc'] as const) for (const stage of [42, 40] as const) {
    const scenario = defaultScenario(preset); const result = calculate(scenario, stage);
    assert.ok(result.coveredHours <= result.demandedHours);
    assert.ok(result.gap + result.coveredHours === result.demandedHours);
    for (const worker of result.workers) {
      assert.ok(worker.shifts.length <= 5); assert.ok(worker.minutes <= result.target * 60);
      assert.ok(restIsValid(worker.shifts));
    }
  }
});

test('cyclic rest rejects Sunday-to-Monday violations', () => {
  const shift = { day: 0, start: 0, end: 480, breakStart: 240, breakMinutes: 0, workMinutes: 480 };
  assert.equal(restIsValid([shift, { ...shift, day: 6, start: WEEK - 600, end: WEEK - 120, breakStart: WEEK - 360 }]), false);
});

test('random valid scenarios preserve worker and coverage invariants', () => {
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let iteration = 0; iteration < 24; iteration++) {
    const scenario = defaultScenario(); scenario.employees = 1 + Math.floor(random() * 12); scenario.currentHours = [20, 30, 36, 40, 44][Math.floor(random() * 5)];
    scenario.days.forEach(day => { const opening = 5 + Math.floor(random() * 5); const span = 4 + Math.floor(random() * 11); day.bands = [{ id: String(random()), open: `${String(opening).padStart(2, '0')}:00`, close: `${String(opening + span).padStart(2, '0')}:00`, people: Math.floor(random() * 8) }]; });
    for (const stage of [42, 40] as const) {
      const result = calculate(scenario, stage);
      assert.ok(Number.isFinite(result.gap));
      for (const worker of result.workers) {
        assert.ok(restIsValid(worker.shifts)); assert.ok(worker.minutes <= result.target * 60);
        for (const shift of worker.shifts) assert.ok(shift.workMinutes <= result.dailyCap);
      }
      for (let minute = 0; minute < WEEK; minute++) assert.ok(result.coverage[minute] >= 0 && result.coverage[minute] <= scenario.employees);
    }
  }
});
