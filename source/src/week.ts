import type { Day } from './types.ts';

export const MAX_WEEK_DAYS = 7;

function assertWeek(days: Day[], dayIndex: number) {
  if (days.length !== MAX_WEEK_DAYS || !Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= MAX_WEEK_DAYS) {
    throw new Error('A semana deve conter somente os sete dias, de segunda a domingo.');
  }
}

// Keep calendar positions stable: the engine uses the index to identify each weekday.
export function removeOperatingDay(days: Day[], dayIndex: number): Day[] {
  assertWeek(days, dayIndex);
  return days.map((day, index) => index === dayIndex ? { ...day, bands: [] } : day);
}

export function restoreOperatingDay(days: Day[], dayIndex: number): Day[] {
  assertWeek(days, dayIndex);
  if (days[dayIndex].bands.length) return days;
  return days.map((day, index) => index === dayIndex ? {
    ...day,
    bands: [{ id: `day-${index}-restored`, open: '08:00', close: '18:00', people: 0 }],
  } : day);
}
