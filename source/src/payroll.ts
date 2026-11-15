import type { PeriodSettings } from './periodDates.ts';
import { parseDate, addMonths, daysBetween, validatePeriod } from './periodDates.ts';
export const MINIMUM_WAGE_2026 = 1621;
export const costSources = {
  minimum: 'https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/2025/12/publicado-decreto-que-reajusta-salario-minimo-para-r-1-621-a-partir-de-1o-de-janeiro',
  clt: 'https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.pdf',
  contributions: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/contribuicoes-previdenciarias-pf',
  simples: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional',
  rural: 'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-eventos-da-efd-reinf/2-5-4-quais-contribuicoes-sao',
  experience: 'https://portal-ej.trt6.jus.br/noticias/2026/01/30/ejud-6-atualiza-no-104',
  intermittent: 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes',
};
export type ContractType = 'indefinite' | 'harvest' | 'experience' | 'intermittent' | 'partial' | 'short';
export type TaxProfile = 'normal' | 'simples' | 'simplesIV' | 'ruralRevenue' | 'cebas' | 'custom';
export interface EmploymentSettings {
  period?: PeriodSettings;
  comparisonBasis?: 'period' | 'monthly';
  contractHeadcount?: number;
  contractHours?: number;
  comparedContracts?: ContractType[];
  contract: ContractType;
  employer: 'pf' | 'pj';
  need: 'continuous' | 'harvest' | 'temporary' | 'alternating';
  durationMonths: number;
  previousShortMonths: number;
  experienceDays: number;
  priorSameRole: boolean;
  partTime: boolean;
  preferredStrategy?: 'hiring' | 'hybrid';
  intermittentConfirmed: boolean;
  intermittentHours: number;
  overtimeEnabled: boolean;
  overtimeAuthorized: boolean;
  overtimeDailyLimit: number;
  taxProfile: TaxProfile;
  taxConfirmed: boolean;
  salaryFloor: number;
  cpp: number;
  rat: number;
  fap: number;
  thirdParties: number;
  fgts: number;
  payrollPis: number;
  benefits: number;
  otherMonthly: number;
  severanceReserve: number;
  monthlyRevenue: number;
  revenueRate: number;
  customCharges: number;
}
export const contractNames: Record<ContractType, string> = {
  indefinite: 'Prazo indeterminado', harvest: 'Contrato de safra', experience: 'Contrato de experiência',
  intermittent: 'Contrato intermitente', partial: 'Tempo parcial', short: 'Pequeno prazo rural',
};
export const taxNames: Record<TaxProfile, string> = {
  normal: 'Contribuição sobre a folha', simples: 'Simples Nacional · fora do Anexo IV', simplesIV: 'Simples Nacional · Anexo IV',
  ruralRevenue: 'Rural · contribuição substitutiva sobre receita', cebas: 'Entidade beneficente · verificar imunidade', custom: 'Percentual global personalizado',
};
export function defaultEmploymentSettings(): EmploymentSettings {
  return { contract: 'indefinite', employer: 'pj', need: 'continuous', durationMonths: 1, previousShortMonths: 0, experienceDays: 45, priorSameRole: false, partTime: false,
    intermittentConfirmed: false, intermittentHours: 80, overtimeEnabled: true, overtimeAuthorized: false, overtimeDailyLimit: 2,
    taxProfile: 'normal', taxConfirmed: false, salaryFloor: MINIMUM_WAGE_2026, cpp: 20, rat: 2, fap: 1, thirdParties: 5.8, fgts: 8, payrollPis: 0,
    benefits: 0, otherMonthly: 0, severanceReserve: 0, monthlyRevenue: 0, revenueRate: 0, customCharges: 40 };
}
export function employmentSettings(scenario: { planning?: EmploymentSettings; charges: number }): EmploymentSettings {
  return scenario.planning ?? { ...defaultEmploymentSettings(), taxProfile: 'custom', customCharges: scenario.charges };
}
export function validateEmploymentSettings(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Configuração de contratação inválida.'];
  const p = input as Record<string, unknown>;
  const enums = { contract: Object.keys(contractNames), taxProfile: Object.keys(taxNames), employer: ['pf', 'pj'], need: ['continuous', 'harvest', 'temporary', 'alternating'] };
  const errors: string[] = [];
  for (const [key, options] of Object.entries(enums)) if (!options.includes(String(p[key]))) errors.push('Revise a modalidade e o enquadramento da contratação.');
  const limits: Record<string, [number, number]> = { durationMonths: [0.1, 24], previousShortMonths: [0, 12], experienceDays: [1, 90], intermittentHours: [1, 220], overtimeDailyLimit: [0, 2], salaryFloor: [1, 1000000], cpp: [0, 40], rat: [0, 3], fap: [0.5, 2], thirdParties: [0, 20], fgts: [8, 8], payrollPis: [0, 5], benefits: [0, 100000], otherMonthly: [0, 1000000], severanceReserve: [0, 100], monthlyRevenue: [0, 10000000000], revenueRate: [0, 100], customCharges: [0, 300] };
  for (const [key, [min, max]] of Object.entries(limits)) if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || Number(p[key]) < min || Number(p[key]) > max) errors.push('Revise os valores e limites das premissas de custo.');
  for (const key of ['priorSameRole', 'partTime', 'intermittentConfirmed', 'overtimeEnabled', 'overtimeAuthorized', 'taxConfirmed']) if (typeof p[key] !== 'boolean') errors.push('Revise as confirmações das premissas.');
  if (p.preferredStrategy !== undefined && !['hiring', 'hybrid'].includes(String(p.preferredStrategy))) errors.push('Estratégia de cobertura inválida.');
  if (!Number.isInteger(p.experienceDays)) errors.push('O prazo de experiência deve ser informado em dias inteiros.');
  if (p.contractHeadcount !== undefined && (!Number.isInteger(p.contractHeadcount) || Number(p.contractHeadcount) < 1 || Number(p.contractHeadcount) > 100)) errors.push('Informe uma quantidade válida de pessoas e horas.');
  if (p.contractHours !== undefined && (typeof p.contractHours !== 'number' || !Number.isFinite(p.contractHours) || p.contractHours <= 0 || p.contractHours > 40)) errors.push('Informe uma quantidade válida de pessoas e horas.');
  if (p.comparedContracts !== undefined && (!Array.isArray(p.comparedContracts) || p.comparedContracts.length > 6 || new Set(p.comparedContracts).size !== p.comparedContracts.length || p.comparedContracts.some(value => !Object.keys(contractNames).includes(String(value))))) errors.push('Revise a modalidade e o enquadramento da contratação.');
  if (p.period !== undefined) errors.push(...validatePeriod(p.period));
  if (p.comparisonBasis !== undefined && !['period', 'monthly'].includes(String(p.comparisonBasis))) errors.push('Base de comparação inválida.');
  return [...new Set(errors)];
}
export function contractIssues(p: EmploymentSettings, sector: string): string[] {
  const issues: string[] = [];
  const periodDays = p.period && !validatePeriod(p.period).length ? daysBetween(parseDate(p.period.start)!, parseDate(p.period.end)!) + 1 : p.durationMonths * 30;
  if (p.contract === 'experience' && periodDays > p.experienceDays) issues.push('O prazo de experiência não cobre todo o período informado. A continuidade exige conversão e novo planejamento.');
  if (p.contract === 'experience' && p.priorSameRole) issues.push('Experiência bloqueada: o empregado já trabalhou na mesma função para este empregador. Eventual exceção coletiva exige análise jurídica específica.');
  if (p.contract === 'harvest' && (sector !== 'rural' || p.need !== 'harvest')) issues.push('Safra exige atividade rural e necessidade vinculada à variação estacional.');
  const shortTooLong = p.period && !validatePeriod(p.period).length ? periodDays > daysBetween(parseDate(p.period.start)!, addMonths(parseDate(p.period.start)!, 2)) || (p.previousShortMonths > 0 && p.durationMonths + p.previousShortMonths > 2) : p.durationMonths + p.previousShortMonths > 2;
  if (p.contract === 'short' && (sector !== 'rural' || p.employer !== 'pf' || p.need !== 'temporary' || shortTooLong)) issues.push('Pequeno prazo exige produtor rural pessoa física, atividade temporária e limite acumulado de dois meses em um ano.');
  if (p.contract === 'intermittent' && (!p.intermittentConfirmed || p.need !== 'alternating')) issues.push('Intermitente exige alternância real de atividade e inatividade, contrato escrito e confirmação das condições de convocação.');
  return issues;
}
export interface PayrollLine { label: string; value: number }
export interface PayrollCost { lines: PayrollLine[]; salary: number; total: number; cash: number; provision: number; employerCharges: number }
export function contributionRates(p: EmploymentSettings) {
  if (p.taxProfile === 'simples' || (p.taxProfile === 'cebas' && p.taxConfirmed)) return { cpp: 0, rat: 0, third: 0 };
  if (p.taxProfile === 'ruralRevenue') return { cpp: 0, rat: 0, third: p.thirdParties };
  return { cpp: p.cpp, rat: p.rat * p.fap, third: p.taxProfile === 'simplesIV' ? 0 : p.thirdParties };
}

