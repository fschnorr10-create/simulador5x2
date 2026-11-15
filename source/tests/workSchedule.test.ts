import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultScenario } from '../src/defaults.ts';
import { calculate, validateScenario, WEEK } from '../src/engine.ts';
import { defaultWorkSchedule, dailyWork, assessWorkSchedule, applyOperatingTemplate, validateWorkSchedules, workScheduleShifts } from '../src/workSchedule.ts';
import { analyzeEmployment } from '../src/staffing.ts';
import { compareAllContracts } from '../src/contractComparison.ts';

function planned(stage:42|40=42) {
 const s=defaultScenario();s.collective='nao';s.workSchedules={[stage]:defaultWorkSchedule(s,stage)};return s;
}

test('one general operating template updates selected days and preserves exceptions and weekends',()=>{
 const s=defaultScenario();const saturday=JSON.stringify(s.days[5]);
 const updated=applyOperatingTemplate(s,{open:'07:00',close:'16:00',people:4,days:[0,1,2,3,4],exceptions:[2]});
 assert.equal(updated.days[0].bands[0].open,'07:00');assert.equal(updated.days[4].bands[0].people,4);
 assert.deepEqual(updated.days[2],s.days[2]);assert.equal(JSON.stringify(updated.days[5]),saturday);assert.equal(s.days[0].bands[0].open,'08:00');
});
test('all-day and overnight duration, lunch and actual working minutes are explicit',()=>{
 assert.equal(dailyWork({start:'08:00',mealStart:'12:00',mealEnd:'13:00',end:'17:24'}).work,504);
 const night=dailyWork({start:'22:00',mealStart:'02:00',mealEnd:'03:00',end:'07:00'});assert.equal(night.work,480);assert.equal(night.pause,60);assert.equal(night.validMeal,true);
 assert.equal(dailyWork({start:'08:00',mealStart:'18:00',mealEnd:'19:00',end:'17:00'}).validMeal,false);
});
test('Mon-Fri 42h creates exact 8h24 days, lunch excluded and Saturday/Sunday DSR',()=>{
 const s=planned();const r=calculate(s,42),p=s.workSchedules![42]!;
 assert.equal(validateScenario(s).length,0);assert.equal(assessWorkSchedule(s,42).issues.length,0);
 assert.equal(p.weeks[0][5].kind,'dsr');assert.equal(p.weeks[0][6].kind,'dsr');
 assert.equal(r.scheduleKind,'custom');assert.equal(r.workers[0].minutes,2520);assert.equal(r.workers[0].shifts.length,5);
 assert.equal(r.workers[0].shifts[0].end,1044);assert.equal(r.coverage[12*60+30],0);assert.equal(r.coverage[8*60],s.employees);
});
test('40h schedule uses 8h and editing one stage leaves the other stage automatic',()=>{
 const s=planned(40);assert.equal(calculate(s,40).workers[0].minutes,2400);assert.equal(calculate(s,42).scheduleKind,'automatic');
});
test('adding 24 minutes beyond the transitional exception is red-flagged, not ordinary free work',()=>{
 const s=planned();const p=s.workSchedules![42]!;for(const day of p.weeks[0])if(day.kind==='work')day.end='17:48';
 const a=assessWorkSchedule(s,42);assert.equal(a.requiresCollective,true);assert.ok(a.issues.some(x=>x.includes('ACT')));assert.ok(a.issues.some(x=>x.includes('supera')));
 s.collective='sim';s.collectiveRef='ACT de teste, cláusula jornada';assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('supera')));
});
test('custom nonconsecutive DSR requires an identified collective instrument',()=>{
 const s=planned();const p=s.workSchedules![42]!;p.weeks[0][2].kind='dsr';p.weeks[0][5].kind='work';
 assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('ACT')));
 s.collective='sim';s.collectiveRef='ACT vigente, cláusula 12';assert.equal(assessWorkSchedule(s,42).issues.length,0);
 assert.equal(calculate(s,42).workers[0].shifts.some(shift=>shift.day===2),false);assert.equal(calculate(s,42).workers[0].shifts.some(shift=>shift.day===5),true);
});
test('four-week rest compensation preserves all eight DSR and a Sunday at least every four weeks',()=>{
 const s=planned();s.collective='sim';s.collectiveRef='CCT teste';const p=s.workSchedules![42]!;p.cycleWeeks=4;
 p.weeks[0][5].kind='work';p.weeks[0][6].kind='work';p.weeks[1][3].kind='dsr';p.weeks[1][4].kind='dsr';
 const a=assessWorkSchedule(s,42);assert.equal(a.restDays,8);assert.ok(!a.issues.some(x=>x.includes('quantidade')));assert.ok(a.notices.some(x=>x.includes('No ciclo compensatório')));
 for(const week of p.weeks){week[6].kind='work';week[0].kind='dsr';}
 assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('domingo')));
});
test('Sunday cycle checks the maximum cyclic gap, with stricter three-week commerce checks',()=>{
 const s=planned();s.collective='sim';s.collectiveRef='CCT';const p=s.workSchedules![42]!;p.cycleWeeks=4;
 for(let w=0;w<3;w++){p.weeks[w][6].kind='work';p.weeks[w][0].kind='dsr';}
 assert.equal(assessWorkSchedule(s,42).sundayGap,28);assert.ok(!assessWorkSchedule(s,42).issues.some(x=>x.includes('domingo de descanso')));
 s.sector='comercio';assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('três semanas')));
});
test('inadequate lunch, excessive continuous work and short interday rests remain review issues',()=>{
 const s=planned();const p=s.workSchedules![42]!;
 p.weeks[0][0]={kind:'work',start:'08:00',mealStart:'14:30',mealEnd:'14:45',end:'18:00'};
 assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('intervalo')));assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('seis horas')));
 p.weeks[0][0]={kind:'work',start:'18:00',mealStart:'22:00',mealEnd:'23:00',end:'03:00'};
 assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('11h')));
});
test('overnight work cannot consume a day marked as full DSR',()=>{
 const s=planned();s.workSchedules![42]!.weeks[0][4]={kind:'work',start:'22:00',mealStart:'02:00',mealEnd:'03:00',end:'07:00'};
 assert.ok(assessWorkSchedule(s,42).issues.some(x=>x.includes('jornada noturna')));
});
test('selected week uses the actual custom shifts and protects calculations from unreviewed plans',()=>{
 const s=planned();s.planning!.taxConfirmed=true;s.planning!.overtimeAuthorized=true;const p=s.workSchedules![42]!;p.cycleWeeks=4;p.shownWeek=1;p.weeks[1][0].kind='dsr';
 const r=calculate(s,42);assert.equal(r.coverage[8*60],0);assert.equal(r.workers[0].shifts.some(shift=>shift.day===0),false);
 const comparison=compareAllContracts(s,r);assert.equal(comparison.best,undefined);assert.equal(analyzeEmployment(s,r).overtime.extraHours,0);
});
test('import validates optional templates, all four weeks, clock fields and calendar alignment',()=>{
 const s=planned();assert.equal(validateScenario(JSON.parse(JSON.stringify(s))).length,0);
 assert.ok(validateWorkSchedules({42:{...s.workSchedules![42],cycleStart:'2026-12-22'}}).length);
 assert.ok(validateWorkSchedules({42:{...s.workSchedules![42],weeks:[]}}).length);
 assert.ok(validateScenario({...s,operatingTemplate:{open:'30:00',close:'18:00',people:2,days:[7],exceptions:[]}}).length);
 assert.equal(workScheduleShifts(s.workSchedules![42]!).length,5);assert.equal(calculate(defaultScenario(),42).coverage.length,WEEK);
});

