import type { Calculation, Scenario } from './types.ts';
import type { ContractType, EmploymentSettings } from './payroll.ts';
import { contractNames } from './payroll.ts';
import type { HiringPlan, HiringScheduleCache } from './staffing.ts';
import { analyzeEmployment, planHiring } from './staffing.ts';

export interface ContractVariant { id: string; contract: ContractType; partTime: boolean }
export const contractVariants: ContractVariant[] = [
  { id: 'indefinite', contract: 'indefinite', partTime: false },
  { id: 'partial', contract: 'partial', partTime: true },
  { id: 'harvest', contract: 'harvest', partTime: false },
  { id: 'harvest-partial', contract: 'harvest', partTime: true },
  { id: 'experience', contract: 'experience', partTime: false },
  { id: 'experience-partial', contract: 'experience', partTime: true },
  { id: 'intermittent', contract: 'intermittent', partTime: false },
  { id: 'short', contract: 'short', partTime: false },
  { id: 'short-partial', contract: 'short', partTime: true },
];
export interface ComparisonOption {
  id: string;
  variant?: ContractVariant;
  kind: 'hiring' | 'hybrid' | 'overtime' | 'current';
  newPeople: number;
  extraHours: number;
  addedCost: number;
  totalCost: number;
  remaining: number;
  eligible: boolean;
  reasons: string[];
  hiring?: HiringPlan;
}
export interface ComparisonRow {
  variant: ContractVariant;
  hiring: ComparisonOption;
  hybrid: ComparisonOption;
  legalReasons: string[];
}
const hasFullCoverage = (remaining: number) => remaining < 1e-8;
const moneyInCents = (cost: number) => Math.round(cost * 100);

export function compareAllContracts(scenario: Scenario, result: Calculation, analysis = analyzeEmployment(scenario, result)) {
  const normalCache: HiringScheduleCache = new Map();
  const extraCache: HiringScheduleCache = new Map();
  const { p, overtime, currentMonthly } = analysis;
  const taxReady = p.taxConfirmed && (p.taxProfile !== 'ruralRevenue' || (p.monthlyRevenue > 0 && p.revenueRate > 0));
  const rows: ComparisonRow[] = contractVariants.map(variant => {
    const settings = { ...p, contract: variant.contract, partTime: variant.partTime };
    const alternative = { ...scenario, planning: settings };
    // Keep all original conditions: blocked variants are cost illustrations, never candidates.
    const normal = planHiring(alternative, result, result.coverage, { illustrateIneligible: true, cache: normalCache });
    const extra = planHiring(alternative, result, overtime.coverage, { illustrateIneligible: true, cache: extraCache });
    const legalReasons = [...new Set([...normal.blocked, ...analysis.contextIssues])];
    const buildOption = (kind: 'hiring' | 'hybrid', hiring: HiringPlan): ComparisonOption => {
      const reasons = [...legalReasons, ...(kind === 'hybrid' ? overtime.reasons : [])];
      if (kind === 'hybrid' && overtime.extraHours < 1e-8 && overtime.ordinaryHours < 1e-8) reasons.push('Não há prorrogação ou horas ordinárias recuperadas para combinar nesta alternativa.');
      if (!hasFullCoverage(hiring.remaining)) reasons.push('A alternativa deixa demanda descoberta no modelo de escala.');
      const addedCost = hiring.cost + (kind === 'hybrid' ? overtime.cost : 0);
      return { id: `${variant.id}-${kind}`, variant, kind, newPeople: hiring.count, extraHours: kind === 'hybrid' ? overtime.extraHours : 0,
        addedCost, totalCost: currentMonthly + addedCost, remaining: hiring.remaining, eligible: !reasons.length, reasons: [...new Set(reasons)], hiring };
    };
    return { variant, hiring: buildOption('hiring', normal), hybrid: buildOption('hybrid', extra), legalReasons };
  });
  const overtimeReasons = [...new Set([...overtime.reasons, ...analysis.contextIssues])];
  if (!hasFullCoverage(overtime.remaining)) overtimeReasons.push('A alternativa deixa demanda descoberta no modelo de escala.');
  const overtimeOnly: ComparisonOption = { id: 'overtime-only', kind: 'overtime', newPeople: 0, extraHours: overtime.extraHours, addedCost: overtime.cost,
    totalCost: currentMonthly + overtime.cost, remaining: overtime.remaining, eligible: !overtimeReasons.length, reasons: overtimeReasons };
  const current: ComparisonOption = { id: 'current-only', kind: 'current', newPeople: 0, extraHours: 0, addedCost: 0, totalCost: currentMonthly,
    remaining: result.gap, eligible: hasFullCoverage(result.gap) && !analysis.contextIssues.length, reasons: [...analysis.contextIssues, ...(hasFullCoverage(result.gap) ? [] : ['A alternativa deixa demanda descoberta no modelo de escala.'])] };
  const candidates = current.eligible ? [current] : [overtimeOnly, ...rows.flatMap(row => [row.hiring, row.hybrid])].filter(option => option.eligible);
  candidates.sort((a, b) => moneyInCents(a.totalCost) - moneyInCents(b.totalCost) || a.extraHours - b.extraHours || a.newPeople - b.newPeople || a.id.localeCompare(b.id));
  const best = taxReady ? candidates[0] : undefined;
  const tied = best ? candidates.filter(option => moneyInCents(option.totalCost) === moneyInCents(best.totalCost)) : [];
  const nextCost = best ? candidates.find(option => moneyInCents(option.totalCost) > moneyInCents(best.totalCost))?.totalCost : undefined;
  return { rows, overtimeOnly, current, candidates, taxReady, best, tied, savingToNext: best && nextCost !== undefined ? nextCost - best.totalCost : 0 };
}

/** Applying a reviewed option changes contract/journey choices only; demand and tax inputs stay intact. */
export function applyComparisonOption(scenario: Scenario, option: ComparisonOption): Scenario {
  if (!option.eligible) throw new Error('A alternativa não atende aos requisitos e à cobertura para aplicação.');
  const current = scenario.planning;
  if (!current) throw new Error('Confirme as premissas de contratação antes de aplicar uma alternativa.');
  const planning: EmploymentSettings = { ...current, preferredStrategy: option.kind === 'hybrid' || option.kind === 'overtime' ? 'hybrid' : 'hiring' };
  if (option.variant) { planning.contract = option.variant.contract; planning.partTime = option.variant.partTime; }
  return { ...scenario, planning };
}

export function optionName(option: ComparisonOption): string {
  return option.kind === 'current' ? 'Manter o quadro atual' : option.kind === 'overtime' ? (option.extraHours > 0 ? 'Somente horas extras' : 'Reorganizar horas ordinárias') : contractNames[option.variant!.contract];
}

export function optionExtraLabel(option: ComparisonOption): string {
  return option.extraHours > 0 ? 'HE do quadro atual' : 'Reorganização de horas ordinárias';
}
