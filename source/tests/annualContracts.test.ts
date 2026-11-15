import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultContractAnswers, compareAnnualContracts, validateContractAnswers } from '../src/annualContracts.ts';
import { contractPeriodCost } from '../src/periodCost.ts';
import { defaultEmploymentSettings } from '../src/payroll.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function ready(){const a=defaultContractAnswers();a.employer='pf';a.tax='payroll';a.payrollRevenue='none';a.need='permanent';a.start='2026-01-01';a.salary=3000;a.sameRole='no';a.trialPurpose=true;a.settings.taxConfirmed=true;return a;}
const line=(r:ReturnType<typeof contractPeriodCost>,label:string)=>r.lines.find(item=>item.label===label)?.value??0;

test('questionnaire requires PF/PJ, contribution basis and actual hiring need',()=>{
 const a=defaultContractAnswers();assert.ok(validateContractAnswers(a).some(x=>x.includes('PF')));assert.ok(validateContractAnswers(a).some(x=>x.includes('contribuições')));assert.equal(compareAnnualContracts(a).options.length,0);
});
test('PF cannot use a PJ Simples profile and malformed rates or trial periods are rejected',()=>{
 const a=ready();a.tax='simples';assert.ok(validateContractAnswers(a).length);a.tax='payroll';a.trialDays=91;assert.ok(validateContractAnswers(a).length);a.trialDays=90;a.settings.cpp=-2;assert.ok(validateContractAnswers(a).length);
});
test('all recommended contract paths contain exactly twelve independent termination horizons',()=>{
 const a=ready();for(const need of ['permanent','harvest','occasional','short','partial'] as const){a.need=need;a.alternating=true;const r=compareAnnualContracts(a);assert.ok(r.options.length);for(const o of r.options){assert.equal(o.months.length,12);assert.equal(o.months[11],o.annual);assert.equal(o.months[0].month,1);}}
});
test('annual cost is not twelve terminations: it settles the same employment only once',()=>{
 const a=ready();const r=compareAnnualContracts(a);const indefinite=r.options.find(o=>o.contract==='indefinite')!;
 assert.notEqual(indefinite.annual.total,indefinite.months[0].total*12);close(indefinite.annual.total,indefinite.annual.costs.operation+indefinite.annual.costs.settlement+indefinite.annual.common);
 close(line(indefinite.annual.costs,'Salários do período'),36000);
});
test('probation ends by day 90 and converts without extra settlement when employment continues',()=>{
 const a=ready();const r=compareAnnualContracts(a);const trial=r.options.find(o=>o.contract==='experience')!,indefinite=r.options.find(o=>o.contract==='indefinite')!;
 assert.equal(trial.months[2].end,'2026-03-31');assert.equal(trial.months[2].costs.normalExpiry,true);assert.equal(trial.months[2].costs.noticeDays,0);
 assert.equal(trial.months[3].costs.normalExpiry,false);assert.equal(trial.months[3].costs.noticeDays,30);assert.equal(trial.annual.costs.noticeDays,33);
 close(trial.annual.total,indefinite.annual.total);assert.equal(line(trial.annual.costs,'Indenização por término antecipado · art. 479'),0);
});
test('early trial dismissal still includes art479 before conversion',()=>{
 const a=ready();const trial=compareAnnualContracts(a).options.find(o=>o.contract==='experience')!;
 assert.ok(line(trial.months[0].costs,'Indenização por término antecipado · art. 479')>0);assert.equal(trial.months[0].costs.noticeDays,0);
});
test('same-role experience, unknown prior history and absent assessment purpose remain ineligible',()=>{
 const a=ready();a.sameRole='yes';let trial=compareAnnualContracts(a).options.find(o=>o.contract==='experience')!;assert.equal(trial.eligible,false);
 a.sameRole='unknown';trial=compareAnnualContracts(a).options.find(o=>o.contract==='experience')!;assert.ok(trial.reasons.some(x=>x.includes('já trabalhou')));
 a.sameRole='no';a.trialPurpose=false;trial=compareAnnualContracts(a).options.find(o=>o.contract==='experience')!;assert.ok(trial.reasons.some(x=>x.includes('finalidade real')));
});
test('harvest and experience use the same seasonal demand period within the twelve-month view',()=>{
 const a=ready();a.need='harvest';a.harvestMonths=4;const r=compareAnnualContracts(a);
 for(const o of r.options){assert.equal(o.annual.activeMonths,4);assert.equal(o.annual.end,'2026-04-30');assert.equal(o.months[4].ended,true);close(line(o.annual.costs,'Salários do período'),12000);close(o.months[4].costs.total,o.annual.costs.total);}
 const harvest=r.options.find(o=>o.contract==='harvest')!,trial=r.options.find(o=>o.contract==='experience')!;
 assert.equal(harvest.annual.costs.noticeDays,0);assert.equal(line(harvest.annual.costs,'Multa de 40% do FGTS'),0);assert.ok(line(harvest.annual.costs,'Indenização de safra · art. 14')>0);
 assert.equal(trial.annual.costs.noticeDays,30);assert.equal(r.best?.contract,'harvest');
});
test('harvest before natural expiry remains an explicitly reviewed early-termination hypothesis',()=>{
 const a=ready();a.need='harvest';a.harvestMonths=6;const harvest=compareAnnualContracts(a).options.find(o=>o.contract==='harvest')!;
 assert.ok(harvest.months[0].reasons.some(x=>x.includes('antecipada de safra')));assert.ok(!harvest.annual.reasons.some(x=>x.includes('antecipada de safra')));
});
test('a normal twelve-month expiry includes acquired vacation and can be estimated without pretending it was already taken',()=>{
 const a=ready();a.need='harvest';a.harvestMonths=12;const harvest=compareAnnualContracts(a).options.find(o=>o.contract==='harvest')!;
 assert.equal(harvest.eligible,true);close(line(harvest.annual.costs,'Férias adquiridas e proporcionais indenizadas'),3000);close(line(harvest.annual.costs,'Terço das férias indenizadas'),1000);
});
test('FUNRURAL substitutes CPP/RAT, preserves FGTS and counts common revenue once per month',()=>{
 const a=ready();a.tax='funrural';a.settings.monthlyRevenue=100000;a.settings.revenueRate=2;let result=compareAnnualContracts(a);const one=result.options[0];
 close(one.annual.common,24000);assert.ok(one.annual.costs.lines.some(x=>x.label==='FGTS dos pagamentos do período'));
 const before=one.annual.costs.total;a.settings.cpp=35;a.settings.rat=3;result=compareAnnualContracts(a);close(result.options[0].annual.costs.total,before);
 a.people=10;result=compareAnnualContracts(a);close(result.options[0].annual.common,24000);
});
test('year-round common revenue costs persist even in months after the harvest',()=>{
 const a=ready();a.need='harvest';a.harvestMonths=3;a.tax='funrural';a.settings.monthlyRevenue=100000;a.settings.revenueRate=2;
 const harvest=compareAnnualContracts(a).options[0];close(harvest.annual.common,24000);close(harvest.months[3].costs.total,harvest.annual.costs.total);close(harvest.months[3].common,8000);
});
test('unconfirmed or missing contribution data cannot produce a lowest-cost conclusion',()=>{
 const a=ready();a.settings.taxConfirmed=false;assert.equal(compareAnnualContracts(a).best,undefined);
 a.settings.taxConfirmed=true;a.tax='funrural';assert.ok(compareAnnualContracts(a).inputIssues.some(x=>x.includes('receita')));
});
test('intermittent prepaid entitlements are not duplicated at month12 termination and alternation is mandatory',()=>{
 const a=ready();a.need='occasional';a.alternating=true;const intermittent=compareAnnualContracts(a).options.find(o=>o.contract==='intermittent')!;
 assert.equal(intermittent.eligible,true);assert.equal(line(intermittent.annual.costs,'Férias adquiridas e proporcionais indenizadas'),0);assert.equal(line(intermittent.annual.costs,'13º proporcional no encerramento'),0);assert.ok(line(intermittent.annual.costs,'13º proporcional pago durante o período')>0);
 a.alternating=false;assert.equal(compareAnnualContracts(a).options.find(o=>o.contract==='intermittent')!.eligible,false);
});
test('short rural contracts need PF and prior calendar periods are not silently ignored',()=>{
 const a=ready();a.need='short';a.employer='pj';assert.equal(compareAnnualContracts(a).options.find(o=>o.contract==='short')!.eligible,false);
 a.employer='pf';a.settings.previousShortMonths=1;assert.equal(compareAnnualContracts(a).options.find(o=>o.contract==='short')!.eligible,false);
});
test('partial costs use the applicable full-time reference floor and the required hours',()=>{
 const a=ready();a.need='partial';a.salary=1000;a.partialWeeklyHours=20;const p=compareAnnualContracts(a).options[0];close(line(p.annual.costs,'Salários do período'),1621/2*12);
});