/** Annual monthly equivalent: monthly wages already include the paid vacation month. */
export function payrollCost(remuneration: number, headcount: number, p: EmploymentSettings, mode: 'monthly' | 'intermittent' | 'term' | 'proportional' = 'monthly', includeFixed = true, includeContractReserve = false): PayrollCost {
  const salary = remuneration;
  if (p.taxProfile === 'custom') {
    const charges = salary * p.customCharges / 100;
    const benefits = includeFixed ? p.benefits * headcount : 0;
    return { salary, total: salary + charges + benefits, cash: salary + charges + benefits, provision: 0, employerCharges: charges,
      lines: [{ label: 'Remuneração', value: salary }, { label: 'Encargos globais personalizados', value: charges }, { label: 'Benefícios e custos por pessoa', value: benefits }] };
  }
  const rates = contributionRates(p);
  const dsr = mode === 'intermittent' ? salary / 6 : 0;
  const base = salary + dsr;
  const thirteenth = base / 12;
  const vacation = mode !== 'monthly' ? base / 12 : 0;
  const vacationThird = base / 36;
  // Proportional vacation paid during an intermittent contract is remuneration (Cosit 17/2019).
  const taxable = base + thirteenth + (mode === 'term' ? 0 : vacation + vacationThird);
  const cpp = taxable * rates.cpp / 100;
  const rat = taxable * rates.rat / 100;
  const third = taxable * rates.third / 100;
  const fgts = taxable * p.fgts / 100;
  const pis = taxable * (p.taxProfile === 'cebas' && p.taxConfirmed ? 0 : p.payrollPis) / 100;
  const harvestReserve = includeContractReserve && p.contract === 'harvest' ? salary / 12 : 0;
  const benefits = includeFixed ? p.benefits * headcount : 0;
  const reserve = salary * p.severanceReserve / 100;
  const employerCharges = cpp + rat + third + fgts + pis;
  const total = base + thirteenth + vacation + vacationThird + employerCharges + benefits + reserve + harvestReserve;
  const levy = (rates.cpp + rates.rat + rates.third + p.fgts + (p.taxProfile === 'cebas' && p.taxConfirmed ? 0 : p.payrollPis)) / 100;
  const provision = (mode === 'monthly' ? (thirteenth + vacationThird) * (1 + levy) : mode === 'term' ? thirteenth * (1 + levy) + vacation + vacationThird : 0) + reserve + harvestReserve;
  return { salary, total, cash: total - provision, provision, employerCharges, lines: [
    { label: 'Remuneração', value: salary }, { label: 'DSR sobre convocações · estimativa 1/6', value: dsr },
    { label: '13º proporcional / provisão', value: thirteenth }, { label: mode === 'term' ? 'Férias proporcionais indenizadas · reserva' : 'Férias proporcionais pagas por período', value: vacation }, { label: 'Terço de férias', value: vacationThird },
    { label: 'CPP patronal', value: cpp }, { label: 'RAT × FAP', value: rat }, { label: 'Terceiros / FPAS', value: third }, { label: 'FGTS', value: fgts }, { label: 'PIS sobre folha, quando devido', value: pis }, { label: 'Reserva de indenização de safra · art. 14', value: harvestReserve },
    { label: 'Benefícios e custos por pessoa', value: benefits }, { label: 'Reserva rescisória informada', value: reserve },
  ] };
}