test('cycle financial reference averages all weeks and does not change with selected week',()=>{
 const s=planned();s.collective='sim';s.collectiveRef='ACT compensação';s.planning!.overtimeAuthorized=true;const p=s.workSchedules![42]!;p.cycleWeeks=4;
 p.weeks[0][5].kind='work';p.weeks[1][4].kind='dsr';
 const first=calculate(s,42);p.shownWeek=1;const second=calculate(s,42);
 assert.notEqual(first.gap,second.gap);assert.equal(first.partialCost,second.partialCost);assert.equal(first.costReferenceGap,second.costReferenceGap);
 let totalGap=0;for(let week=0;week<4;week++){p.shownWeek=week;totalGap+=calculate(s,42).gap;}
 assert.ok(Math.abs(first.costReferenceGap!-totalGap/4)<1e-8);
 assert.equal(assessWorkSchedule(s,42).issues.length,0);assert.ok(analyzeEmployment(s,first).overtime.reasons.some(x=>x.includes('ciclo completo')));
});

test('an already smaller 40h week does not incorrectly require the Dino 8h24 exception',()=>{
 const s=defaultScenario();s.currentHours=40;s.collective='nao-sei';s.workSchedules={42:defaultWorkSchedule(s,42)};
 assert.equal(assessWorkSchedule(s,42).issues.length,0);assert.equal(assessWorkSchedule(s,42).requiresCollective,false);
});

test('an automatically repeated week cannot silently approve permanent Sunday work',()=>{
 const s=defaultScenario();s.days=s.days.map(day=>({...day,bands:[{id:day.name,open:'08:00',close:'18:00',people:9}]}));
 const result=calculate(s,42);assert.ok(result.workers.some(worker=>worker.shifts.some(shift=>shift.day===6)));
 assert.ok(result.scheduleIssues?.some(issue=>issue.includes('domingo de descanso')));
});

test('incomplete native time fields remain safe editable drafts instead of crashing previews',()=>{
 const draft=dailyWork({start:'',mealStart:'12:00',mealEnd:'13:00',end:'17:24'});
 assert.equal(draft.validTime,false);assert.equal(draft.work,0);
 const s=planned();s.workSchedules![42]!.weeks[0][0].start='';
 assert.ok(validateScenario(s).length);assert.ok(assessWorkSchedule(s,42).issues.some(issue=>issue.includes('horários')));
});
