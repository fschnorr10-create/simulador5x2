import { useI18n } from '../i18n';
import type { Scenario } from '../types';
import type { EmploymentSettings } from '../payroll';
import { contractNames, costSources, employmentSettings, MINIMUM_WAGE_2026, taxNames } from '../payroll';

export function EmploymentFields({ value, onChange }: { value: Scenario; onChange: (value: Scenario) => void }) {
  const { t, locale } = useI18n();
  const p = employmentSettings(value);
  const update = <K extends keyof EmploymentSettings>(key: K, next: EmploymentSettings[K]) => onChange({ ...value, planning: { ...p, [key]: next } });
  const numeric = (key: keyof EmploymentSettings, label: string, min: number, max: number, step = .1) => <label>{t(label)}<input type="number" min={min} max={max} step={step} value={Number(p[key])} onChange={event => update(key, event.target.valueAsNumber || 0)} /></label>;
  return <>
    <section className="form-section employment-fields">
      <h3>{t('Contratação e referência salarial')}</h3>
      <p className="field-help">{t('As pessoas já existentes no grupo são mensalistas. A modalidade abaixo define os novos contratos para cobrir a demanda. Simule funções diferentes separadamente.')}</p>
      <div className="minimum-wage"><strong>{t('Salário mínimo nacional · 2026')}: {MINIMUM_WAGE_2026.toLocaleString(locale, { style: 'currency', currency: 'BRL' })}</strong><button type="button" className="text-button" onClick={() => onChange({ ...value, salary: MINIMUM_WAGE_2026, planning: { ...p, salaryFloor: MINIMUM_WAGE_2026 } })}>{t('Usar salário mínimo')}</button><a href={costSources.minimum} target="_blank" rel="noopener noreferrer">{t('Fonte oficial')}</a></div>
      {numeric('salaryFloor', 'Piso mensal aplicável ao grupo · R$', 1, 1000000, 1)}
      <p className="field-help">{t('O custo usa o maior valor entre salário informado e piso aplicável. Confira piso da CCT e jornadas proporcionais. O mínimo de 2027 não é presumido.')}</p>
      <label>{t('Modalidade dos novos contratos')}<select value={p.contract} onChange={e => update('contract', e.target.value as EmploymentSettings['contract'])}>{Object.entries(contractNames).map(([key, name]) => <option key={key} value={key}>{t(name)}</option>)}</select></label>
      <label>{t('Quem contrata?')}<select value={p.employer} onChange={e => update('employer', e.target.value as 'pf' | 'pj')}><option value="pj">{t('Pessoa jurídica')}</option><option value="pf">{t('Produtor rural pessoa física')}</option></select></label>
      <label>{t('Qual é a necessidade?')}<select value={p.need} onChange={e => update('need', e.target.value as EmploymentSettings['need'])}><option value="continuous">{t('Atividade permanente e contínua')}</option><option value="harvest">{t('Atividade ligada à variação estacional / safra')}</option><option value="temporary">{t('Demanda temporária sem vínculo com safra')}</option><option value="alternating">{t('Alternância real de atividade e inatividade')}</option></select></label>
      <details className="comparison-conditions"><summary>{t('Condições de todas as modalidades comparadas')}</summary>
      {numeric('durationMonths', 'Duração estimada · meses', .1, 24)}
      {numeric('previousShortMonths', 'Pequeno prazo já utilizado no ano · meses', 0, 12)}
      <p className="field-help">{t('Meses são uma estimativa. Confirme as datas e os períodos acumulados por calendário antes de validar o pequeno prazo.')}</p>
      {numeric('experienceDays', 'Experiência · dias, máximo de 90', 1, 90, 1)}<label className="check-field"><input type="checkbox" checked={p.priorSameRole} onChange={e => update('priorSameRole', e.target.checked)} /><span>{t('Já trabalhou na mesma função para este empregador')}</span></label><p className="field-help">{t('Não se admite nova experiência para testar a mesma função já exercida no mesmo empregador. O sistema bloqueia essa hipótese; eventual exceção por norma coletiva deve ser examinada pelo advogado. O prazo total não pode exceder 90 dias.')}</p>
      {numeric('intermittentHours', 'Convocação máxima por novo empregado · horas/mês', 1, 220, 1)}<label className="check-field"><input type="checkbox" checked={p.intermittentConfirmed} onChange={e => update('intermittentConfirmed', e.target.checked)} /><span>{t('Confirmo alternância real, contrato escrito e regras de convocação')}</span></label><p className="field-help">{t('O intermitente recebe horas convocadas, DSR estimado, 13º e férias proporcionais com 1/3. Recusa de convocação e indisponibilidade não são afastadas pelo simulador. Não use para disfarçar demanda contínua.')}</p>
      </details>
      {p.contract === 'harvest' && <p className="field-help">{t('Safra: o orçamento inclui reserva da indenização de 1/12 do salário por mês de serviço, prevista no art. 14 da Lei 5.889/1973. No término normal, não se presume aviso prévio ou multa de 40% do FGTS.')}</p>}
      {!['partial', 'intermittent'].includes(p.contract) && <label className="check-field"><input type="checkbox" checked={p.partTime} onChange={e => update('partTime', e.target.checked)} /><span>{t('Nova jornada parcial · até 30h, sem horas extras')}</span></label>}
    </section>
    <section className="form-section employment-fields">
      <h3>{t('Encargos do empregador')}</h3>
      <label>{t('Enquadramento tributário')}<select value={p.taxProfile} onChange={e => onChange({ ...value, planning: { ...p, taxProfile: e.target.value as EmploymentSettings['taxProfile'], taxConfirmed: false } })}>{Object.entries(taxNames).map(([key, name]) => <option key={key} value={key}>{t(name)}</option>)}</select></label>
      {p.taxProfile === 'custom' ? numeric('customCharges', 'Percentual global de encargos · %', 0, 300) : <>
        {!['simples', 'cebas', 'ruralRevenue'].includes(p.taxProfile) && <div className="field-grid">{numeric('cpp', 'CPP patronal · %', 0, 40)}{numeric('rat', 'RAT · %', 0, 3)}{numeric('fap', 'FAP', .5, 2)}</div>}
        {!['simples', 'simplesIV', 'cebas'].includes(p.taxProfile) && numeric('thirdParties', 'Terceiros / FPAS · % confirmado', 0, 20)}
        <p className="field-help">{t('FGTS: 8%. CPP, RAT × FAP e terceiros variam pelo enquadramento. Beneficente não significa imunidade automática. O Simples fora do Anexo IV recolhe a CPP no DAS.')}</p>
      </>}
      {['ruralRevenue', 'simples', 'simplesIV'].includes(p.taxProfile) && <><div className="field-grid">{numeric('monthlyRevenue', 'Receita mensal tributável · R$', 0, 10000000000, 100)}{numeric('revenueRate', 'Alíquota efetiva sobre receita · %', 0, 100)}</div><p className="field-help">{t('Informe a alíquota vigente confirmada pela contabilidade. Na receita rural, houve alteração em abril de 2026; o sistema não presume percentuais antigos. O tributo sobre receita aparece separado e não é multiplicado por empregado.')}</p></>}
      <div className="field-grid">{numeric('benefits', 'Benefícios sem natureza salarial por pessoa · R$/mês', 0, 100000, 10)}{numeric('otherMonthly', 'Outros custos do grupo · R$/mês', 0, 1000000, 10)}</div>
      {numeric('payrollPis', 'PIS sobre folha, quando devido · %', 0, 5)}
      {numeric('severanceReserve', 'Reserva rescisória adicional · % da remuneração', 0, 100)}
      <p className="field-help">{t('A reserva rescisória é uma premissa, não uma multa automática. Aviso, indenizações por término antecipado, adicionais e benefícios específicos devem ser informados ou revisados separadamente.')}</p>
      <label className="check-field"><input type="checkbox" checked={p.taxConfirmed} onChange={e => update('taxConfirmed', e.target.checked)} /><span>{t('Confirmei enquadramento, imunidade quando aplicável, alíquotas e piso')}</span></label>
    </section>
    <section className="form-section employment-fields">
      <h3>{t('Horas extras para cobrir a demanda')}</h3>
      <label className="check-field"><input type="checkbox" checked={p.overtimeEnabled} onChange={e => update('overtimeEnabled', e.target.checked)} /><span>{t('Comparar contratação com horas extras')}</span></label>
      {p.overtimeEnabled && <>{numeric('overtimeDailyLimit', 'Teto de horas extras por pessoa/dia · até 2h', 0, 2, .25)}<label className="check-field"><input type="checkbox" checked={p.overtimeAuthorized} onChange={e => update('overtimeAuthorized', e.target.checked)} /><span>{t('Confirmei o acordo de prorrogação e autorizações aplicáveis')}</span></label><p className="field-help">{t('O modelo respeita até 2h extras por dia, limite conservador de 10h de trabalho, 11h entre jornadas e o repouso semanal. Na transição de 8h24, limita a extensão a 1h36 neste modelo. Não ocupa folgas nem intervalos.')}</p></>}
      <a className="text-button" href="#comparativo-modalidades">{t('Ver comparação de todas as modalidades')}</a>
    </section>
  </>;
}
