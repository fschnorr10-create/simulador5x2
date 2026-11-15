import { defaultEmploymentSettings, contractIssues, MINIMUM_WAGE_2026, validateEmploymentSettings } from './payroll.ts';
import type { ContractType, EmploymentSettings } from './payroll.ts';
import { contractPeriodCost } from './periodCost.ts';
import type { PeriodCost } from './periodCost.ts';
import { addDays, addMonths, dateString, parseDate } from './periodDates.ts';

export type HiringNeed = 'harvest' | 'occasional' | 'permanent' | 'short' | 'partial';
export type WizardTax = 'unknown' | 'payroll' | 'funrural' | 'simples' | 'simplesIV';
export interface ContractAnswers {
  employer: '' | 'pf' | 'pj';
  tax: WizardTax;
  payrollRevenue: 'unknown' | 'none' | 'revenue';
  need: '' | HiringNeed;
  people: number;
  salary: number;
  start: string;
  harvestMonths: number;
  shortMonths: number;
  trialDays: number;
  sameRole: 'unknown' | 'yes' | 'no';
  trialPurpose: boolean;
  occasionalDays: number;
  occasionalDailyHours: number;
  hourlyRate: number;
  alternating: boolean;
  partialWeeklyHours: number;
  settings: EmploymentSettings;
}
export function defaultContractAnswers(): ContractAnswers {
  return { employer: '', tax: 'unknown', payrollRevenue:'unknown', need: '', people: 1, salary: MINIMUM_WAGE_2026,
    start: new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Recife'}).format(new Date()), harvestMonths: 3, shortMonths: 2, trialDays: 90, sameRole: 'unknown', trialPurpose:false,
    occasionalDays: 8, occasionalDailyHours: 8, hourlyRate: Math.ceil(MINIMUM_WAGE_2026 / 200 * 100) / 100, alternating: false, partialWeeklyHours: 20,
    settings: defaultEmploymentSettings() };
}
export function validateContractAnswers(a: ContractAnswers): string[] {
  const incomeBased=['funrural','simples','simplesIV'].includes(a.tax)||(a.tax==='payroll'&&a.payrollRevenue==='revenue');
  const issues: string[] = [...validateEmploymentSettings({ ...a.settings,
    ...(['funrural','simples'].includes(a.tax)?{cpp:0,rat:0,fap:1}:{}),
    ...(['simples','simplesIV'].includes(a.tax)?{thirdParties:0}:{}),
    ...(!incomeBased?{monthlyRevenue:0,revenueRate:0}:{}),
    ...(a.need!=='short'?{previousShortMonths:0}:{}),
  })];
  if (!['pf','pj'].includes(a.employer)) issues.push('Informe se o empregador é PF ou PJ.');
  if (!['payroll','funrural','simples','simplesIV'].includes(a.tax)) issues.push('Informe como as contribuições serão recolhidas.');
  if (a.tax==='payroll' && a.payrollRevenue==='unknown') issues.push('Confirme se há contribuição complementar sobre comercialização na opção pela folha.');
  if ((['funrural','simples','simplesIV'].includes(a.tax) || (a.tax==='payroll' && a.payrollRevenue==='revenue')) && (!a.settings.monthlyRevenue || !a.settings.revenueRate)) issues.push('Informe a receita mensal e a alíquota efetiva para incluir as contribuições sobre faturamento.');
  if (a.employer==='pf' && ['simples','simplesIV'].includes(a.tax)) issues.push('Simples Nacional não é enquadramento de produtor rural pessoa física.');
  if (!['harvest','occasional','permanent','short','partial'].includes(a.need)) issues.push('Informe a necessidade de contratação.');
  const limits: Array<[number,number,number,boolean]> = [[a.people,1,100,true],[a.salary,1,1000000,false]];
  if(a.need==='harvest')limits.push([a.harvestMonths,1,12,true]);
  if(a.need==='short')limits.push([a.shortMonths,1,2,true]);
  if(['harvest','permanent','short'].includes(a.need))limits.push([a.trialDays,1,90,true]);
  if(a.need==='occasional')limits.push([a.occasionalDays,1,31,true],[a.occasionalDailyHours,.25,8,false],[a.hourlyRate,.01,100000,false]);
  if(a.need==='partial')limits.push([a.partialWeeklyHours,1,30,false]);
  if (limits.some(([value,min,max,integer])=>!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))) issues.push('Revise a quantidade de pessoas, os valores e os prazos informados.');
  const lastDay=parseDate(a.start)?dateString(addDays(addMonths(parseDate(a.start)!,12),-1)):'';
  const minimumDivisor=lastDay>='2027-12-16'?200:lastDay>='2026-12-16'?210:220;
  if (a.need==='occasional' && a.hourlyRate+1e-8<a.settings.salaryFloor/minimumDivisor) issues.push('O valor-hora está abaixo do piso de referência dividido pela jornada aplicável no período. Revise com a contabilidade.');
  if (a.need==='occasional' && a.occasionalDays*a.occasionalDailyHours>220) issues.push('O volume de convocação supera 220h por mês, limite deste formulário. Revise os dias e horários.');
  const start=parseDate(a.start);
  if (!start || a.start<'2000-01-01' || a.start>'2100-12-31') issues.push('Informe uma data válida de admissão.');
  return issues;
}
export function annualContractSettings(a: ContractAnswers, contract: ContractType, end: string): EmploymentSettings {
  return { ...a.settings, employer:a.employer==='pf'?'pf':'pj', contract, durationMonths:12,
    need:a.need==='harvest'?'harvest':a.need==='occasional'?'alternating':a.need==='short'?'temporary':'continuous',
    experienceDays:a.trialDays,experienceContinues:contract==='experience',priorSameRole:a.sameRole==='yes',partTime:contract==='partial',
    intermittentConfirmed:a.alternating,intermittentHours:Math.min(220,a.occasionalDays*a.occasionalDailyHours),
    taxProfile:a.tax==='funrural'?'ruralRevenue':a.tax==='simples'?'simples':a.tax==='simplesIV'?'simplesIV':'normal',
    period:{start:a.start,end,fixedEnd:dateString(addDays(addMonths(parseDate(a.start)!,a.need==='harvest'?a.harvestMonths:a.need==='short'?a.shortMonths:12),-1)),exit:'employer',reciprocalClause:false} };
}
export interface ContractHorizon { month: number; end: string; activeMonths: number; ended: boolean; costs: PeriodCost; common: number; total: number; reasons: string[] }
export interface AnnualContractOption { contract: ContractType; title: string; months: ContractHorizon[]; annual: ContractHorizon; eligible: boolean; reasons: string[] }
export const annualContractTitles: Partial<Record<ContractType,string>> = {
  harvest:'Safra · término no fim da atividade',experience:'Experiência até 90 dias → prazo indeterminado',indefinite:'Prazo indeterminado',intermittent:'Intermitente · convocações eventuais',partial:'Tempo parcial · até 30h semanais',short:'Pequeno prazo rural · até dois meses',
};
const contractsForNeed: Record<HiringNeed,ContractType[]> = { harvest:['harvest','experience'],occasional:['intermittent','indefinite'],permanent:['indefinite','experience'],short:['short','experience','indefinite'],partial:['partial'] };

