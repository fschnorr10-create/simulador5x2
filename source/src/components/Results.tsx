import { useState } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Clock3, Info, CalendarDays, CircleHelp } from 'lucide-react';
import type { Calculation, Scenario } from '../types';
import { clockTime, duration, hourCoverage } from '../engine';
import { shortDays } from '../defaults';

export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const decimal = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function Results({ scenario, results, stage, setStage }: { scenario: Scenario; results: Calculation[]; stage: 42 | 40; setStage: (stage: 42 | 40) => void }) {
  const [showAll, setShowAll] = useState(false);
  const current = results.find(result => result.stage === stage)!;
  const activeHours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour => results.some(result => Array.from({ length: 7 }, (_, day) => day).some(day => hourCoverage(result, day, hour).demand > 0)));
  const special = scenario.scale === '12x36' || scenario.scale === 'turnos';
  return <div className="results-panel">
    <div className="results-heading"><div><span className="eyebrow">SEU DIAGNÓSTICO</span><h2>O impacto na sua operação</h2></div><span className="simulation-tag">Valores ilustrativos</span></div>
    <div className="diagnosis"><ChartNoAxesCombined size={25} /><div><strong>{current.gap > 0 ? `${duration(current.gap)} por semana ainda precisam de cobertura.` : 'A demanda informada cabe na sugestão de escala.'}</strong><p>{current.gap > 0 ? 'Compare os caminhos abaixo. A falta em horários específicos pode existir mesmo quando há horas disponíveis na equipe.' : 'Confira os horários, intervalos e as condições da categoria antes de utilizar a sugestão.'}</p></div></div>
    {special && <div className="notice"><strong>Regime exige análise própria.</strong> A comparação abaixo modela uma migração para 5×2. Não calcula nem valida a manutenção de {scenario.scale === '12x36' ? '12×36' : 'turnos variados'}.</div>}
    <div className="stage-grid">
      {results.map(result => <button className={`stage-card ${stage === result.stage ? 'selected' : ''}`} key={result.stage} onClick={() => setStage(result.stage)} aria-pressed={stage === result.stage}>
        <span className="stage-label">ETAPA {result.stage === 42 ? '01' : '02'} <span>{result.stage === 42 ? '16 DEZ 2026' : '16 DEZ 2027'}</span></span>
        <div className="stage-hours">{result.target}<span>h/semana</span></div>
        <div className="stage-subtitle">{result.stage === 42 ? 'Até 8h24/dia · regra transitória¹' : 'Até 8h/dia · modelo padrão'}<br />Duas folgas na semana</div>
        <div className="stage-metrics"><div><span>Horas contratadas a menos</span><strong>{duration(result.lostHours)}<small>/sem</small></strong></div><div><span>Lacuna na sugestão</span><strong>{duration(result.gap)}<small>/sem</small></strong></div><div><span>Valor da hora normal</span><strong>+{decimal(result.hourlyIncrease)}<small>%</small></strong></div><div><span>Divisor de referência²</span><strong>{decimal(scenario.currentHours * 5)} → {decimal(result.divisor)}</strong></div></div>
        <span className="stage-select">{stage === result.stage ? 'Etapa em visualização' : 'Visualizar esta etapa'} <ArrowUpRight size={14} /></span>
      </button>)}
    </div>
    <p className="footnote">¹ Na ausência de ACT/CCT celebrado até 15/12/2026, a cautelar admite 8h24 sem adicional pelos 24min, na etapa intermediária. Se houver instrumento, conferir suas cláusulas. Jornadas menores são preservadas. ² Premissa de mensalista comum; divisores especiais exigem revisão.</p>

    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">PLANEJAMENTO FINANCEIRO</span><h3>Quanto custa cada caminho?</h3></div><span className="muted">Adicional mensal estimado</span></div>
      <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>Caminho</th>{results.map(result => <th key={result.stage}>{result.target}h <span>/ semana</span></th>)}</tr></thead><tbody>
        <tr><td><strong>Reorganizar a equipe</strong><small>Primeira medida · não elimina lacunas automaticamente</small></td><td>Sem custo direto<br /><small>{duration(results[0].gap)} ainda descobertas</small></td><td>Sem custo direto<br /><small>{duration(results[1].gap)} ainda descobertas</small></td></tr>
        <tr className="highlight-row"><td><strong>Nova contratação parcial</strong><small>Equivalência econômica · até 30h por contrato</small></td>{results.map(result => <td key={result.stage}><strong>{money(result.partialCost)}</strong><small>{result.partialCount ? `${result.partialCount} contrato(s) de ${duration(result.partialHours)}/sem` : 'Sem lacuna na sugestão'}</small></td>)}</tr>
        <tr><td><strong>Nova contratação integral</strong><small>Arredondamento para postos inteiros</small></td>{results.map(result => <td key={result.stage}><strong>{money(result.fullCost)}</strong><small>{result.fullCount} contratação(ões)</small></td>)}</tr>
        <tr><td><strong>Horas extras</strong><small>Referência de custo · viabilidade não validada</small></td>{results.map(result => <td key={result.stage}><strong>{money(result.overtimeCost)}</strong><small>{duration(result.overtimeMonthlyHours)}/mês estimadas</small></td>)}</tr>
      </tbody></table></div>
      <div className="cost-bars" aria-label="Comparação visual de custos da etapa selecionada">{[['Parcial', current.partialCost], ['Integral', current.fullCost], ['Horas extras', current.overtimeCost]].map(([label, cost]) => <div className="cost-bar-row" key={String(label)}><span>{label}</span><div className="cost-track"><div style={{ width: `${Number(cost) / (Math.max(current.partialCost, current.fullCost, current.overtimeCost) || 1) * 100}%` }} /></div><strong>{money(Number(cost))}</strong></div>)}</div>
      <div className="inline-note"><Info size={16} /><p>Custos não garantem cobertura nos horários descobertos. Novos contratos devem respeitar piso, benefícios e regras aplicáveis. HE depende de limites, repousos e autorização; não substitui a segunda folga. Encargos de {decimal(scenario.charges)}%, HE de {decimal(scenario.extraRate)}%, DSR de {decimal(scenario.dsrRate)}% e fator mensal {decimal(scenario.monthlyWeeks)}.</p></div>
    </section>

    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">ETAPA {stage === 42 ? '01' : '02'} · {current.target} HORAS</span><h3><Clock3 size={20} /> Cobertura, hora a hora</h3></div><span className="coverage-number">{decimal(current.coveragePercent)}<small>% coberta</small></span></div>
      <div className="coverage-summary"><span><strong>{duration(current.coveredHours)}</strong> cobertas</span><span><strong>{duration(current.gap)}</strong> descobertas</span><span><strong>{duration(current.demandedHours)}</strong> demandadas</span></div>
      <div className="heatmap-scroll"><div className="heatmap" style={{ gridTemplateColumns: `38px repeat(${activeHours.length || 1}, minmax(25px, 1fr))` }} role="table" aria-label="Cobertura por dia e hora">
        <span />{activeHours.map(hour => <span className="hour-label" key={hour}>{hour}h</span>)}
        {shortDays.map((dayName, day) => <div className="heatmap-day" role="row" key={day}><span className="heatmap-day-label">{dayName}</span>{activeHours.map(hour => {
          const cell = hourCoverage(current, day, hour);
          const status = !cell.demand ? 'closed' : cell.ratio >= 0.9999 ? 'covered' : cell.ratio > 0 ? 'partial' : 'empty';
          const description = `${dayName} ${hour}h: ${duration(cell.covered)} de ${duration(cell.demand)}-pessoa cobertas (${decimal(cell.ratio * 100)}%)`;
          return <span tabIndex={0} role="cell" className={`heat-cell ${status}`} key={hour} title={description} aria-label={description}><span className="cell-detail">{!cell.demand ? '—' : cell.ratio >= 0.9999 ? '✓' : cell.ratio > 0 ? '◐' : '×'}</span></span>;
        })}</div>)}
      </div></div>
      <div className="heat-legend"><span><i className="covered" /> Coberto</span><span><i className="partial" /> Parcial</span><span><i className="empty" /> Descoberto</span><span><i className="closed" /> Sem demanda</span></div>
      <p className="field-help">Cada célula resume 60 minutos. Passe o cursor ou use o teclado para consultar horas-pessoa. As pausas são descontadas minuto a minuto, inclusive após meia-noite.</p>
    </section>

    <section className="result-card">
      <div className="card-title"><div><span className="eyebrow">PROPOSTA DE ORGANIZAÇÃO</span><h3><CalendarDays size={20} /> A escala da sua equipe</h3></div><span className="simulation-tag">Sugestão automática</span></div>
      <p className="muted">Até {duration(current.dailyCap / 60)} de trabalho por dia e {current.target}h por semana. Intervalo fora da jornada. Horários com “+1” terminam no dia seguinte.</p>
      <div className="schedule-scroll"><table className="schedule-table"><thead><tr><th>Empregado</th>{shortDays.map(day => <th key={day}>{day}</th>)}<th>Semana</th></tr></thead><tbody>{current.workers.map((worker, index) => <tr key={worker.number} className={index >= 12 && !showAll ? 'extra-worker' : ''}><th>E{String(worker.number).padStart(2, '0')}</th>{shortDays.map((_, day) => {
        const shift = worker.shifts.find(s => s.day === day);
        return <td className={shift ? '' : 'off-cell'} key={day}>{shift ? <><strong>{clockTime(shift.start)}–{clockTime(shift.end)}{Math.floor(shift.end / 1440) > day ? ' +1' : ''}</strong><small>{shift.breakMinutes ? `${clockTime(shift.breakStart)} · ${shift.breakMinutes}min pausa` : 'Sem intervalo obrigatório'}</small></> : 'Folga / não alocado'}</td>;
      })}<td className="week-total">{duration(worker.minutes / 60)}</td></tr>)}</tbody></table></div>
      {current.workers.length > 12 && <button className="text-button" onClick={() => setShowAll(!showAll)}>{showAll ? 'Mostrar menos' : `Mostrar os ${current.workers.length} empregados`}</button>}
      <div className="schedule-checks"><span>✓ Máximo de cinco dias de início de jornada</span><span>✓ Descanso entre jornadas ≥ 11h</span><span>✓ Uma janela de descanso ≥ 35h no ciclo</span><span>✓ Limites diário e semanal do modelo</span></div>
      <p className="footnote">O motor usa busca heurística e duas folgas consecutivas. Não prova que a lacuna seja inevitável: outras escalas podem melhorar a cobertura. Folgas e repousos em turnos noturnos, domingos, feriados, pausas de SST e regras específicas precisam de revisão. “Não alocado” não indica redução salarial.</p>
    </section>

    <section className="result-card compact-card"><h3><CircleHelp size={19} /> Como interpretar os resultados</h3><div className="interpret-grid"><div><strong>{duration(current.lostHours)}</strong><span>Redução da capacidade contratada</span></div><div><strong>{duration(current.capacityGap)}</strong><span>Déficit mínimo por volume de horas</span></div><div><strong>{duration(current.gap)}</strong><span>Lacuna da escala proposta</span></div></div><p className="field-help">Capacidade semanal não equivale a disponibilidade simultânea. A escala atual não foi reconstruída; a diferença contratual usa apenas a jornada informada. Se a operação já demanda mais do que a equipe oferece hoje, o problema antecede a mudança.</p></section>
  </div>;
}
