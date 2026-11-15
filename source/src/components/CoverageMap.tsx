import { useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import type { Calculation, Scenario } from '../types';
import { DAY, clockTime, duration } from '../engine';
import { shortDays, dayNames } from '../defaults';
import { analyzeEmployment } from '../staffing';
import { addWorkerCoverage, coverageIntervals, coverageSummary, visibleCoveragePercent } from '../coverage';
import type { CoverageStatus } from '../coverage';
import { useI18n } from '../i18n';

type Scope = 'current' | 'overtime' | 'hiring' | 'hybrid';
const symbols = { covered: '✓', partial: '◐', empty: '×', closed: '—' };
const statusLabels: Record<CoverageStatus, string> = { covered: 'Cobertura completa · 100%', partial: 'Cobertura parcial · entre 0% e 100%', empty: 'Sem cobertura · 0%', closed: 'Sem demanda · ninguém necessário' };
const scopeNames: Record<Scope, string> = { current: 'Equipe atual', overtime: 'Equipe atual + horas extras', hiring: 'Equipe atual + novas contratações', hybrid: 'Equipe atual + horas extras + contratações' };

export function CoverageMap({ scenario, result }: { scenario: Scenario; result: Calculation }) {
  const { t, locale } = useI18n();
  const [scope, setScope] = useState<Scope>('current');
  const [show24, setShow24] = useState(false);
  const [selected, setSelected] = useState<{ day: number; hour: number } | null>(null);
  const analysis = useMemo(() => analyzeEmployment(scenario, result), [scenario, result]);
  const options = useMemo(() => {
    const common = analysis.contextIssues;
    return {
      current: { coverage: result.coverage, reasons: [] as string[], added: 0 },
      overtime: { coverage: analysis.overtime.coverage, reasons: [...analysis.overtime.reasons, ...common], added: 0 },
      hiring: { coverage: addWorkerCoverage(result.coverage, analysis.hiring.workers), reasons: [...analysis.hiring.blocked, ...common], added: analysis.hiring.count },
      hybrid: { coverage: addWorkerCoverage(analysis.overtime.coverage, analysis.complementary.workers), reasons: [...analysis.overtime.reasons, ...analysis.complementary.blocked, ...common], added: analysis.complementary.count },
    };
  }, [analysis, result]);
  const activeScope = options[scope].reasons.length ? 'current' : scope;
  const coverage = options[activeScope].coverage;
  const total = coverageSummary(result.demand, coverage);
  const daily = Array.from({ length: 7 }, (_, day) => coverageSummary(result.demand, coverage, day * DAY, (day + 1) * DAY));
  const hours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour => show24 || daily.some((_, day) => coverageSummary(result.demand, coverage, day * DAY + hour * 60, day * DAY + (hour + 1) * 60).needed > 0));
  const percent = (summary: ReturnType<typeof coverageSummary>) => summary.status === 'closed' ? '—' : `${visibleCoveragePercent(summary.ratio, summary.status).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const intervals = selected ? coverageIntervals(result.demand, coverage, selected.day, selected.hour) : [];
  return <section className="result-card coverage-map" aria-labelledby="coverage-map-title">
    <div className="card-title"><div><span className="eyebrow">{result.target} {t('HORAS POR SEMANA')}</span><h3 id="coverage-map-title"><Clock3 size={20} /> {t('Cobertura, hora a hora')}</h3></div><span className="coverage-number">{percent(total)}<small>{t('da demanda coberta')}</small></span></div>
    <label className="coverage-scope">{t('O que este mapa mostra?')}<select value={activeScope} onChange={event => { setScope(event.target.value as Scope); setSelected(null); }}>{(Object.keys(scopeNames) as Scope[]).map(key => <option key={key} value={key} disabled={options[key].reasons.length > 0}>{t(scopeNames[key])}</option>)}</select></label>
    <p className="coverage-scope-note"><strong>{t(scopeNames[activeScope])}</strong>{options[activeScope].added > 0 && <> · {options[activeScope].added} {t('novas pessoas posicionadas na escala')}</>}{activeScope === 'current' && <> · {t('Sem incluir novas contratações ou horas extras.')}</>}</p>
    <div className="coverage-summary"><span><strong>{duration(total.covered)}</strong> {t('horas-pessoa cobertas')}</span><span><strong>{duration(total.gap)}</strong> {t('horas-pessoa faltantes')}</span><span><strong>{duration(total.needed)}</strong> {t('horas-pessoa necessárias')}</span></div>
    <p className="field-help">{t('Leia o percentual em cada horário: 100% atende toda a demanda; 50% atende metade. Clique ou toque para ver quantas pessoas estão disponíveis e quantas faltam em cada intervalo.')}</p>
    <div className="coverage-key" aria-label={t('Legenda da cobertura')}>{(Object.keys(statusLabels) as CoverageStatus[]).map(status => <span key={status}><i className={`coverage-symbol ${status}`} aria-hidden="true">{symbols[status]}</i>{t(statusLabels[status])}</span>)}</div>
    <label className="check-field coverage-24"><input type="checkbox" checked={show24} onChange={event => setShow24(event.target.checked)} /><span>{t('Mostrar as 24 horas do dia')}</span></label>
    <div className="heatmap-scroll" tabIndex={0} aria-label={t('Mapa de cobertura · role para ver todos os horários')}><table className="coverage-grid"><caption>{t(show24 ? 'Todos os horários · 00h a 24h' : 'Horários com demanda · os demais não têm pessoas solicitadas')}</caption><thead><tr><th scope="col">{t('Dia')}</th>{hours.map(hour => <th scope="col" key={hour}>{String(hour).padStart(2, '0')}h</th>)}</tr></thead><tbody>{shortDays.map((day, dayIndex) => <tr key={day}><th scope="row">{t(day)}</th>{hours.map(hour => {
      const summary = coverageSummary(result.demand, coverage, dayIndex * DAY + hour * 60, dayIndex * DAY + (hour + 1) * 60);
      const label = `${t(dayNames[dayIndex])} ${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00 · ${t(statusLabels[summary.status])} · ${percent(summary)}`;
      return <td key={hour}><button className={`coverage-cell ${summary.status}`} aria-label={label} aria-pressed={selected?.day === dayIndex && selected.hour === hour} onClick={() => setSelected({ day: dayIndex, hour })}><span aria-hidden="true">{summary.status === 'closed' ? '' : symbols[summary.status]}</span><strong>{percent(summary)}</strong></button></td>;
    })}</tr>)}</tbody></table></div>
    {selected && <div className="coverage-hour-detail" aria-live="polite"><h4>{t(dayNames[selected.day])} · {String(selected.hour).padStart(2, '0')}:00–{String(selected.hour + 1).padStart(2, '0')}:00</h4><div className="cost-table-wrap"><table className="payroll-table"><thead><tr><th>{t('Intervalo')}</th><th>{t('Pessoas necessárias')}</th><th>{t('Pessoas disponíveis')}</th><th>{t('Pessoas faltantes')}</th></tr></thead><tbody>{intervals.map(item => <tr key={item.start}><td>{clockTime(item.start)}–{item.end % DAY === 0 ? '24:00' : clockTime(item.end)}</td><td>{item.needed}</td><td>{item.available}</td><td>{item.missing}</td></tr>)}</tbody></table></div><p className="field-help">{t('Os intervalos separam mudanças de equipe, demanda e pausas. Pessoas disponíveis acima da demanda não compensam faltas em outro horário.')}</p></div>}
    <details className="daily-coverage" open><summary>{t('Cobertura de cada dia · todas as 24 horas')}</summary><div className="cost-table-wrap"><table className="payroll-table"><thead><tr><th>{t('Dia')}</th><th>{t('Necessárias · h-pessoa')}</th><th>{t('Cobertas · h-pessoa')}</th><th>{t('Faltantes · h-pessoa')}</th><th>{t('Cobertura')}</th></tr></thead><tbody>{daily.map((summary, day) => <tr key={day}><th scope="row">{t(shortDays[day])}</th><td>{duration(summary.needed)}</td><td>{duration(summary.covered)}</td><td>{duration(summary.gap)}</td><td>{percent(summary)}</td></tr>)}</tbody></table></div></details>
    <p className="field-help">{t('Uma hora-pessoa é uma pessoa trabalhando por uma hora. Exemplo: 3 pessoas por 2 horas = 6 horas-pessoa. O percentual resume somente a demanda de trabalho daquele horário; pausas e minutos fora do funcionamento são tratados separadamente.')}</p>
    {activeScope !== 'current' && <p className="field-help">{t('As novas contratações deste mapa são dimensionadas por horários e podem superar a referência de custo por volume de horas. A tabela de escala a seguir mostra a equipe atual.')}</p>}
    {Object.entries(options).filter(([, option]) => option.reasons.length > 0).length > 0 && <details><summary>{t('Por que algumas opções do mapa estão indisponíveis?')}</summary>{Object.entries(options).filter(([, option]) => option.reasons.length > 0).map(([key, option]) => <div key={key}><strong>{t(scopeNames[key as Scope])}</strong>{option.reasons.map(reason => <p className="field-help" key={reason}>{t(reason)}</p>)}</div>)}</details>}
  </section>;
}
