import type { Calculation, Scenario, Shift, Worker } from './types.ts';
import { DAY, WEEK, makeSchedule, restIsValid } from './engine.ts';
import type { PayrollCost } from './payroll.ts';
import { contractIssues, employmentSettings, payrollCost } from './payroll.ts';

export interface OvertimeAssignment { employee: number; day: number; before: number; after: number; extraMinutes: number; ordinaryMinutes: number }
export interface OvertimePlan {
  assignments: OvertimeAssignment[];
  coverage: Float64Array;
  workers: Worker[];
  extraHours: number;
  ordinaryHours: number;
  cost: number;
  remaining: number;
  people: number;
  reasons: string[];
}
export interface HiringPlan { count: number; weeklyHours: number; cost: number; remaining: number; workers: Worker[]; blocked: string[]; payroll?: PayrollCost }
const residualDemand = (demand: Float64Array, coverage: Float64Array) => Float64Array.from(demand, (needed, i) => Math.max(0, needed - coverage[i]));
const hoursOf = (array: Float64Array) => array.reduce((total, value) => total + value, 0) / 60;
const requiredBreak = (minutes: number, interval: number) => minutes > 360 ? interval : minutes > 240 ? 15 : 0;

/** Extends existing workdays only. It never allocates overtime on rest days or meal breaks. */
export function planOvertime(scenario: Scenario, result: Calculation): OvertimePlan {
  const p = employmentSettings(scenario);
  const coverage = result.coverage.slice();
  const workers = result.workers.map(worker => ({ ...worker, shifts: worker.shifts.map(shift => ({ ...shift })) }));
  const assignments: OvertimeAssignment[] = [];
  const reasons: string[] = [...(result.scheduleIssues ?? [])];
  if ((result.cycleWeeks ?? 1) > 1) reasons.push('Ciclo compensatório: horas extras precisam de apuração do ciclo completo; o valor por volume é apenas referência.');
  if (!p.overtimeEnabled) reasons.push('Horas extras desativadas neste cenário.');
  if (!p.overtimeAuthorized) reasons.push('Confirme o acordo de prorrogação e as autorizações aplicáveis antes de simular horas extras.');
  if (scenario.insalubrious && scenario.collective !== 'sim') reasons.push('Atividade insalubre: sem autorização coletiva confirmada, a simulação de prorrogação fica bloqueada para revisão.');
  if (scenario.scale === '12x36' || scenario.scale === 'turnos') reasons.push('O regime especial exige análise específica; horas extras não são dimensionadas automaticamente.');
  if (reasons.length) return { assignments, coverage, workers, extraHours: 0, ordinaryHours: 0, cost: 0, remaining: result.gap, people: 0, reasons };

  const ordinaryByWorker = new Map(workers.map(worker => [worker.number, worker.minutes]));
  for (const worker of workers) for (let index = 0; index < worker.shifts.length; index++) {
    const shift = worker.shifts[index];
    const dailyExtra = Math.floor(Math.min(2, p.overtimeDailyLimit) * 60);
    const maximumWork = Math.min(600, result.dailyCap + dailyExtra);
    const room = Math.max(0, maximumWork - shift.workMinutes);
    if (!room) continue;
    const beforeGain = new Float64Array(room + 1), afterGain = new Float64Array(room + 1);
    for (let amount = 1; amount <= room; amount++) {
      const beforeMinute = (shift.start - amount + WEEK) % WEEK;
      const afterMinute = (shift.end + amount - 1) % WEEK;
      beforeGain[amount] = beforeGain[amount - 1] + (result.demand[beforeMinute] > coverage[beforeMinute] ? 1 : 0);
      afterGain[amount] = afterGain[amount - 1] + (result.demand[afterMinute] > coverage[afterMinute] ? 1 : 0);
    }
    let best: { shift: Shift; before: number; after: number; gain: number } | undefined;
    // Whole-minute candidates preserve demand boundaries and the transitional 24 minutes.
    for (let total = 1; total <= room; total++) {
      if (requiredBreak(shift.workMinutes + total, scenario.interval) > shift.breakMinutes) continue;
      for (let before = 0; before <= total; before++) {
        const after = total - before;
        const gain = beforeGain[before] + afterGain[after];
        if (!gain || (best && gain <= best.gain)) continue;
        if (shift.start - before < shift.day * DAY) continue;
        if (shift.breakStart - (shift.start - before) > 360 || shift.end + after - (shift.breakStart + shift.breakMinutes) > 360) continue;
        const candidate = { ...shift, start: shift.start - before, end: shift.end + after, workMinutes: shift.workMinutes + total };
        const modified = worker.shifts.map((entry, i) => i === index ? candidate : entry);
        const ordinary = Math.max(0, Math.min(total, result.dailyCap - shift.workMinutes));
        if ((ordinaryByWorker.get(worker.number) ?? 0) + ordinary > result.target * 60 || !restIsValid(modified)) continue;
        best = { shift: candidate, before, after, gain };
      }
    }
    if (!best) continue;
    for (let minute = best.shift.start; minute < shift.start; minute++) coverage[(minute + WEEK) % WEEK]++;
    for (let minute = shift.end; minute < best.shift.end; minute++) coverage[minute % WEEK]++;
    const added = best.before + best.after;
    const ordinaryMinutes = Math.max(0, Math.min(added, result.dailyCap - shift.workMinutes));
    const extraMinutes = added - ordinaryMinutes;
    worker.shifts[index] = best.shift;
    worker.minutes += added;
    ordinaryByWorker.set(worker.number, (ordinaryByWorker.get(worker.number) ?? 0) + ordinaryMinutes);
    assignments.push({ employee: worker.number, day: shift.day, before: best.before, after: best.after, extraMinutes, ordinaryMinutes });
  }
  const extraHours = assignments.reduce((sum, item) => sum + item.extraMinutes, 0) / 60;
  const ordinaryHours = assignments.reduce((sum, item) => sum + item.ordinaryMinutes, 0) / 60;
  const baseSalary = scenario.planning ? Math.max(scenario.salary, p.salaryFloor) : scenario.salary;
  const pay = extraHours * scenario.monthlyWeeks * baseSalary / result.divisor * (1 + scenario.extraRate / 100) * (1 + scenario.dsrRate / 100);
  return { assignments, coverage, workers, extraHours, ordinaryHours, cost: payrollCost(pay, 0, p, 'monthly', false).total,
    remaining: hoursOf(residualDemand(result.demand, coverage)), people: new Set(assignments.filter(item => item.extraMinutes > 0).map(item => item.employee)).size, reasons };
}

