import { employmentSettings, payrollCost, validateEmploymentSettings } from './payroll.ts';
import type { Calculation, Scenario, Shift, Worker } from './types.ts';
import { MAX_WEEK_DAYS } from './week.ts';

export const DAY = 1440;
export const WEEK = 7 * DAY;
export const legalReviewDate = '2026-11-15';
export const legalSources = {
  decision: 'https://portal.stf.jus.br/processos/downloadPeca.asp?ext=.pdf&id=15392248508',
  stf: 'https://noticias.stf.jus.br/postsnoticias/stf-mantem-regra-de-transicao-para-implementacao-da-jornada-5x2',
  docket: 'https://portal.stf.jus.br/processos/abaAndamentos.asp?incidente=7740896',
  amendment: 'https://legis.senado.leg.br/norma/44184944',
  clt: 'https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.pdf',
  rural: 'https://www2.camara.leg.br/legin/fed/lei/1970-1979/lei-5889-8-junho-1973-357971-normaatualizada-pl.html',
  cnc: 'https://portaldocomercio.org.br/calculadora-5x2/',
};

export function toMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Horário inválido. Use HH:MM.');
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function clockTime(minutes: number): string {
  const value = ((minutes % DAY) + DAY) % DAY;
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

export function duration(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? (minutes % 60).toString().padStart(2, '0') : ''}`;
}

/** Validate imported files as untrusted input, including cross-midnight overlap. */
export function validateScenario(input: unknown): string[] {
  if (!input || typeof input !== 'object') return ['Arquivo de cenário inválido.'];
  const data = input as Record<string, unknown>;
  const errors: string[] = [];
  const numeric: Array<[string, number, number, boolean]> = [
    ['employees', 0, 100, true], ['currentHours', 1, 44, false], ['salary', 1, 1000000, false],
    ['charges', 0, 300, false], ['extraRate', 50, 300, false], ['dsrRate', 0, 100, false],
    ['monthlyWeeks', 4, 5, false],
  ];
  const labels: Record<string, string> = { employees: 'Empregados (0 a 100, inteiro)', currentHours: 'Jornada atual (1 a 44h)', salary: 'Salário (R$ 1 a R$ 1 milhão)', charges: 'Encargos (0 a 300%)', extraRate: 'Adicional de HE (50 a 300%)', dsrRate: 'Reflexo DSR (0 a 100%)', monthlyWeeks: 'Fator mensal (4 a 5)' };
  for (const [key, min, max, integer] of numeric) {
    const value = data[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) errors.push(labels[key]);
  }
  if (data.planning !== undefined) errors.push(...validateEmploymentSettings(data.planning));
  if (data.version !== 1) errors.push('Versão de cenário não suportada.');
  for (const [key, options] of Object.entries({ sector: ['rural', 'comercio', 'servicos', 'industria', 'educacao', 'beneficente'], scale: ['6x1', '5x2', '12x36', 'turnos'], collective: ['nao', 'sim', 'nao-sei'], interval: [30, 60, 90, 120] })) {
    if (!(options as unknown[]).includes(data[key])) errors.push(`Opção inválida: ${key}.`);
  }
  for (const key of ['name', 'state', 'city', 'collectiveRef']) {
    if (typeof data[key] !== 'string' || (data[key] as string).length > 250) errors.push(`Texto inválido: ${key}.`);
  }
  if (typeof data.state === 'string' && !/^[A-Z]{2}$/.test(data.state)) errors.push('UF inválida.');
  for (const key of ['insalubrious', 'publicContract']) if (typeof data[key] !== 'boolean') errors.push(`Opção inválida: ${key}.`);
  if (!Array.isArray(data.days) || data.days.length !== MAX_WEEK_DAYS) return [...errors, 'A semana está limitada aos sete dias, de segunda a domingo.'];
  const occupied = new Uint8Array(WEEK);
  for (const [dayIndex, rawDay] of data.days.entries()) {
    if (!rawDay || typeof rawDay !== 'object' || !Array.isArray(rawDay.bands) || rawDay.bands.length > 6) {
      errors.push(`Dia ${dayIndex + 1}: máximo de seis faixas.`); continue;
    }
    for (const band of rawDay.bands) {
      if (!band || typeof band !== 'object' || typeof band.id !== 'string' || typeof band.open !== 'string' || typeof band.close !== 'string' || !Number.isInteger(band.people) || band.people < 0 || band.people > 500) {
        errors.push(`Dia ${dayIndex + 1}: faixa inválida (0 a 500 pessoas).`); continue;
      }
      try {
        const start = toMinutes(band.open);
        let end = toMinutes(band.close);
        if (end <= start) end += DAY;
        if (band.people > 0) {
          let overlap = false;
          for (let minute = dayIndex * DAY + start; minute < dayIndex * DAY + end; minute++) {
            const index = minute % WEEK;
            if (occupied[index]) overlap = true;
            occupied[index] = 1;
          }
          if (overlap) errors.push(`Dia ${dayIndex + 1}: horários sobrepostos, inclusive após meia-noite.`);
        }
      } catch { errors.push(`Dia ${dayIndex + 1}: horário inválido.`); }
    }
  }
  if (data.interval === 30 && data.collective !== 'sim') errors.push('Intervalo de 30 minutos requer confirmação de instrumento coletivo aplicável.');
  return [...new Set(errors)];
}

export function buildDemand(scenario: Scenario): Float64Array {
  const demand = new Float64Array(WEEK);
  scenario.days.forEach((day, index) => day.bands.forEach(band => {
    if (!band.people) return;
    const start = index * DAY + toMinutes(band.open);
    let end = index * DAY + toMinutes(band.close);
    if (end <= start) end += DAY;
    for (let minute = start; minute < end; minute++) demand[minute % WEEK] = band.people;
  }));
  return demand;
}

function sum(values: Float64Array): number { return values.reduce((total, value) => total + value, 0); }

/** Exact minutes preserve 8h24. Search starts every 30 min plus band boundaries. */
function candidates(scenario: Scenario, day: number, cap: number): Shift[] {
  const bands = scenario.days[day].bands.filter(band => band.people > 0).map(band => {
    const start = toMinutes(band.open);
    let end = toMinutes(band.close);
    if (end <= start) end += DAY;
    return { start, end };
  });
  if (!bands.length) return [];
  const open = Math.min(...bands.map(band => band.start));
  const close = Math.max(...bands.map(band => band.end));
  const span = close - open;
  const pause = cap > 360 && span > 360 + scenario.interval ? scenario.interval : cap > 240 && span > 255 ? 15 : 0;
  const work = Math.min(cap, pause === 15 ? 360 : pause === 0 ? 240 : cap, span - pause);
  if (work <= 0) return [];
  const starts = new Set<number>([open, close - work - pause]);
  for (let start = open; start + work + pause <= close; start += 30) starts.add(start);
  for (const band of bands) if (band.start + work + pause <= close) starts.add(band.start);
  const result: Shift[] = [];
  for (const start of starts) {
    if (start < open || start >= DAY) continue;
    const lunchOptions: number[] = pause ? [Math.min(240, Math.round(work / 30) * 15)] : [work];
    if (pause) for (let offset = 120; offset <= Math.min(300, work - 60); offset += 30) lunchOptions.push(offset);
    for (const offset of new Set(lunchOptions)) result.push({ day, start: day * DAY + start, end: day * DAY + start + work + pause, breakStart: day * DAY + start + offset, breakMinutes: pause, workMinutes: work });
  }
  return result;
}

export function restIsValid(shifts: Shift[]): boolean {
  if (!shifts.length) return true;
  const sorted = [...shifts].sort((a, b) => a.start - b.start);
  const gaps = sorted.map((shift, index) => (sorted[(index + 1) % sorted.length].start + (index === sorted.length - 1 ? WEEK : 0)) - shift.end);
  return gaps.every(gap => gap >= 660) && gaps.some(gap => gap >= 2100);
}

function workRanges(shift: Shift): Array<[number, number]> {
  return [[shift.start, shift.breakStart], [shift.breakStart + shift.breakMinutes, shift.end]];
}

export function makeSchedule(scenario: Scenario, demand: Float64Array, dailyCap: number, stopWhenCovered = false, flexibleShifts = false): { workers: Worker[]; coverage: Float64Array } {
  const coverage = new Float64Array(WEEK);
  const workers: Worker[] = [];
  const caps = flexibleShifts ? [...new Set([dailyCap, 360, 240, 120, 60].filter(cap => cap <= dailyCap))] : [dailyCap];
  const options = scenario.days.map((_, day) => caps.flatMap(cap => candidates(scenario, day, cap)));
  function bestAllocation(): Shift[] {
    // Prefix sums score candidate shifts without rescanning every work minute.
    const prefix = new Float64Array(WEEK + 2 * DAY + 1);
    for (let minute = 0; minute < prefix.length - 1; minute++) {
      const deficit = Math.max(0, demand[minute % WEEK] - coverage[minute % WEEK]);
      // Coverage minutes are primary; an exact tie favors the most understaffed times.
      // The fractional tie-break never outweighs one minute of actual coverage.
      prefix[minute + 1] = prefix[minute] + (deficit > 0 ? 1 + deficit / (WEEK * 501) : 0);
    }
    const bestByDay = options.map(shifts => {
      let best: Shift | undefined; let bestScore = 0;
      for (const shift of shifts) {
        const score = workRanges(shift).reduce((total, [start, end]) => total + prefix[end] - prefix[start], 0);
        if (score > bestScore) { bestScore = score; best = shift; }
      }
      return { shift: best, score: bestScore };
    });
    let bestShifts: Shift[] = []; let bestScore = 0;
    // Two consecutive days off, including week boundaries; deliberately conservative.
    for (let firstOff = 0; firstOff < 7; firstOff++) {
      const chosen = bestByDay.flatMap((candidate, day) => day !== firstOff && day !== (firstOff + 1) % 7 && candidate.shift ? [candidate.shift] : []);
      const score = chosen.reduce((total, shift) => total + bestByDay[shift.day].score, 0);
      if (score > bestScore && restIsValid(chosen)) { bestScore = score; bestShifts = chosen; }
    }
    return bestShifts;
  }
  function apply(shifts: Shift[], change: number) {
    for (const shift of shifts) for (const [start, end] of workRanges(shift)) for (let minute = start; minute < end; minute++) coverage[minute % WEEK] += change;
  }
  function gain(shifts: Shift[]) {
    let covered = 0;
    for (const shift of shifts) for (const [start, end] of workRanges(shift)) for (let minute = start; minute < end; minute++) if (coverage[minute % WEEK] < demand[minute % WEEK]) covered++;
    return covered;
  }
  for (let worker = 0; worker < scenario.employees; worker++) {
    const shifts = bestAllocation();
    if (stopWhenCovered && !shifts.length) break;
    apply(shifts, 1);
    workers.push({ number: worker + 1, shifts, minutes: shifts.reduce((total, shift) => total + shift.workMinutes, 0) });
  }
  // Revisit early choices after seeing the full team to improve break and day-off staggering.
  for (let pass = 0; pass < 2; pass++) for (const worker of workers) {
    apply(worker.shifts, -1);
    const proposed = bestAllocation();
    if (gain(proposed) >= gain(worker.shifts)) worker.shifts = proposed;
    worker.minutes = worker.shifts.reduce((total, shift) => total + shift.workMinutes, 0);
    apply(worker.shifts, 1);
  }
  return { workers, coverage };
}

export function calculate(scenario: Scenario, stage: 42 | 40): Calculation {
  const errors = validateScenario(scenario);
  if (errors.length) throw new Error(errors.join(' '));
  const target = Math.min(scenario.currentHours, stage);
  const dailyCap = Math.min(stage === 42 ? 504 : 480, Math.floor(target * 60 / 5));
  const demand = buildDemand(scenario);
  const { workers, coverage } = makeSchedule(scenario, demand, dailyCap);
  const demandedHours = sum(demand) / 60;
  const coveredHours = demand.reduce((total, needed, index) => total + Math.min(needed, coverage[index]), 0) / 60;
  const gap = Math.max(0, demandedHours - coveredHours);
  const availableHours = scenario.employees * target;
  const divisor = target * 5;
  const p = employmentSettings(scenario);
  const baseSalary = scenario.planning ? Math.max(scenario.salary, p.salaryFloor) : scenario.salary;
  const loadedSalary = payrollCost(baseSalary, 1, p).total;
  const fullCount = Math.ceil((gap - 1e-8) / target);
  const partialCap = Math.min(30, target);
  const partialCount = Math.max(0, Math.ceil((gap - 1e-8) / partialCap));
  const overtimeMonthlyHours = gap * scenario.monthlyWeeks;
  return {
    stage, target, dailyCap, demand, coverage, workers, demandedHours, coveredHours, gap,
    capacityGap: Math.max(0, demandedHours - availableHours),
    lostHours: scenario.employees * (scenario.currentHours - target), availableHours,
    usedHours: workers.reduce((total, worker) => total + worker.minutes, 0) / 60,
    coveragePercent: demandedHours ? coveredHours / demandedHours * 100 : 100,
    divisor, hourlyIncrease: (scenario.currentHours / target - 1) * 100,
    fullCount: Math.max(0, fullCount), partialCount, partialHours: partialCount ? gap / partialCount : 0,
    fullCost: Math.max(0, fullCount) * loadedSalary, partialCost: gap / target * loadedSalary,
    overtimeMonthlyHours,
    overtimeCost: payrollCost(overtimeMonthlyHours * (baseSalary / divisor) * (1 + scenario.extraRate / 100) * (1 + scenario.dsrRate / 100), 0, p, 'monthly', false).total,
  };
}

export function hourCoverage(result: Calculation, day: number, hour: number) {
  let demand = 0; let covered = 0;
  for (let minute = day * DAY + hour * 60; minute < day * DAY + (hour + 1) * 60; minute++) {
    demand += result.demand[minute]; covered += Math.min(result.demand[minute], result.coverage[minute]);
  }
  return { demand: demand / 60, covered: covered / 60, ratio: demand ? covered / demand : 1 };
}
