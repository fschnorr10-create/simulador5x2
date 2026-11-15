export const DAY = 1440;
export const WEEK = 7 * DAY;
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