test('hourly pay is checked against the reference floor and known 44h/42h/40h transition dates',()=>{
 const a=ready();a.need='occasional';a.hourlyRate=7.37;assert.ok(validateContractAnswers(a).some(x=>x.includes('valor-hora')));
 a.hourlyRate=8.11;assert.ok(!validateContractAnswers(a).some(x=>x.includes('valor-hora')));
 a.start='2026-12-20';a.hourlyRate=7.72;assert.ok(validateContractAnswers(a).some(x=>x.includes('valor-hora')));
});
test('contract calculation is pure and does not mutate questionnaire settings between modalities',()=>{
 const a=ready();a.need='harvest';const original=JSON.stringify(a);const r=compareAnnualContracts(a);
 assert.equal(JSON.stringify(a),original);assert.ok(r.options.every(o=>o.months.every(m=>Number.isFinite(m.total)&&m.total>=0)));
});

test('payroll option can include residual SENAR/revenue contribution without losing payroll CPP and RAT',()=>{
 const a=ready();a.payrollRevenue='unknown';assert.ok(validateContractAnswers(a).some(x=>x.includes('complementar')));
 a.payrollRevenue='none';const baseline=compareAnnualContracts(a).options[0].annual;
 a.payrollRevenue='revenue';a.settings.monthlyRevenue=100000;a.settings.revenueRate=.2;const withSenar=compareAnnualContracts(a).options[0].annual;
 close(withSenar.common,2400);close(withSenar.costs.total,baseline.costs.total);close(withSenar.total-baseline.total,2400);
 assert.ok(line(withSenar.costs,'Encargos patronais sobre pagamentos do período')>0);
});

test('switching hiring need ignores stale invalid values in questions that are no longer applicable',()=>{
 const a=ready();a.harvestMonths=0;a.shortMonths=0;a.occasionalDays=0;a.partialWeeklyHours=0;
 assert.equal(validateContractAnswers(a).length,0);assert.ok(compareAnnualContracts(a).best);
 a.need='occasional';a.trialDays=91;a.occasionalDays=8;a.hourlyRate=8.11;
 assert.equal(validateContractAnswers(a).length,0);
});
