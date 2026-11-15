import type { Scenario, Shift, Worker } from './types.ts';
import { DAY, WEEK, clockTime, toMinutes } from './time.ts';
import { addDays, dateString, parseDate } from './periodDates.ts';

export interface DailyWorkHours { start: string; mealStart: string; mealEnd: string; end: string }
export interface PlannedDay extends DailyWorkHours { kind: 'work' | 'dsr' }
export interface WorkSchedule {
  mode: 'weekdays' | 'custom';
  cycleWeeks: 1 | 4;
  cycleStart: string;
  shownWeek: number;
  general: DailyWorkHours;
  weeks: PlannedDay[][];
}
export interface OperatingTemplate { open: string; close: string; people: number; days: number[]; exceptions: number[] }
const stageStart = (stage: 42 | 40) => new Date(Date.UTC(stage === 42 ? 2026 : 2027, 11, 16));
export function defaultWorkSchedule(scenario: Scenario, stage: 42 | 40): WorkSchedule {
  const work = Math.floor(Math.min(scenario.currentHours, stage) * 60 / 5);
  const pause = work > 360 ? scenario.interval : work > 240 ? 15 : 0;
  const general = { start: '08:00', mealStart: '12:00', mealEnd: clockTime(720 + pause), end: clockTime(480 + work + pause) };
  // Short shifts need their optional break to remain within the actual workday.
  if (work <= 240) general.mealStart = general.mealEnd = general.end;
  let start = stageStart(stage);
  while (start.getUTCDay() !== 1) start = addDays(start, 1);
  return { mode: 'weekdays', cycleWeeks: 1, cycleStart: dateString(start), shownWeek: 0, general,
    weeks: Array.from({ length: 4 }, () => Array.from({ length: 7 }, (_, day) => ({ ...general, kind: day < 5 ? 'work' : 'dsr' }))) };
}
export function dailyWork(day: DailyWorkHours) {
  try {
    const start = toMinutes(day.start);
    let end = toMinutes(day.end); if (end <= start) end += DAY;
    let mealStart = toMinutes(day.mealStart); if (mealStart < start) mealStart += DAY;
    let mealEnd = toMinutes(day.mealEnd); if (mealEnd < mealStart % DAY) mealEnd += DAY;
    if (mealEnd < mealStart) mealEnd += DAY;
    const pause = mealEnd - mealStart;
    const validMeal = !pause || (mealStart >= start && mealEnd <= end);
    return { start, end, mealStart, mealEnd, pause, work: end - start - pause, validMeal, validTime:true };
  } catch {
    // An incomplete native time field is an editable draft, not a reason to crash the form.
    return {start:0,end:0,mealStart:0,mealEnd:0,pause:0,work:0,validMeal:false,validTime:false};
  }
}
export function validateWorkSchedules(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Configuração de jornada inválida.'];
  const errors: string[] = [];
  for (const [stage, raw] of Object.entries(input)) {
    const p = raw as WorkSchedule;
    if (!['42', '40'].includes(stage) || !p || typeof p !== 'object' || !['weekdays', 'custom'].includes(p.mode) || ![1, 4].includes(p.cycleWeeks) || !Number.isInteger(p.shownWeek) || p.shownWeek < 0 || p.shownWeek >= p.cycleWeeks || !parseDate(p.cycleStart) || parseDate(p.cycleStart)!.getUTCDay() !== 1 || p.cycleStart < '2000-01-01' || p.cycleStart > '2100-12-31' || !Array.isArray(p.weeks) || p.weeks.length !== 4 || p.weeks.some(week => !Array.isArray(week) || week.length !== 7)) {
      errors.push('Configuração de jornada inválida.'); continue;
    }
    for (const day of [p.general, ...p.weeks.flat()]) {
      try {
        if (!day || typeof day !== 'object') throw new Error();
        for (const value of [day.start, day.mealStart, day.mealEnd, day.end]) toMinutes(value);
      } catch { errors.push('Revise os horários de entrada, almoço e saída.'); }
    }
    if (p.weeks.flat().some(day => !day || !['work', 'dsr'].includes(day.kind))) errors.push('Configuração de jornada inválida.');
  }
  return [...new Set(errors)];
}
export function validateOperatingTemplate(input: unknown): string[] {
  const p = input as OperatingTemplate;
  try {
    if (!p || typeof p !== 'object') throw new Error();
    toMinutes(p.open); toMinutes(p.close);
    if (!Number.isInteger(p.people) || p.people < 0 || p.people > 500) throw new Error();
    for (const list of [p.days, p.exceptions]) if (!Array.isArray(list) || list.length > 7 || new Set(list).size !== list.length || list.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error();
    return [];
  } catch { return ['Revise o horário geral da semana.']; }
}
export function applyOperatingTemplate(scenario: Scenario, template: OperatingTemplate): Scenario {
  const errors = validateOperatingTemplate(template); if (errors.length) throw new Error(errors[0]);
  return { ...scenario, operatingTemplate: template, days: scenario.days.map((day, index) => template.days.includes(index) && !template.exceptions.includes(index) ? { ...day, bands: [{ id: `general-${index}`, open: template.open, close: template.close, people: template.people }] } : day) };
}
export function workScheduleShifts(plan: WorkSchedule): Shift[] {
  const shifts: Shift[] = [];
  for (let week = 0; week < plan.cycleWeeks; week++) for (let day = 0; day < 7; day++) {
    const entry = plan.weeks[week][day]; if (entry.kind === 'dsr') continue;
    const hours = dailyWork(entry); if (!hours.validMeal || hours.work <= 0) continue;
    const offset = week * WEEK + day * DAY;
    shifts.push({ day: week * 7 + day, start: offset + hours.start, end: offset + hours.end, breakStart: offset + (hours.pause ? hours.mealStart : hours.end), breakMinutes: hours.pause, workMinutes: hours.work });
  }
  return shifts;
}

/** Legal review flags are separate from structural input validation, so a proposed plan remains editable. */
export function assessWorkSchedule(scenario: Scenario, stage: 42 | 40) {
  const plan = scenario.workSchedules?.[stage];
  const issues: string[] = [], notices: string[] = [];
  if (!plan) return { issues, notices, requiresCollective: false, weeklyMinutes: [] as number[], restDays: 0, sundayGap: 0 };
  const days = plan.weeks.slice(0, plan.cycleWeeks).flat();
  const target = Math.min(scenario.currentHours, stage) * 60;
  const weeklyMinutes = plan.weeks.slice(0, plan.cycleWeeks).map(week => week.reduce((sum, day) => sum + (day.kind === 'work' ? Math.max(0, dailyWork(day).work) : 0), 0));
  const restDays = days.filter(day => day.kind === 'dsr').length;
  const workDays = days.filter(day => day.kind === 'work');
  const dinoException = stage === 42 && workDays.some(day => dailyWork(day).work > 480) && plan.cycleWeeks === 1 && workDays.length === 5 && restDays === 2 && weeklyMinutes[0] <= target && workDays.every(day => dailyWork(day).work <= 504);
  const ordinaryCompensation = workDays.some(day => dailyWork(day).work > 480) && !dinoException;
  const customRest = plan.cycleWeeks === 4 || plan.weeks[0].some((day, index) => (day.kind === 'dsr') !== (index >= 5));
  const shortLunch = workDays.some(day => { const h = dailyWork(day); return h.work > 360 && h.pause >= 30 && h.pause < 60; });
  const requiresCollective = ordinaryCompensation || customRest || shortLunch;
  if (requiresCollective && (scenario.collective !== 'sim' || !scenario.collectiveRef.trim())) issues.push('É necessário ACT ou CCT aplicável e referência do documento para esta compensação de jornada ou DSR.');
  if (requiresCollective) notices.push('Distribuição personalizada: ACT/CCT necessário. A confirmação não dispensa conferir conteúdo, vigência e categoria.');
  if (dinoException) notices.push('A distribuição de até 8h24 em cinco dias pode usar a exceção da liminar na etapa de 42h, se não houver ACT/CCT celebrado até 15/12/2026. Havendo instrumento, conferir suas cláusulas.');
  if (dinoException && scenario.collective === 'nao-sei') issues.push('Confirme se existe ACT/CCT aplicável antes de utilizar a exceção de 8h24 da liminar.');
  if (dinoException && scenario.collective === 'sim' && !scenario.collectiveRef.trim()) issues.push('Informe a referência e confira as cláusulas do ACT/CCT vigente para a distribuição de 42h.');
  if (!workDays.length) issues.push('O plano não possui dias de trabalho.');
  if (weeklyMinutes.reduce((a, b) => a + b, 0) > target * plan.cycleWeeks) issues.push('A carga planejada supera o limite médio da etapa. ACT/CCT não elimina o excesso: reveja a jornada, a compensação ou as horas extras.');
  if (restDays < 2 * plan.cycleWeeks) issues.push('O ciclo não preserva a quantidade de dois DSR por semana de referência. Acrescente os descansos compensatórios.');
  for (const day of workDays) {
    const h = dailyWork(day);
    if (!h.validTime) issues.push('Revise os horários de entrada, almoço e saída.');
    if (!h.validMeal || h.work <= 0) issues.push('O almoço deve ficar dentro da jornada e a duração do trabalho deve ser positiva.');
    if (h.work > 600) issues.push('A jornada excede o limite conservador de 10h de trabalho por dia deste simulador.');
    if (h.pause > 120 || (h.work > 360 && h.pause < 30) || (h.work > 240 && h.work <= 360 && h.pause < 15)) issues.push('O intervalo informado não atende às premissas mínimas do simulador. Revise a duração do almoço ou da pausa.');
    if (h.pause && (h.mealStart - h.start > 360 || h.end - h.mealEnd > 360)) issues.push('Há mais de seis horas contínuas de trabalho antes ou depois do intervalo.');
  }
  const shifts = workScheduleShifts(plan);
  const cycleMinutes = plan.cycleWeeks * WEEK;
  for (let i = 0; i < shifts.length; i++) {
    const nextStart = shifts[(i + 1) % shifts.length].start + (i === shifts.length - 1 ? cycleMinutes : 0);
    if (nextStart - shifts[i].end < 660) issues.push('O plano não preserva 11h entre jornadas, inclusive na passagem entre ciclos.');
  }
  days.forEach((day, index) => {
    if (day.kind !== 'dsr') return;
    const overlaps = shifts.some(shift => [shift, { ...shift, start: shift.start - cycleMinutes, end: shift.end - cycleMinutes }].some(s => s.start < (index + 1) * DAY && s.end > index * DAY));
    if (overlaps) issues.push('Um DSR marcado é atingido por uma jornada noturna do dia anterior. Reserve o dia integral de descanso ou revise o regime.');
  });
  const sundays = days.flatMap((day, index) => index % 7 === 6 && day.kind === 'dsr' ? [index] : []);
  const sundayGap = sundays.length ? Math.max(...sundays.map((day, index) => (sundays[(index + 1) % sundays.length] + (index === sundays.length - 1 ? days.length : 0)) - day)) : Infinity;
  if (sundayGap > 28) issues.push('O plano não garante um domingo de descanso em cada mês na repetição do ciclo. Reserve ao menos um domingo a cada quatro semanas.');
  if (scenario.sector === 'comercio' && sundayGap > 21) issues.push('No comércio, confira o repouso dominical no máximo a cada três semanas e as demais regras aplicáveis.');
  notices.push('Um domingo de descanso por mês é uma premissa deste planejamento. A categoria, a norma coletiva e regras específicas podem exigir frequência maior.');
  if (plan.cycleWeeks === 4) {
    notices.push('A decisão permite negociar a distribuição dos DSR sem as antigas travas de semana ou mês, preservando todos os repousos. O ciclo de quatro semanas é apenas a janela de planejamento exibida.');
    notices.push('No ciclo compensatório, o mapa mostra a semana selecionada e a referência mensal por volume usa a lacuna média de todas as semanas. A viabilidade de horas extras exige apuração específica do ciclo.');
  }
  const start = parseDate(plan.cycleStart)!;
  if (start < stageStart(stage)) issues.push('A data do ciclo é anterior à vigência desta etapa. Revise o início do planejamento.');
  if (stage === 42 && addDays(start, days.length - 1) >= stageStart(40)) issues.push('O ciclo atravessa a mudança para 40h. Divida o planejamento ou aplique o menor limite.');
  return { issues: [...new Set(issues)], notices: [...new Set(notices)], requiresCollective, weeklyMinutes, restDays, sundayGap };
}

export function buildWorkSchedule(scenario: Scenario, stage: 42 | 40): { workers: Worker[]; coverage: Float64Array; cycleCoverage: Float64Array } | undefined {
  const plan = scenario.workSchedules?.[stage]; if (!plan) return undefined;
  const allShifts = workScheduleShifts(plan), offset = plan.shownWeek * WEEK;
  const selected = allShifts.filter(shift => shift.day >= plan.shownWeek * 7 && shift.day < (plan.shownWeek + 1) * 7).map(shift => ({ ...shift, day: shift.day - plan.shownWeek * 7, start: shift.start - offset, end: shift.end - offset, breakStart: shift.breakStart - offset }));
  const coverage = new Float64Array(WEEK), cycle = new Float64Array(plan.cycleWeeks * WEEK);
  for (const shift of allShifts) for (const [start, end] of [[shift.start, shift.breakStart], [shift.breakStart + shift.breakMinutes, shift.end]]) for (let minute = start; minute < end; minute++) cycle[minute % cycle.length] += scenario.employees;
  coverage.set(cycle.subarray(offset, offset + WEEK));
  const minutes = selected.reduce((sum, shift) => sum + shift.workMinutes, 0);
  return { workers: Array.from({ length: scenario.employees }, (_, index) => ({ number: index + 1, shifts: selected.map(shift => ({ ...shift })), minutes })), coverage, cycleCoverage: cycle };
}
