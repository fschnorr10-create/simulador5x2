import { OperatingHours } from './OperatingHours';
import { WorkScheduleEditor } from './WorkScheduleEditor';
import { MINIMUM_WAGE_2026, employmentSettings } from '../payroll';
import { EmploymentFields } from './EmploymentFields';
import { useI18n } from '../i18n';
import { Building2, Users, SlidersHorizontal } from 'lucide-react';
import type { Scenario } from '../types';
import { states } from '../defaults';

interface Props { value: Scenario; onChange: (value: Scenario) => void; quick?: boolean; stage?: 42 | 40; setStage?: (stage:42|40)=>void }

export function ScenarioForm({ value, onChange, quick = false, stage = 42, setStage }: Props) {
  const { t, locale } = useI18n();
  const set = <K extends keyof Scenario>(key: K, next: Scenario[K]) => onChange({ ...value, [key]: next });
  return <aside className="form-panel" id="dados-simulacao">
    <div className="panel-heading"><span className="eyebrow">{t("DADOS DA SIMULAÇÃO")}</span><span className="live-dot">{t("Em tempo real")}</span></div>
    <details className="operation-details" open={!quick}><summary>{t('Dados da empresa · opcional')}</summary><section className="form-section">
      <h3><Building2 size={18} /><span>01</span> {t(" Sua operação")}</h3>
      <label>{t("Nome do cenário")}<input value={value.name} maxLength={120} onChange={e => set('name', e.target.value)} /></label>
      <div className="field-grid"><label>{t("Atividade")}<select value={value.sector} onChange={e => set('sector', e.target.value as Scenario['sector'])}><option value="rural">{t("Agronegócio / rural")}</option><option value="industria">{t("Indústria")}</option><option value="educacao">{t("Colégios")}</option><option value="beneficente">{t("Instituições beneficentes")}</option><option value="comercio">{t("Comércio")}</option><option value="servicos">{t("Serviços")}</option></select></label><label>{t("Estado")}<select value={value.state} onChange={e => set('state', e.target.value)}>{states.map(state => <option key={state}>{state}</option>)}</select></label></div>
      <label>{t("Município ")}<span className="optional">{t("opcional")}</span><input value={value.city} maxLength={120} placeholder={t("Ex.: Petrolina")} onChange={e => set('city', e.target.value)} /></label>
      <p className="field-help">{t("UF e município contextualizam o relatório. Não consultam nem aplicam uma CCT automaticamente.")}</p>
    </section></details>
    <section className="form-section">
      <h3><Users size={18} /><span>{quick ? '01' : '02'}</span> {t(" Sua equipe hoje")}</h3>
      <label>{t("Escala atual")}<select value={value.scale} onChange={e => set('scale', e.target.value as Scenario['scale'])}><option value="6x1">{t("6 × 1 · seis dias e uma folga")}</option><option value="5x2">{t("5 × 2 · cinco dias e duas folgas")}</option><option value="12x36">{t("12 × 36 · análise específica")}</option><option value="turnos">{t("Turnos variados · análise específica")}</option></select></label>
      <div className="field-grid"><label>{t("Empregados")}<input type="number" min="0" max="100" step="1" value={value.employees} onChange={e => set('employees', e.target.valueAsNumber || 0)} /></label><label>{t("Jornada atual ")}<span className="unit">{t("h/semana")}</span><input type="number" min="1" max="44" step="0.5" value={value.currentHours || ''} onChange={e => set('currentHours', e.target.valueAsNumber || 0)} /></label></div>
      <label>{t("Salário médio ")}<span className="unit">R$</span><input type="number" min="1" max="1000000" step="1" value={value.salary || ''} onChange={e => set('salary', e.target.valueAsNumber || 0)} /></label>
      {quick && <><p className="field-help">{t('Salário mínimo nacional · 2026')}: {MINIMUM_WAGE_2026.toLocaleString(locale, { style: 'currency', currency: 'BRL' })} <button className="text-button" onClick={() => set('salary', MINIMUM_WAGE_2026)}>{t('Usar salário mínimo')}</button></p><label>{t('Encargos estimados sobre o salário · %')}<input type="number" min="0" max="300" value={value.charges} onChange={event => set('charges', event.target.valueAsNumber || 0)} /></label></>}
      <p className="field-help">{t("Use a remuneração da mesma função. Encargos são uma premissa ajustável; peça à contabilidade a composição efetiva.")}</p>
    </section>
    <OperatingHours value={value} onChange={onChange} quick={quick} />
    <WorkScheduleEditor value={value} onChange={onChange} stage={stage} setStage={setStage} />
    {!quick && <EmploymentFields value={value} onChange={onChange} />}
    {quick && <section className="form-section"><h3>{t('Comparar horas extras')}</h3><label className="check-field"><input type="checkbox" checked={employmentSettings(value).overtimeAuthorized} onChange={event => onChange({ ...value, planning: { ...employmentSettings(value), overtimeEnabled: true, overtimeAuthorized: event.target.checked } })} /><span>{t('Confirmei o acordo de prorrogação e autorizações aplicáveis')}</span></label><p className="field-help">{t('Até 2h extras por dia, com limite de 10h de trabalho e preservação de intervalos e folgas. Na jornada de 8h24, a extensão fica limitada a 1h36 neste modelo.')}</p></section>}
    <details className="special-settings"><summary>{t('Ajustes e condições especiais')}</summary>
    <section className="form-section">
      <h3><SlidersHorizontal size={18} /><span>04</span> {t(" Condições e premissas")}</h3>
      <label>{t("Há ACT/CCT aplicável à organização da jornada?")}<select value={value.collective} onChange={e => set('collective', e.target.value as Scenario['collective'])}><option value="nao-sei">{t("Ainda não conferi")}</option><option value="sim">{t("Sim · verificar conteúdo e vigência")}</option><option value="nao">{t("Não")}</option></select></label>
      <label>{t("Referência do instrumento ")}<span className="optional">{t("opcional")}</span><input placeholder={t("Número, vigência e cláusula")} value={value.collectiveRef} maxLength={250} onChange={e => set('collectiveRef', e.target.value)} /></label>
      <label className="check-field"><input type="checkbox" checked={value.insalubrious} onChange={e => set('insalubrious', e.target.checked)} /><span>{t("Há atividade insalubre ou exposição a verificar")}</span></label>
      <label className="check-field"><input type="checkbox" checked={value.publicContract} onChange={e => set('publicContract', e.target.checked)} /><span>{t("Operação vinculada a contrato administrativo")}</span></label>
      <details className="cost-settings"><summary>{t("Ajustar premissas de custo")}</summary><div className="field-grid"><label>{t("Adicional de HE ")}<span className="unit">%</span><input type="number" min="50" max="300" value={value.extraRate} onChange={e => set('extraRate', e.target.valueAsNumber || 0)} /></label><label>{t("Reflexo DSR ")}<span className="unit">%</span><input type="number" min="0" max="100" value={value.dsrRate} onChange={e => set('dsrRate', e.target.valueAsNumber || 0)} /></label></div><label>{t("Fator mensal das horas semanais")}<select value={value.monthlyWeeks} onChange={e => set('monthlyWeeks', Number(e.target.value))}><option value={5}>{t("5 · aproximação usada na referência CNC")}</option><option value={52 / 12}>{t("52 ÷ 12 · média de semanas por mês")}</option></select></label></details>
    </section>
    </details>
    <div className="privacy-note">{t("Seus dados são processados neste dispositivo. Nenhum cadastro ou envio a servidor é necessário.")}</div>
  </aside>;
}
