import type { Scenario } from '../types';
import type { ContractType } from '../payroll';
import { contractIssues, contractNames, employmentSettings, payrollCost, validateEmploymentSettings } from '../payroll';
import { contractPeriodCost } from '../periodCost';
import { PeriodControls } from './PeriodControls';
import { EmploymentFields } from './EmploymentFields';
import { useI18n } from '../i18n';

const explanations: Record<ContractType, string> = {
  indefinite: 'Para uma necessidade permanente, sem data prevista para acabar. A dispensa pela empresa pode gerar aviso prévio e multa do FGTS.',
  harvest: 'Para atividade rural ligada à safra. O término acompanha o ciclo da atividade; não é um prazo escolhido apenas para reduzir custos.',
  experience: 'Para avaliar uma nova relação de trabalho, por até 90 dias. Não cabe repetir experiência na mesma função já exercida para o empregador.',
  intermittent: 'Para trabalho com alternância real entre atividade e inatividade. As convocações podem ser recusadas; férias e 13º proporcionais são pagos por período.',
  partial: 'É uma jornada reduzida. Neste simulador, até 30h por semana sem horas extras; pode atender necessidades permanentes.',
  short: 'Exclusivo do produtor rural pessoa física, para atividade temporária, limitado a dois meses dentro de um ano.',
};
export function SimpleContractSimulator({ scenario, onChange }: { scenario: Scenario; onChange: (value: Scenario) => void }) {
  const { t, locale } = useI18n();
  const p = employmentSettings(scenario);
  const people = p.contractHeadcount ?? 1, hours = p.contractHours ?? 40;
  const selected = p.comparedContracts ?? Object.keys(contractNames) as ContractType[];
  const money = (value: number) => value.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const update = (next: Partial<typeof p>) => onChange({ ...scenario, planning: { ...p, ...next } });
  const valid = Number.isInteger(people) && people > 0 && people <= 100 && hours > 0 && hours <= 40 && scenario.salary > 0 && !validateEmploymentSettings(p).length;
  const rows = valid ? selected.map(contract => {
    const settings = { ...p, contract, partTime: contract === 'partial' };
    const salary = Math.max(scenario.salary, p.salaryFloor);
    const monthlySalary = Math.max(0, people * salary * (contract === 'partial' ? hours / 40 : contract === 'intermittent' ? hours * scenario.monthlyWeeks / 200 : 1));
    const costs = contractPeriodCost(monthlySalary, people, settings);
    const commonCosts = (p.otherMonthly + (['simples', 'simplesIV', 'ruralRevenue'].includes(p.taxProfile) ? p.monthlyRevenue * p.revenueRate / 100 : 0)) * costs.months;
    if (commonCosts) { costs.lines.push({ label: 'Tributos sobre receita e outros custos comuns', value: commonCosts, category: 'operation' }); costs.operation += commonCosts; costs.total += commonCosts; }
    const reasons = [...contractIssues(settings, 'rural'), ...costs.reasons];
    if (['simples', 'simplesIV', 'ruralRevenue'].includes(p.taxProfile) && (!p.monthlyRevenue || !p.revenueRate)) reasons.push('Informe receita e alíquota efetiva para comparar o custo total neste enquadramento.');
    if (hours > 30 && contract === 'partial') reasons.push('A jornada necessária supera 30h por semana nesta modalidade.');
    if (contract === 'intermittent' && hours * scenario.monthlyWeeks > p.intermittentHours + 1e-8) reasons.push('A demanda supera as horas de convocação informadas por empregado.');
    const equivalent = payrollCost(monthlySalary, people, settings, contract === 'intermittent' ? 'intermittent' : contract === 'short' ? 'proportional' : ['experience', 'harvest'].includes(contract) ? 'term' : 'monthly', true, true).total;
    return { contract, costs, reasons: [...new Set(reasons)], equivalent };
  }) : [];
  const best = valid && p.taxConfirmed ? rows.filter(row => !row.reasons.length).sort((a, b) => a.costs.total - b.costs.total)[0] : undefined;
  return <section className="simple-contract-simulator" id="simulacao-contratos">
    <h2>{t('Simulação de contratos rurais')}</h2><p>{t('Escolha os contratos que deseja comparar. O resultado mostra o custo das novas admissões durante o período e no encerramento.')}</p>
    <div className="contract-start result-card"><h3>{t('1. Quem contrata e qual é a necessidade?')}</h3><div className="field-grid"><label>{t('Quem contrata?')}<select value={p.employer} onChange={event => update({ employer: event.target.value as 'pf' | 'pj' })}><option value="pj">{t('Empresa rural · pessoa jurídica')}</option><option value="pf">{t('Produtor rural pessoa física')}</option></select></label><label>{t('Qual é a necessidade?')}<select value={p.need} onChange={event => update({ need: event.target.value as typeof p.need })}><option value="continuous">{t('Atividade permanente e contínua')}</option><option value="harvest">{t('Atividade ligada à variação estacional / safra')}</option><option value="temporary">{t('Demanda temporária sem vínculo com safra')}</option><option value="alternating">{t('Alternância real de atividade e inatividade')}</option></select></label></div>
    <div className="field-grid"><label>{t('Novas pessoas a contratar')}<input type="number" min="1" max="100" step="1" value={people} onChange={event => update({ contractHeadcount: event.target.valueAsNumber || 0 })} /></label><label>{t('Salário mensal de referência · R$')}<input type="number" min="1" max="1000000" value={scenario.salary} onChange={event => onChange({ ...scenario, salary: event.target.valueAsNumber || 0 })} /></label><label>{t('Horas necessárias por pessoa/semana')}<input type="number" min="1" max="40" step=".5" value={hours} onChange={event => update({ contractHours: event.target.valueAsNumber || 0 })} /></label></div><p className="field-help">{t('Referência de 40h para comparar as novas admissões. Mensalistas integrais recebem o salário completo; parcial e intermitente usam a proporção da jornada. O custo não inclui a equipe que a empresa já possui.')}</p>
    <PeriodControls scenario={scenario} onChange={onChange} /></div>
    <h3>{t('2. Quais contratos você quer comparar?')}</h3><div className="contract-picker">{(Object.keys(contractNames) as ContractType[]).map(contract => <article key={contract} className={selected.includes(contract) ? 'picked' : ''}><label className="check-field"><input type="checkbox" checked={selected.includes(contract)} onChange={event => update({ comparedContracts: event.target.checked ? [...selected, contract] : selected.filter(item => item !== contract) })} /><strong>{t(contractNames[contract])}</strong></label><details><summary>{t('Como funciona?')}</summary><p>{t(explanations[contract])}</p></details></article>)}</div>
    <details className="contract-settings"><summary>{t('Conferir encargos e condições dos contratos')}</summary><EmploymentFields value={scenario} onChange={onChange} /></details>
    <label className="check-field contract-confirmation"><input type="checkbox" checked={p.taxConfirmed} onChange={event => update({ taxConfirmed: event.target.checked })} /><span>{t('Confirmei enquadramento, imunidade quando aplicável, alíquotas e piso')}</span></label>
    <section className="result-card"><h3>{t('3. Qual é o custo total?')}</h3><div className="simple-answer" role="status">{!valid ? t('Informe uma quantidade válida de pessoas e horas.') : best ? <><strong>{t('Menor custo total estimado no período')}: {t(contractNames[best.contract])}</strong><b>{money(best.costs.total)}</b></> : !p.taxConfirmed ? t('Valores estimados. Confira os encargos e marque a confirmação para indicar a opção de menor custo.') : t('Nenhum dos contratos selecionados atende às condições informadas.')}</div>
    <div className="cost-table-wrap"><table className="cost-table simple-contract-table"><thead><tr><th>{t('Contrato')}</th><th>{t('Durante o período')}</th><th>{t('No encerramento')}</th><th>{t('Total do período')}</th><th>{t('Detalhes')}</th></tr></thead><tbody>{valid && rows.map(row => <tr key={row.contract} className={best === row ? 'highlight-row' : undefined}><th>{t(contractNames[row.contract])}{row.reasons.length > 0 && <small>{t('Verificar condições')}</small>}</th><td>{money(row.costs.operation)}</td><td>{money(row.costs.settlement + row.costs.accrual)}{row.costs.accrual > 0 && <small>{t('Direitos acumulados, sem desligamento')}</small>}</td><td><strong>{money(row.costs.total)}</strong></td><td><details><summary>{t('Ver detalhes')}</summary>{row.reasons.map(reason => <p className="field-help" key={reason}>{t(reason)}</p>)}<p>{t('Equivalência mensal')}: {money(row.equivalent)}</p><dl className="simple-ledger">{row.costs.lines.map((line, index) => <div key={index}><dt>{t(line.label)}{line.category === 'included' && <small>{t('Já incluído; não somar')}</small>}</dt><dd>{money(line.value)}</dd></div>)}</dl></details></td></tr>)}</tbody></table></div><p className="field-help">{t('Só entram na indicação contratos compatíveis com a mesma necessidade e jornada. Valores de opções impedidas são ilustrativos. O saldo salarial já está nos salários do período e não é somado novamente.')}</p></section>
  </section>;
}
