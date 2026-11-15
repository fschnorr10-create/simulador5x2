import type { EmploymentSettings } from './payroll.ts';
import { contributionRates } from './payroll.ts';
import { addDays, addMonths, dateString, daysBetween, defaultPeriod, parseDate, salaryMonths, serviceAvos, thirteenthAvos, validatePeriod } from './periodDates.ts';

export interface PeriodLine { label: string; value: number; category: 'operation' | 'settlement' | 'accrual' | 'included' }
export interface PeriodCost {
  start: string; end: string; projectedEnd: string; months: number;
  operation: number; settlement: number; accrual: number; total: number;
  noticeDays: number; normalExpiry: boolean; lines: PeriodLine[]; reasons: string[];
}
export function planningPeriod(p: EmploymentSettings) { return p.period ?? defaultPeriod(p.durationMonths); }

/** New hires start together. Existing staff continue, so their historical termination liabilities are not invented. */
export function contractPeriodCost(monthlySalary: number, headcount: number, p: EmploymentSettings): PeriodCost {
  const period = planningPeriod(p);
  const reasons = validatePeriod(period);
  const start = parseDate(period.start) ?? new Date(Date.UTC(2026, 0, 1));
  const end = parseDate(period.end) ?? start;
  const months = Math.max(0, salaryMonths(start, end));
  const output: PeriodCost = { start: dateString(start), end: dateString(end), projectedEnd: dateString(end), months, operation: 0, settlement: 0, accrual: 0, total: 0, noticeDays: 0, normalExpiry: false, lines: [], reasons };
  if (reasons.length || !headcount) return output;
  const line = (label: string, value: number, category: PeriodLine['category']) => {
    if (value > 1e-9) output.lines.push({ label, value, category });
    if (category !== 'included') output[category] += value;
  };
  const rates = contributionRates(p);
  const socialRate = (rates.cpp + rates.rat + rates.third + (p.taxProfile === 'cebas' && p.taxConfirmed ? 0 : p.payrollPis)) / 100;
  const fgtsRate = p.fgts / 100;
  const fixedEnd = p.contract === 'experience' ? addDays(start, p.experienceDays - 1) : parseDate(period.fixedEnd)!;
  const experienceConverted = p.contract === 'experience' && p.experienceContinues && end > fixedEnd;
  const fixed = ['experience', 'harvest', 'short'].includes(p.contract) && !experienceConverted;
  if (fixed && fixedEnd < end) reasons.push('O contrato a prazo termina antes da demanda. A continuidade exige novo planejamento.');
  const normalExpiry = fixed && fixedEnd.getTime() === end.getTime();
  output.normalExpiry = normalExpiry;
  const terminating = period.exit !== 'continue' || normalExpiry;
  const earlyFixed = fixed && end < fixedEnd;
  // A harvest's event-based end and its special indemnity require individual review on early termination.
  if (p.contract === 'harvest' && earlyFixed && terminating) reasons.push('Rescisão antecipada de safra exige revisão da causa e das indenizações antes da indicação.');
  if (p.taxProfile === 'custom') reasons.push('O percentual global não permite separar encargos e verbas sem duplicidade. Use encargos discriminados para indicar o menor custo total.');
  if (p.contract === 'short' && p.previousShortMonths > 0) reasons.push('Informe os períodos anteriores por calendário com a assessoria antes de concluir o custo do pequeno prazo.');
  let serviceYears = 0;
  while (addMonths(start, (serviceYears + 1) * 12) <= addDays(end, 1)) serviceYears++;
  const noticeOwed = terminating && period.exit === 'employer' && !normalExpiry && (!fixed || period.reciprocalClause);
  output.noticeDays = noticeOwed ? Math.min(90, 30 + serviceYears * 3) : 0;
  const projectedEnd = addDays(end, output.noticeDays);
  output.projectedEnd = dateString(projectedEnd);
  // Vacation coverage is not silently assumed. Long horizons remain visible but cannot win without a leave/coverage model.
  if (addMonths(start, 12) < addDays(end, 1)) reasons.push('Período superior a 12 meses exige planejamento de férias e substituições. O custo é ilustrativo e fica fora da indicação.');
  const intermittent = p.contract === 'intermittent';
  const short = p.contract === 'short';
  const wage = monthlySalary * months;
  const dsr = intermittent ? wage / 6 : 0;
  const salaryBase = monthlySalary * (intermittent ? 7 / 6 : 1);
  const actual13 = salaryBase * thirteenthAvos(start, end) / 12;
  const projected13 = salaryBase * Math.max(0, thirteenthAvos(start, projectedEnd) - thirteenthAvos(start, end)) / 12;
  const vacation = salaryBase * serviceAvos(start, projectedEnd) / 12;
  const category = terminating ? 'settlement' : 'accrual';
  line('Salários do período', wage, 'operation');
  line('DSR sobre convocações · estimativa 1/6', dsr, 'operation');
  let operatingTaxable = wage + dsr;
  let settlementTaxable = 0;
  if (intermittent || short) {
    // These modalities pay proportional entitlements during the relationship, not again at exit.
    const paid13 = intermittent ? (wage + dsr) / 12 : actual13;
    const paidVacation = intermittent ? (wage + dsr) / 12 : salaryBase * serviceAvos(start, end) / 12;
    line('13º proporcional pago durante o período', paid13, 'operation');
    line('Férias proporcionais e terço pagos durante o período', paidVacation * 4 / 3, 'operation');
    operatingTaxable += paid13 + paidVacation * 4 / 3;
    if (!short && noticeOwed) {
      // MTE art. 37: average amounts received throughout the intermittent contract.
      const monthlyAverage = months > 0 ? (wage + dsr + paid13 + paidVacation * 4 / 3) / months : 0;
      line('Aviso prévio indenizado', monthlyAverage * output.noticeDays / 30, 'settlement');
    }
    if (short && noticeOwed) {
      reasons.push('Pequeno prazo com cláusula de rescisão recíproca exige cálculo específico da projeção do aviso.');
      line('Aviso prévio indenizado', monthlySalary * output.noticeDays / 30, 'settlement');
    }
  } else {
    const currentYearStart = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
    const earlier13 = end.getUTCFullYear() > start.getUTCFullYear() ? salaryBase * thirteenthAvos(start, addDays(currentYearStart, -1)) / 12 : 0;
    line('13º de anos anteriores pago no período', earlier13, 'operation');
    operatingTaxable += earlier13;
    line('13º proporcional no encerramento', actual13 - earlier13 + projected13, category);
    settlementTaxable = actual13 - earlier13 + projected13;
    line('Férias adquiridas e proporcionais indenizadas', vacation, category);
    line('Terço das férias indenizadas', vacation / 3, category);
    line('Aviso prévio indenizado', monthlySalary * output.noticeDays / 30, 'settlement');
  }
  line('Encargos patronais sobre pagamentos do período', operatingTaxable * socialRate, 'operation');
  line('FGTS dos pagamentos do período', operatingTaxable * fgtsRate, 'operation');
  line('Benefícios do período', p.benefits * headcount * months, 'operation');
  line('Encargos patronais sobre o 13º do encerramento', settlementTaxable * socialRate, category);
  line('FGTS sobre o 13º do encerramento', settlementTaxable * fgtsRate, category);
  const noticePay = output.lines.find(item => item.label === 'Aviso prévio indenizado')?.value ?? 0;
  line('FGTS sobre aviso indenizado', noticePay * fgtsRate, 'settlement');
  if (terminating && period.exit === 'employer' && !normalExpiry) {
    // OJ 42-II: exclude the indemnified notice's projection from the 40% indemnity base.
    const fineBase = (operatingTaxable + settlementTaxable - (intermittent || short ? 0 : projected13)) * fgtsRate;
    line('Multa de 40% do FGTS', Math.max(0, fineBase) * .4, 'settlement');
    if (earlyFixed && !period.reciprocalClause) line('Indenização por término antecipado · art. 479', monthlySalary * salaryMonths(addDays(end, 1), fixedEnd) / 2, 'settlement');
  }
  if (normalExpiry && p.contract === 'harvest') line('Indenização de safra · art. 14', monthlySalary * serviceAvos(start, end) / 12, 'settlement');
  if (period.exit === 'resignation' && earlyFixed) reasons.push('Saída antecipada pelo empregado: eventual art. 480 depende de prejuízo comprovado e não é abatido automaticamente.');
  const lastMonthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  line('Saldo salarial final · já incluído nos salários', monthlySalary * salaryMonths(start > lastMonthStart ? start : lastMonthStart, end), 'included');
  output.total = output.operation + output.settlement + output.accrual;
  return output;
}