/** Twelve independent termination horizons; annual cost is month 12, never the sum of twelve dismissals. */
export function compareAnnualContracts(a: ContractAnswers) {
  const inputIssues=validateContractAnswers(a);
  if (inputIssues.length) return {inputIssues,options:[] as AnnualContractOption[],best:undefined as AnnualContractOption|undefined,tied:[] as AnnualContractOption[],taxReady:false};
  const start=parseDate(a.start)!;
  const activeLimit=a.need==='harvest'?a.harvestMonths:a.need==='short'?a.shortMonths:12;
  const taxReady=a.settings.taxConfirmed && ((!['funrural','simples','simplesIV'].includes(a.tax) && !(a.tax==='payroll' && a.payrollRevenue==='revenue'))||(a.settings.monthlyRevenue>0&&a.settings.revenueRate>0));
  const options: AnnualContractOption[] = contractsForNeed[a.need as HiringNeed].map(contract=>{
    const months: ContractHorizon[]=Array.from({length:12},(_,index)=>{
      const month=index+1,activeMonths=Math.min(month,activeLimit);
      const end=dateString(addDays(addMonths(start,activeMonths),-1));
      const settings=annualContractSettings(a,contract,end);
      const actualPeriodMonths=activeMonths;
      settings.durationMonths=actualPeriodMonths;
      const monthlyPay=a.people*(contract==='intermittent'?a.occasionalDays*a.occasionalDailyHours*a.hourlyRate:contract==='partial'?Math.max(a.salary,a.settings.salaryFloor)*a.partialWeeklyHours/40:Math.max(a.salary,a.settings.salaryFloor));
      const costs=contractPeriodCost(monthlyPay,a.people,settings);
      const revenue=(['funrural','simples','simplesIV'].includes(a.tax)||(a.tax==='payroll'&&a.payrollRevenue==='revenue'))?a.settings.monthlyRevenue*a.settings.revenueRate/100:0;
      // Whole-employer revenue costs are common to all options, once per month, even outside the harvest.
      const common=(revenue+a.settings.otherMonthly)*month;
      const reasons=[...contractIssues(settings,'rural'),...costs.reasons];
      if (contract==='experience' && !a.trialPurpose) reasons.push('Experiência exige finalidade real de avaliar uma nova relação de trabalho; não deve ser escolhida apenas pelo custo.');
      if (contract==='experience' && a.sameRole==='unknown') reasons.push('Informe se o empregado já trabalhou na mesma função antes de indicar experiência.');
      if (!taxReady) reasons.push('Confirme o enquadramento e as alíquotas, incluindo a receita quando houver contribuição sobre faturamento.');
      return {month,end,activeMonths,ended:month>activeLimit,costs,common,total:costs.total+common,reasons:[...new Set(reasons)]};
    });
    const annual=months[11];
    return {contract,title:annualContractTitles[contract]!,months,annual,eligible:!annual.reasons.length,reasons:annual.reasons};
  });
  const eligible=options.filter(option=>option.eligible).sort((a,b)=>Math.round(a.annual.total*100)-Math.round(b.annual.total*100));
  const best=taxReady?eligible[0]:undefined;
  const tied=best?eligible.filter(option=>Math.round(option.annual.total*100)===Math.round(best.annual.total*100)):[];
  return {inputIssues,options,best,tied,taxReady};
}
