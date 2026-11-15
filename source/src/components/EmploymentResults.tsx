import { useMemo } from 'react';
import type { Calculation, Scenario } from '../types';
import { useI18n } from '../i18n';
import { analyzeEmployment } from '../staffing';
import { contractNames, costSources, taxNames } from '../payroll';
import { DAY, duration } from '../engine';
import { shortDays } from '../defaults';

export function EmploymentResults({ scenario, result }: { scenario: Scenario; result: Calculation }) {
  const { t, locale } = useI18n();
  const analysis = useMemo(() => analyzeEmployment(scenario, result), [scenario, result]);
  const { p, base, currentMonthly, hiring, overtime, complementary, hybridCost } = analysis;
  const currency = (value: number) => value.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const daily = scenario.days.map((_, day) => {
    let hours = 0, gap = 0, remaining = 0, peak = 0;
    for (let minute = day * DAY; minute < (day + 1) * DAY; minute++) {
      hours += result.demand[minute] / 60;
      gap += Math.max(0, result.demand[minute] - result.coverage[minute]) / 60;
      remaining += Math.max(0, result.demand[minute] - overtime.coverage[minute]) / 60;
      peak = Math.max(peak, result.demand[minute]);
    }
    const assignments = overtime.assignments.filter(item => item.day === day && item.extraMinutes > 0);
    const cap = Math.min(p.overtimeDailyLimit, Math.max(0, (600 - result.dailyCap) / 60));
    return { day, hours, gap, remaining, peak, assignments, minPeople: cap > 0 ? Math.ceil((gap - 1e-8) / cap) : 0 };
  });
  return <div className="employment-results">
    <section className="result-card employment-summary" aria-labelledby="economic-recommendation">
      <span className="eyebrow">{t('CONTRATAR OU FAZER HORAS EXTRAS?')}</span><h3 id="economic-recommendation">{t(analysis.recommendation)}</h3>
      <p className="field-help">{t('A conclusão compara alternativas que cobrem a mesma demanda neste modelo. Menor custo não equivale a autorização jurídica nem prova de escala ótima.')}</p>
      <div className="employment-kpis"><div><span>{t('Pessoas que a empresa já possui')}</span><strong>{scenario.employees}</strong></div><div><span>{t('Custo mensal atual do grupo')}</span><strong>{currency(currentMonthly)}</strong></div><div><span>{t('Empregados alocados em HE')}</span><strong>{overtime.people}</strong></div><div><span>{t('HE planejadas por semana')}</span><strong>{duration(overtime.extraHours)}</strong></div></div>
      {analysis.salary > scenario.salary && <p className="notice">{t('A referência de custo foi elevada ao piso informado.')}</p>}
      {!p.taxConfirmed && <p className="notice">{t('Valores provisórios: confirme o perfil tributário, o piso e as alíquotas no formulário.')}</p>}
      {p.taxProfile === 'ruralRevenue' && (!p.monthlyRevenue || !p.revenueRate) && <p className="notice">{t('A contribuição sobre receita rural está incompleta. Informe receita e alíquota vigente antes de usar o custo total.')}</p>}
      <div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>{t('Alternativa')}</th><th>{t('Novas pessoas')}</th><th>{t('Adicional por mês')}</th><th>{t('Total do grupo por mês')}</th><th>{t('Cobertura restante')}</th></tr></thead><tbody>
        <tr><td>{t('Contratar na modalidade escolhida')}<small>{t(contractNames[p.contract])}</small></td><td>{hiring.count}</td><td>{currency(hiring.cost)}</td><td>{currency(currentMonthly + hiring.cost)}</td><td>{duration(hiring.remaining)}{t('/sem')}</td></tr>
        <tr><td>{t('Somente horas extras')}<small>{overtime.people} {t('pessoas do quadro atual')}</small></td><td>0</td><td>{currency(overtime.cost)}</td><td>{currency(currentMonthly + overtime.cost)}</td><td>{duration(overtime.remaining)}{t('/sem')}</td></tr>
        <tr className="highlight-row"><td>{t('HE e contratação complementar')}</td><td>{complementary.count}</td><td>{currency(hybridCost)}</td><td>{currency(currentMonthly + hybridCost)}</td><td>{duration(complementary.remaining)}{t('/sem')}</td></tr>
      </tbody></table></div>
      {hiring.payroll && <details className="employment-detail"><summary>{t('Ver encargos dos novos contratos escolhidos')}</summary><table className="payroll-table"><tbody>{hiring.payroll.lines.filter(line => line.value !== 0).map(line => <tr key={line.label}><td>{t(line.label)}</td><td>{currency(line.value)}</td></tr>)}<tr className="payroll-total"><th>{t('Adicional por mês')}</th><th>{currency(hiring.cost)}</th></tr></tbody></table></details>}
      {analysis.savings > .01 && <p className="economic-saving">{t('Diferença mensal entre alternativas com cobertura integral')}: <strong>{currency(analysis.savings)}</strong></p>}
      {hiring.blocked.map(issue => <p className="notice" key={issue}>{t(issue)}</p>)}
      {overtime.reasons.map(issue => <p className="notice" key={issue}>{t(issue)}</p>)}
      <p className="field-help">{t('Contratos a termo de até 12 meses incluem reserva de férias proporcionais indenizadas no encerramento e 13º. Safra inclui a indenização do art. 14. Intermitente e pequeno prazo têm pagamentos proporcionais por período. Prazos maiores e rescisão antecipada exigem revisão própria.')}</p>
      <p className="field-help">{t('Novas pessoas são posicionadas em uma escala complementar. O motor tenta até 100 novas admissões; lacunas remanescentes exigem outra organização. O perfil selecionado vale para os novos contratos; o quadro atual é tratado como mensalista.')}</p>
    </section>
    <section className="result-card">
      <h3>{t('Demanda e horas extras por dia')}</h3><p className="field-help">{t('Pico é a quantidade simultânea necessária. Horas-pessoa somam a demanda do dia. O mínimo para HE é apenas um limite inferior por volume; a disponibilidade real depende dos horários e descansos.')}</p>
      <div className="cost-table-wrap"><table className="cost-table daily-analysis"><thead><tr><th>{t('Dia')}</th><th>{t('Pico de pessoas')}</th><th>{t('Horas-pessoa')}</th><th>{t('Lacuna sem HE')}</th><th>{t('Mínimo de pessoas para HE por volume')}</th><th>{t('Pessoas em HE')}</th><th>{t('HE máximas por pessoa')}</th><th>{t('HE totais no dia')}</th><th>{t('Lacuna após HE')}</th></tr></thead><tbody>{daily.map(day => <tr key={day.day}><th>{t(shortDays[day.day])}</th><td>{day.peak}</td><td>{duration(day.hours)}</td><td>{duration(day.gap)}</td><td>{p.overtimeDailyLimit ? day.minPeople : '—'}</td><td>{day.assignments.length}</td><td>{duration(Math.max(0, ...day.assignments.map(item => item.extraMinutes / 60)))}</td><td>{duration(day.assignments.reduce((sum, item) => sum + item.extraMinutes, 0) / 60)}</td><td>{duration(day.remaining)}</td></tr>)}</tbody></table></div>
      <p className="field-help">{t('A demanda usa o dia civil. Em jornadas noturnas, as HE são atribuídas ao dia de início da jornada, mesmo quando terminam após meia-noite.')}</p>
      <p className="field-help">{t('Limite modelado por pessoa/dia')}: {number(Math.min(p.overtimeDailyLimit, Math.max(0, (600 - result.dailyCap) / 60)))}h. {t('Horas ordinárias recuperadas antes de cobrar HE')}: {duration(overtime.ordinaryHours)}{t('/sem')}.</p>
      <details className="employment-detail"><summary>{t('Ver distribuição de HE por empregado e dia')}</summary><div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>{t('Empregado')}</th><th>{t('Dia')}</th><th>{t('Antecipação de entrada')}</th><th>{t('Extensão de saída')}</th><th>{t('Horas ordinárias adicionais')}</th><th>{t('Horas extras')}</th></tr></thead><tbody>{overtime.assignments.map(item => <tr key={`${item.employee}-${item.day}`}><td>E{item.employee}</td><td>{t(shortDays[item.day])}</td><td>{duration(item.before / 60)}</td><td>{duration(item.after / 60)}</td><td>{duration(item.ordinaryMinutes / 60)}</td><td>{duration(item.extraMinutes / 60)}</td></tr>)}</tbody></table></div></details>
      <p className="footnote">{t('HE são extensões de dias já trabalhados. O modelo preserva as pausas existentes e não ocupa a segunda folga. Lacunas no intervalo podem exigir contratação, mesmo quando há horas extras disponíveis em outros horários.')}</p>
    </section>
    <section className="result-card payroll-breakdown">
      <span className="eyebrow">{t('CUSTO DO EMPREGADOR · UM MÊS')}</span><h3>{t('Remuneração, encargos e provisões discriminados')}</h3>
      <p className="field-help">{t(taxNames[p.taxProfile])} · {t('Base mensal por pessoa')}: {currency(analysis.salary)} · {scenario.employees} {t('Empregados')}</p>
      <table className="payroll-table"><tbody>{base.lines.filter(line => line.value !== 0 || line.label === 'FGTS').map(line => <tr key={line.label}><td>{t(line.label)}</td><td>{currency(line.value)}</td></tr>)}<tr><td>{t('Tributo sobre receita informado · separado da folha')}</td><td>{currency(analysis.revenue)}</td></tr><tr><td>{t('Outros custos do grupo')}</td><td>{currency(p.otherMonthly)}</td></tr><tr className="payroll-total"><th>{t('Custo econômico mensal com provisões')}</th><th>{currency(currentMonthly)}</th></tr><tr><td>{t('Desembolso corrente estimado, sem provisões')}</td><td>{currency(base.cash + p.otherMonthly + analysis.revenue)}</td></tr><tr><td>{t('Provisões e reserva mensal')}</td><td>{currency(base.provision)}</td></tr></tbody></table>
      <p className="footnote">{t('Mensalistas: as 12 remunerações anuais já incluem o mês de férias. Para evitar dupla contagem, a equivalência mensal acrescenta 13º e somente o terço de férias, com incidências. Cobertura de férias não está incluída automaticamente. No intermitente, férias proporcionais com 1/3 e 13º são pagos por convocação, com encargos.')}</p>
      <p className="footnote">{t('Comparação mensalizada, não liquidação de um contrato: duração em meses e dias valida a modalidade; saldo rescisório exige calendário e avos exatos.')} {t('Fator mensal das horas semanais')}: {number(scenario.monthlyWeeks)}.</p>
      <p className="footnote">{t('INSS do empregado e IRRF são retenções do salário, não encargos adicionais do empregador. O orçamento não é uma guia de recolhimento. Adicionais de função, benefícios salariais e rescisões precisam ser informados e conferidos. DSR do intermitente é uma estimativa de 1/6, sujeita ao calendário.')}</p>
      <div className="source-list"><a href={costSources.minimum} target="_blank" rel="noopener noreferrer">{t('Salário mínimo · fonte oficial')}</a><a href={costSources.clt} target="_blank" rel="noopener noreferrer">{t('CLT · jornada e contratos')}</a><a href={costSources.simples} target="_blank" rel="noopener noreferrer">{t('Receita · enquadramento e CPP')}</a><a href={costSources.experience} target="_blank" rel="noopener noreferrer">{t('Experiência · ressalva coletiva')}</a><a href={costSources.rural} target="_blank" rel="noopener noreferrer">{t('Receita · contribuição rural vigente')}</a></div>
    </section>
  </div>;
}