/** Adds real proposed shifts until residual demand is covered, no improvement is possible, or 100 new workers are reached. */
export type HiringScheduleCache = Map<number, ReturnType<typeof makeSchedule>>;

export function planHiring(scenario: Scenario, result: Calculation, coverage = result.coverage, options: { illustrateIneligible?: boolean; cache?: HiringScheduleCache } = {}): HiringPlan {
  const p = employmentSettings(scenario);
  const blocked = contractIssues(p, scenario.sector);
  const demand = residualDemand(result.demand, coverage);
  const startingGap = hoursOf(demand);
  const target = p.contract === 'intermittent' ? Math.min(result.target, p.intermittentHours / scenario.monthlyWeeks) : (p.contract === 'partial' || p.partTime) ? Math.min(30, result.target) : result.target;
  if ((blocked.length && !options.illustrateIneligible) || !startingGap) return { count: 0, weeklyHours: target, cost: 0, remaining: startingGap, workers: [], blocked: startingGap ? blocked : [] };
  const daily = Math.floor(target * 60 / 5);
  if (daily < 1) return { count: 0, weeklyHours: target, cost: 0, remaining: startingGap, workers: [], blocked: ['A convocação informada é insuficiente para montar uma jornada.'] };
  const scheduled = options.cache?.get(daily) ?? makeSchedule({ ...scenario, employees: 100 }, demand, daily, true, true);
  options.cache?.set(daily, scheduled);
  const workers = scheduled.workers.filter(worker => worker.minutes > 0);
  const added = scheduled.coverage;
  const remaining = demand.reduce((sum, value, i) => sum + Math.max(0, value - added[i]), 0) / 60;
  const baseSalary = scenario.planning ? Math.max(scenario.salary, p.salaryFloor) : scenario.salary;
  const monthlyHours = workers.reduce((sum, worker) => sum + worker.minutes, 0) / 60 * scenario.monthlyWeeks;
  const remuneration = p.contract === 'intermittent' ? monthlyHours * baseSalary / result.divisor : workers.length * baseSalary * target / result.target;
  const payMode = p.contract === 'intermittent' ? 'intermittent' : p.contract === 'short' ? 'proportional' : p.contract === 'experience' || (p.contract === 'harvest' && p.durationMonths <= 12) ? 'term' : 'monthly';
  const payroll = payrollCost(remuneration, workers.length, p, payMode, true, true);
  return { count: workers.length, weeklyHours: target, cost: payroll.total, remaining, workers, blocked, payroll };
}

