/** UTC calendar arithmetic avoids timezone and daylight-saving shifts in employment dates. */
export interface PeriodSettings {
  start: string;
  end: string;
  fixedEnd: string;
  exit: 'employer' | 'resignation' | 'continue';
  reciprocalClause: boolean;
}
const DAY_MS = 86400000;
export function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}
export const dateString = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
export const daysBetween = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / DAY_MS);
export function addMonths(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), last));
  return target;
}
export function defaultPeriod(months: number, today = new Date()): PeriodSettings {
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const whole = Math.floor(months);
  const end = addDays(addMonths(start, whole), Math.round((months - whole) * 30) - 1);
  return { start: dateString(start), end: dateString(end), fixedEnd: dateString(end), exit: 'employer', reciprocalClause: false };
}
export function validatePeriod(value: unknown): string[] {
  const p = value as PeriodSettings | undefined;
  if (!p || typeof p !== 'object') return ['Revise as datas e as condições de encerramento.'];
  const start = parseDate(p.start), end = parseDate(p.end), fixed = parseDate(p.fixedEnd);
  if (!start || !end || !fixed || start.getUTCFullYear() < 2000 || start.getUTCFullYear() > 2100 || end < start || fixed < start || daysBetween(start, end) > 731 || daysBetween(start, fixed) > 731 || !['employer', 'resignation', 'continue'].includes(p.exit) || typeof p.reciprocalClause !== 'boolean') return ['Revise as datas e as condições de encerramento.'];
  return [];
}
/** Full calendar months cost one salary; partial months use the disclosed 30-day divisor. */
export function salaryMonths(start: Date, end: Date): number {
  let sum = 0;
  for (let month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); month <= end; month = addMonths(month, 1)) {
    const last = addDays(addMonths(month, 1), -1);
    const from = start > month ? start : month, until = end < last ? end : last;
    sum += from.getTime() === month.getTime() && until.getTime() === last.getTime() ? 1 : (daysBetween(from, until) + 1) / 30;
  }
  return sum;
}
export function thirteenthAvos(start: Date, end: Date): number {
  let count = 0;
  for (let month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); month <= end; month = addMonths(month, 1)) {
    const last = addDays(addMonths(month, 1), -1);
    if (daysBetween(start > month ? start : month, end < last ? end : last) + 1 >= 15) count++;
  }
  return count;
}
export function serviceAvos(start: Date, end: Date): number {
  let full = 0;
  while (addDays(addMonths(start, full + 1), -1) <= end) full++;
  return full + (daysBetween(addMonths(start, full), end) + 1 >= 15 ? 1 : 0);
}
