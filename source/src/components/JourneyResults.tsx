import { useMemo } from 'react';
import type { Calculation, Scenario } from '../types';
import { useI18n } from '../i18n';
import { analyzeEmployment } from '../staffing';
import { duration } from '../engine';
import { shortDays } from '../defaults';
import { Results } from './Results';

export function JourneyResults({ scenario, results, stage, setStage }: { scenario: Scenario; results: Calculation[]; stage: 42 | 40; setStage: (stage: 42 | 40) => void }) {
  const { t, locale } = useI18n();
  const result = results.find(item => item.stage === stage)!;
  const analysis = useMemo(() => analyzeEmployment(scenario, result), [scenario, result]);
  const money = (value: number) => value.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const planReady = !result.scheduleIssues?.length;
  const paths = [
    { name: 'Contratar em tempo parcial', cost: result.partialCost, detail: `${result.partialCount} · ${duration(result.partialHours)} ${t('por pessoa/semana')}` },
    { name: 'Contratar em tempo integral', cost: result.fullCost, detail: `${result.fullCount} ${t('novas pessoas')} · ${result.target}h ${t('por pessoa/semana')}` },
    { name: 'Pagar horas extras', cost: result.overtimeCost, detail: `${duration(result.overtimeMonthlyHours)} ${t('de HE por mês')}` },
  ];
  // This is the CNC-style volume estimate. Overtime only competes when the actual schedule can cover the gap legally.
  const possible = paths.filter((_, index) => index !== 2 || (!analysis.overtime.reasons.length && !analysis.contextIssues.length && analysis.overtime.remaining < 1e-8));
  const best = analysis.contextIssues.length ? undefined : [...possible].sort((a, b) => a.cost - b.cost)[0];
  return <div className="journey-results">
    <h2>{t('Veja o impacto na sua empresa')}</h2>
    {(result.scheduleKind === 'custom' || !planReady) && <div className={planReady ? 'notice' : 'collective-alert'} role="status"><strong>{t(result.scheduleKind === 'custom' ? 'Jornada personalizada aplicada à etapa selecionada' : 'Confira o revezamento e os descansos')}</strong>{result.scheduleKind === 'custom' && <p>{t('Os horários e o almoço informados são aplicados a todos os empregados deste grupo. Os DSR escolhidos aparecem na escala.')}</p>}{result.scheduleIssues?.map(issue=><p key={issue}>{t(issue)}</p>)}</div>}
    <div className="stage-grid simple-stages">{results.map(item => <button key={item.stage} className={`stage-card ${stage === item.stage ? 'selected' : ''}`} aria-pressed={stage === item.stage} onClick={() => setStage(item.stage)}><span>{t(item.stage === 42 ? 'A partir de 16/12/2026' : 'A partir de 16/12/2027')}</span><strong className="stage-hours">{item.target}<small>{t('h/semana')}</small></strong><p>{t(item.stage === 42 ? 'Até 8h24 por dia na transição' : 'Até 8h por dia')} · {t((item.cycleWeeks ?? 1) > 1 ? 'DSR distribuídos no ciclo por ACT/CCT' : 'Duas folgas na semana')}</p><div className="simple-stage-numbers"><div><b>{duration(item.lostHours)}</b><span>{t('a menos na equipe por semana')}</span></div><div><b>{duration(item.gap)}</b><span>{t('ainda precisam de cobertura')}</span></div></div></button>)}</div>
    <p className="field-help">{t('Regra da liminar: na falta de ACT/CCT celebrado até 15/12/2026, a transição admite 8h24 por dia sem adicional pelos 24 minutos. Havendo instrumento coletivo, confira suas cláusulas.')}</p>
    {(result.cycleWeeks ?? 1)>1 && <p className="field-help">{t('O mapa e a lacuna acima são da semana selecionada. A referência mensal abaixo usa a lacuna média por semana do ciclo')}: {duration(result.costReferenceGap ?? result.gap)}.</p>}
    <section className="result-card simple-costs"><h3>{t('Quanto custa cada caminho?')}</h3><p>{t('Custo adicional por mês, com os encargos informados. A equipe atual mantém o salário.')}</p>
      <div className="simple-answer" role="status">{result.gap < 1e-8 ? t('A equipe atual cobre a demanda nesta sugestão.') : best ? <><strong>{t('Menor custo estimado')}: {t(best.name)}</strong><b>{money(best.cost)}{t('/mês')}</b></> : t('O regime exige análise específica antes de indicar um caminho.')}</div>
      <div className="simple-paths">{paths.map((path, index) => <article key={path.name} className={best === path ? 'best-path' : ''}><h4>{t(path.name)}</h4><strong>{planReady ? money(path.cost) : t('Revisar plano')}</strong><span>{t('adicionais por mês')}</span><p>{path.detail}</p>{index === 2 && <details><summary>{t('Ver viabilidade das horas extras')}</summary>{analysis.overtime.reasons.map(reason => <p key={reason}>{t(reason)}</p>)}<p>{analysis.overtime.people} {t('pessoas do quadro atual')} · {duration(analysis.overtime.extraHours)} {t('de HE por semana')}</p>{analysis.overtime.remaining > 1e-8 && <p>{duration(analysis.overtime.remaining)} {t('ainda descobertas por semana')}</p>}<table className="payroll-table"><thead><tr><th>{t('Dia')}</th><th>{t('Pessoas')}</th><th>{t('Horas extras')}</th></tr></thead><tbody>{shortDays.map((day, dayIndex) => { const assignments = analysis.overtime.assignments.filter(item => item.day === dayIndex && item.extraMinutes > 0); return <tr key={day}><td>{t(day)}</td><td>{assignments.length}</td><td>{duration(assignments.reduce((sum, item) => sum + item.extraMinutes, 0) / 60)}</td></tr>; })}</tbody></table></details>}</article>)}</div>
      {!planReady && <p className="field-help">{t('A comparação de custo fica suspensa enquanto houver pendências na jornada personalizada.')}</p>}
      <p className="field-help">{t('Referência por volume de horas, como na CNC: o custo parcial é proporcional às horas faltantes; o integral usa pessoas inteiras. Não garante que essas pessoas cubram todos os horários. A escala pode exigir mais contratações. HE só entra na indicação se couber nos limites e cobrir a demanda.')}</p>
    </section>
    <details className="journey-detail"><summary>{t('Ver cobertura por horário e sugestão de escala')}</summary><Results scenario={scenario} results={results} stage={stage} setStage={setStage} detailsOnly /></details>
  </div>;
}
