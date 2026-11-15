import type { Worker } from './types.ts';
import { DAY, WEEK } from './engine.ts';
export type CoverageStatus = 'covered' | 'partial' | 'empty' | 'closed';
export interface CoverageInterval { start: number; end: number; needed: number; available: number; missing: number }
export function coverageSummary(demand: Float64Array, coverage: Float64Array, start = 0, end = WEEK) {
  let needed = 0, covered = 0;
  for (let minute = start; minute < end; minute++) {
    needed += demand[minute];
    covered += Math.min(demand[minute], coverage[minute]);
  }
  const gap = Math.max(0, needed - covered);
  const status: CoverageStatus = !needed ? 'closed' : gap < 1e-8 ? 'covered' : covered > 0 ? 'partial' : 'empty';
  return { needed: needed / 60, covered: covered / 60, gap: gap / 60, ratio: needed ? covered / needed : 1, status };
}
/** Keep near-complete and near-zero partial coverage distinct from 100% and 0%. */
export function visibleCoveragePercent(ratio: number, status: CoverageStatus) {
  return status === 'partial' ? Math.min(99.9, Math.max(.1, Math.round(ratio * 1000) / 10)) : status === 'empty' ? 0 : 100;
}
/** Exact, contiguous intervals within one clock hour; no averaging of simultaneous people. */
export function coverageIntervals(demand: Float64Array, coverage: Float64Array, day: number, hour: number): CoverageInterval[] {
  const intervals: CoverageInterval[] = [];
  const start = day * DAY + hour * 60;
  for (let minute = start; minute < start + 60; minute++) {
    const needed = demand[minute], available = coverage[minute], missing = Math.max(0, needed - available);
    const last = intervals.at(-1);
    if (last && last.needed === needed && last.available === available) last.end = minute + 1;
    else intervals.push({ start: minute, end: minute + 1, needed, available, missing });
  }
  return intervals;
}
export function addWorkerCoverage(base: Float64Array, workers: Worker[]) {
  const coverage = base.slice();
  for (const worker of workers) for (const shift of worker.shifts) {
    for (const [start, end] of [[shift.start, shift.breakStart], [shift.breakStart + shift.breakMinutes, shift.end]]) {
      for (let minute = start; minute < end; minute++) coverage[(minute + WEEK) % WEEK]++;
    }
  }
  return coverage;
}
