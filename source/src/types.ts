import type { WorkSchedule, OperatingTemplate } from './workSchedule.ts';
import type { EmploymentSettings } from './payroll.ts';
export type Sector = 'rural' | 'comercio' | 'servicos' | 'industria' | 'educacao' | 'beneficente';
export type Collective = 'nao' | 'sim' | 'nao-sei';
export interface Band { id: string; open: string; close: string; people: number }
export interface Day { name: string; bands: Band[] }
export interface Scenario {
  version: 1;
  workSchedules?: Partial<Record<42 | 40, WorkSchedule>>;
  operatingTemplate?: OperatingTemplate;
  planning?: EmploymentSettings;
  name: string;
  sector: Sector;
  state: string;
  city: string;
  scale: '6x1' | '5x2' | '12x36' | 'turnos';
  employees: number;
  currentHours: number;
  salary: number;
  charges: number;
  extraRate: number;
  dsrRate: number;
  monthlyWeeks: number;
  interval: number;
  collective: Collective;
  collectiveRef: string;
  insalubrious: boolean;
  publicContract: boolean;
  days: Day[];
}
export interface Shift {
  day: number;
  start: number;
  end: number;
  breakStart: number;
  breakMinutes: number;
  workMinutes: number;
}
export interface Worker { number: number; shifts: Shift[]; minutes: number }
export interface Calculation {
  stage: 42 | 40;
  scheduleKind?: 'automatic' | 'custom';
  cycleWeeks?: number;
  costReferenceGap?: number;
  scheduleIssues?: string[];
  scheduleNotices?: string[];
  target: number;
  dailyCap: number;
  demand: Float64Array;
  coverage: Float64Array;
  workers: Worker[];
  demandedHours: number;
  coveredHours: number;
  gap: number;
  capacityGap: number;
  lostHours: number;
  availableHours: number;
  usedHours: number;
  coveragePercent: number;
  divisor: number;
  hourlyIncrease: number;
  fullCount: number;
  partialCount: number;
  partialHours: number;
  fullCost: number;
  partialCost: number;
  overtimeCost: number;
  overtimeMonthlyHours: number;
}