export function employmentContextIssues(scenario: Scenario, result: Calculation): string[] {
  const issues: string[] = [...(result.scheduleIssues ?? [])];
  if (scenario.scale === '12x36' || scenario.scale === 'turnos') issues.push('Regime especial: valide a migração e os limites próprios antes de indicar uma alternativa.');
  if (scenario.insalubrious && scenario.collective !== 'sim' && result.dailyCap > 480) issues.push('Atividade insalubre: valide a jornada da transição antes da indicação econômica.');
  return issues;
}

export function analyzeEmployment(scenario: Scenario, result: Calculation) {
  const p = employmentSettings(scenario);
  const salary = scenario.planning ? Math.max(scenario.salary, p.salaryFloor) : scenario.salary;
  const base = payrollCost(salary * scenario.employees, scenario.employees, p);
  const revenue = ['ruralRevenue', 'simples', 'simplesIV'].includes(p.taxProfile) ? p.monthlyRevenue * p.revenueRate / 100 : 0;
  const currentMonthly = base.total + p.otherMonthly + revenue;
  const overtime = planOvertime(scenario, result);
  const hiring = planHiring(scenario, result);
  const complementary = planHiring(scenario, result, overtime.coverage);
  const hybridCost = overtime.cost + complementary.cost;
  const hiringComplete = hiring.remaining < 1 / 60 && !hiring.blocked.length;
  const hybridComplete = complementary.remaining < 1 / 60 && !complementary.blocked.length && !overtime.reasons.length;
  const contextIssues = employmentContextIssues(scenario, result);
  const recommendation = contextIssues[0] ?? ((!p.taxConfirmed || (p.taxProfile === 'ruralRevenue' && (!p.monthlyRevenue || !p.revenueRate))) ? 'Confirme o enquadramento e as alíquotas para concluir a comparação econômica.' : result.gap < 1 / 60 ? 'A equipe cobre a demanda informada.' : !hiringComplete && !hybridComplete ? 'A cobertura integral ainda não foi encontrada. Revise a demanda, a modalidade e os horários.' : hybridComplete && (!hiringComplete || hybridCost < hiring.cost - .01) ? (overtime.extraHours < 1 / 60 ? 'Reorganizar horas ordinárias e complementar a equipe tem o menor custo estimado.' : complementary.count ? 'Combinar horas extras e contratação tem o menor custo estimado.' : 'Horas extras têm o menor custo estimado para esta cobertura.') : 'Contratar tem o menor custo estimado para esta cobertura.');
  return { p, salary, base, revenue, currentMonthly, overtime, hiring, complementary, hybridCost, hiringComplete, hybridComplete, recommendation, contextIssues,
    savings: hiringComplete && hybridComplete ? Math.abs(hiring.cost - hybridCost) : 0 };
}
