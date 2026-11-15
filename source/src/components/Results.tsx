import { EmploymentResults } from './EmploymentResults';
import { useI18n } from '../i18n';
import { useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Clock3, Info, CalendarDays, CircleHelp } from 'lucide-react';
import type { Calculation, Scenario } from '../types';
import { clockTime, duration, hourCoverage } from '../engine';
import { shortDays } from '../defaults';

export const money = (value: number, locale = 'pt-BR') => value.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const decimal = (value: number, locale = 'pt-BR') => value.toLocaleString(locale, { maximumFractionDigits: 1 });

export function Results({ scenario, results, stage, setStage }: { scenario: Scenario; results: Calculation[]; stage: 42 | 40; setStage: (stage: 42 | 40) => void }) {
  const { t, locale } = useI18n();
  const formatMoney = (value: number) => money(value, locale);
  const formatDecimal = (value: number) => decimal(value, locale);
  const [showAll, setShowAll] = useState(false);
  const current = results.find(result => result.stage === stage)!;
  const activeHours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour => results.some(result => Array.from({ length: 7 }, (_, day) => day).some(day => hourCoverage(result, day, hour).demand > 0)));
  const special = scenario.scale === '12x36' || scenario.scale === 'turnos';
  return <div className="results-panel">
    <div className="results-heading"><div><span className="eyebrow">{t("SEU DIAGNÓSTICO")}</span><h2>{t("O impacto na sua operação")}</h2></div><span className="simulation-tag">{t("Valores ilustrativos")}</span></div>
    <div className="diagnosis"><ChartNoAxesCombined size={25} /><div><strong>{current.gap > 0 ? t(`${duration(current.gap)} por semana ainda precisam de cobertura.`) : t("A demanda informada cabe na sugestão de escala.")}</strong><p>{current.gap > 0 ? t("Compare os caminhos abaixo. A falta em horários específicos pode existir mesmo quando há horas disponíveis na equipe.") : t("Confira os horários, intervalos e as condições da categoria antes de utilizar a sugestão.")}</p></div></div>
    {special && <div className="notice"><strong>{t("Regime exige análise própria.")}</strong> {t(" A comparação abaixo modela uma migração para 5×2. Não calcula nem valida a manutenção de ")}{scenario.scale === '12x36' ? '12×36' : t("turnos variados")}.</div>}
    <div className="stage-grid">
      {results.map(result => <button className={`stage-card ${stage === result.stage ? 'selected' : ''}`} key={result.stage} onClick={() => setStage(result.stage)} aria-pressed={stage === result.stage}>
        <span className="stage-label">{t("ETAPA ")}{result.stage === 42 ? '01' : '02'} <span>{result.stage === 42 ? t("16 DEZ 2026") : t("16 DEZ 2027")}</span></span>
        <div className="stage-hours">{result.target}<span>{t("h/semana")}</span></div>
        <div className="stage-subtitle">{result.stage === 42 ? t("Até 8h24/dia · regra transitória¹") : t("Até 8h/dia · modelo padrão")}<br />{t("Duas folgas na semana")}</div>
        <div className="stage-metrics"><div><span>{t("Horas contratadas a menos")}</span><strong>{duration(result.lostHours)}<small>{t("/sem")}</small></strong></div><div><span>{t("Lacuna na sugestão")}</span><strong>{duration(result.gap)}<small>{t("/sem")}</small></strong></div><div><span>{t("Valor da hora normal")}</span><strong>+{formatDecimal(result.hourlyIncrease)}<small>%</small></strong></div><div><span>{t("Divisor de referência²")}</span><strong>{formatDecimal(scenario.currentHours * 5)} → {formatDecimal(result.divisor)}</strong></div></div>
        <span className="stage-select">{stage === result.stage ? t("Etapa em visualização") : t("Visualizar esta etapa")} <ArrowUpRight size={14} /></span>
      </button>)}
    </div>
    <p className="footnote">{t("¹ Na ausência de ACT/CCT celebrado até 15/12/2026, a cautelar admite 8h24 sem adicional pelos 24min, na etapa intermediária. Se houver instrumento, conferir suas cláusulas. Jornadas menores são preservadas. ² Premissa de mensalista comum; divisores especiais exigem revisão.")}</p>

    <EmploymentResults scenario={scenario} result={current} />

    <details className="economic-reference"><summary>{t('Referência econômica por volume de horas')}</summary>
    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">{t("PLANEJAMENTO FINANCEIRO")}</span><h3>{t("Quanto custa cada caminho?")}</h3></div><span className="muted">{t("Adicional mensal estimado")}</span></div>
      <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>{t("Caminho")}</th>{results.map(result => <th key={result.stage}>{result.target}h <span>{t("/ semana")}</span></th>)}</tr></thead><tbody>
        <tr><td><strong>{t("Reorganizar a equipe")}</strong><small>{t("Primeira medida · não elimina lacunas automaticamente")}</small></td><td>{t("Sem custo direto")}<br /><small>{duration(results[0].gap)} {t(" ainda descobertas")}</small></td><td>{t("Sem custo direto")}<br /><small>{duration(results[1].gap)} {t(" ainda descobertas")}</small></td></tr>
        <tr className="highlight-row"><td><strong>{t("Nova contratação parcial")}</strong><small>{t("Equivalência econômica · até 30h por contrato")}</small></td>{results.map(result => <td key={result.stage}><strong>{formatMoney(result.partialCost)}</strong><small>{result.partialCount ? t(`${result.partialCount} contrato(s) de ${duration(result.partialHours)}/sem`) : t("Sem lacuna na sugestão")}</small></td>)}</tr>
        <tr><td><strong>{t("Nova contratação integral")}</strong><small>{t("Arredondamento para postos inteiros")}</small></td>{results.map(result => <td key={result.stage}><strong>{formatMoney(result.fullCost)}</strong><small>{result.fullCount} {t(" contratação(ões)")}</small></td>)}</tr>
        <tr><td><strong>{t("Horas extras")}</strong><small>{t("Referência de custo · viabilidade não validada")}</small></td>{results.map(result => <td key={result.stage}><strong>{formatMoney(result.overtimeCost)}</strong><small>{duration(result.overtimeMonthlyHours)}{t("/mês estimadas")}</small></td>)}</tr>
      </tbody></table></div>
      <div className="cost-bars" aria-label={t("Comparação visual de custos da etapa selecionada")}>{[[t("Parcial"), current.partialCost], ['Integral', current.fullCost], [t("Horas extras"), current.overtimeCost]].map(([label, cost]) => <div className="cost-bar-row" key={String(label)}><span>{t(String(label))}</span><div className="cost-track"><div style={{ width: `${Number(cost) / (Math.max(current.partialCost, current.fullCost, current.overtimeCost) || 1) * 100}%` }} /></div><strong>{formatMoney(Number(cost))}</strong></div>)}</div>
      <div className="inline-note"><Info size={16} /><p>{t('Esta referência compara volume de horas e não dimensiona a cobertura. O orçamento e a recomendação por escala estão na comparação detalhada acima.')}</p></div>
    </section>

    </details>

    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">{t("ETAPA ")}{stage === 42 ? '01' : '02'} · {current.target} {t(" HORAS")}</span><h3><Clock3 size={20} /> {t(" Cobertura, hora a hora")}</h3></div><span className="coverage-number">{formatDecimal(current.coveragePercent)}<small>{t("% coberta")}</small></span></div>
      <div className="coverage-summary"><span><strong>{duration(current.coveredHours)}</strong> {t(" cobertas")}</span><span><strong>{duration(current.gap)}</strong> {t(" descobertas")}</span><span><strong>{duration(current.demandedHours)}</strong> {t(" demandadas")}</span></div>
      <div className="heatmap-scroll"><div className="heatmap" style={{ gridTemplateColumns: `38px repeat(${activeHours.length || 1}, minmax(25px, 1fr))` }} role="table" aria-label={t("Cobertura por dia e hora")}>
        <span />{activeHours.map(hour => <span className="hour-label" key={hour}>{hour}h</span>)}
        {shortDays.map((dayName, day) => <div className="heatmap-day" role="row" key={day}><span className="heatmap-day-label">{t(dayName)}</span>{activeHours.map(hour => {
          const cell = hourCoverage(current, day, hour);
          const status = !cell.demand ? 'closed' : cell.ratio >= 0.9999 ? 'covered' : cell.ratio > 0 ? 'partial' : 'empty';
          const description = `${dayName} ${hour}h: ${duration(cell.covered)} de ${duration(cell.demand)}-pessoa cobertas (${formatDecimal(cell.ratio * 100)}%)`;
          return <span tabIndex={0} role="cell" className={`heat-cell ${status}`} key={hour} title={t(description)} aria-label={t(description)}><span className="cell-detail">{!cell.demand ? '—' : cell.ratio >= 0.9999 ? '✓' : cell.ratio > 0 ? '◐' : '×'}</span></span>;
        })}</div>)}
      </div></div>
      <div className="heat-legend"><span><i className="covered" /> {t(" Coberto")}</span><span><i className="partial" /> {t(" Parcial")}</span><span><i className="empty" /> {t(" Descoberto")}</span><span><i className="closed" /> {t(" Sem demanda")}</span></div>
      <p className="field-help">{t("Cada célula resume 60 minutos. Passe o cursor ou use o teclado para consultar horas-pessoa. As pausas são descontadas minuto a minuto, inclusive após meia-noite.")}</p>
    </section>

    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">{t("PROPOSTA DE ORGANIZAÇÃO")}</span><h3><CalendarDays size={20} /> {t(" A escala da sua equipe")}</h3></div><span className="simulation-tag">{t("Sugestão automática")}</span></div>
      <p className="muted">{t("Até ")}{duration(current.dailyCap / 60)} {t(" de trabalho por dia e ")}{current.target}{t("h por semana. Intervalo fora da jornada. Horários com “+1” terminam no dia seguinte.")}</p>
      <div className="schedule-scroll"><table className="schedule-table"><thead><tr><th>{t("Empregado")}</th>{shortDays.map(day => <th key={day}>{t(day)}</th>)}<th>{t("Semana")}</th></tr></thead><tbody>{current.workers.map((worker, index) => <tr key={worker.number} className={index >= 12 && !showAll ? 'extra-worker' : ''}><th>E{String(worker.number).padStart(2, '0')}</th>{shortDays.map((_, day) => {
        const shift = worker.shifts.find(s => s.day === day);
        return <td className={shift ? '' : 'off-cell'} key={day}>{shift ? <><strong>{clockTime(shift.start)}–{clockTime(shift.end)}{Math.floor(shift.end / 1440) > day ? ' +1' : ''}</strong><small>{shift.breakMinutes ? `${clockTime(shift.breakStart)} · ${t(`${shift.breakMinutes}min pausa`)}` : t("Sem intervalo obrigatório")}</small></> : t("Folga / não alocado")}</td>;
      })}<td className="week-total">{duration(worker.minutes / 60)}</td></tr>)}</tbody></table></div>
      {current.workers.length > 12 && <button className="text-button" onClick={() => setShowAll(!showAll)}>{showAll ? t("Mostrar menos") : t(`Mostrar os ${current.workers.length} empregados`)}</button>}
      <div className="schedule-checks"><span>{t("✓ Máximo de cinco dias de início de jornada")}</span><span>{t("✓ Descanso entre jornadas ≥ 11h")}</span><span>{t("✓ Uma janela de descanso ≥ 35h no ciclo")}</span><span>{t("✓ Limites diário e semanal do modelo")}</span></div>
      <p className="footnote">{t("O motor usa busca heurística e duas folgas consecutivas. Não prova que a lacuna seja inevitável: outras escalas podem melhorar a cobertura. Folgas e repousos em turnos noturnos, domingos, feriados, pausas de SST e regras específicas precisam de revisão. “Não alocado” não indica redução salarial.")}</p>
    </section>

    <section className="result-card compact-card"><h3><CircleHelp size={19} /> {t(" Como interpretar os resultados")}</h3><div className="interpret-grid"><div><strong>{duration(current.lostHours)}</strong><span>{t("Redução da capacidade contratada")}</span></div><div><strong>{duration(current.capacityGap)}</strong><span>{t("Déficit mínimo por volume de horas")}</span></div><div><strong>{duration(current.gap)}</strong><span>{t("Lacuna da escala proposta")}</span></div></div><p className="field-help">{t("Capacidade semanal não equivale a disponibilidade simultânea. A escala atual não foi reconstruída; a diferença contratual usa apenas a jornada informada. Se a operação já demanda mais do que a equipe oferece hoje, o problema antecede a mudança.")}</p></section>
  </div>;
}
