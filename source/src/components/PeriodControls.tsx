import type { Scenario } from '../types';
import { employmentSettings } from '../payroll';
import { planningPeriod } from '../periodCost';
import { parseDate, salaryMonths, addMonths, addDays, dateString, daysBetween } from '../periodDates';
import type { PeriodSettings } from '../periodDates';
import { useI18n } from '../i18n';

export function PeriodControls({ scenario, onChange }: { scenario: Scenario; onChange: (value: Scenario) => void }) {
  const { t } = useI18n();
  const p = employmentSettings(scenario), period = planningPeriod(p);
  function update<K extends keyof PeriodSettings>(key: K, value: PeriodSettings[K]) {
    const next = { ...period, [key]: value };
    const start = parseDate(next.start);
    if (start && key === 'start') {
      next.end = dateString(addDays(start, daysBetween(parseDate(period.start)!, parseDate(period.end)!)));
      next.fixedEnd = next.end;
    }
    if (key === 'end' && period.fixedEnd === period.end) next.fixedEnd = next.end;
    const end = parseDate(next.end);
    // Keep the previous valid calculation while an incomplete calendar field is being edited.
    if (!start || !end || end < start || end > addMonths(start, 24) || !parseDate(next.fixedEnd)) return;
    onChange({ ...scenario, planning: { ...p, durationMonths: Math.max(.1, Math.min(24, salaryMonths(start, end))), period: next } });
  }
  return <fieldset className="period-controls"><legend>{t('Período completo e encerramento dos novos contratos')}</legend>
    <div className="field-grid"><label>{t('Início da demanda / admissão')}<input type="date" value={period.start} onChange={event => update('start', event.target.value)} /></label><label>{t('Último dia da demanda')}<input type="date" min={period.start} value={period.end} onChange={event => update('end', event.target.value)} /></label></div><details><summary>{t('Condições de encerramento · opcional')}</summary><label>{t('Término previsto · safra e pequeno prazo')}<input type="date" min={period.start} value={period.fixedEnd} onChange={event => update('fixedEnd', event.target.value)} /></label>
    <label>{t('Ao final da demanda')}<select value={period.exit} onChange={event => update('exit', event.target.value as PeriodSettings['exit'])}><option value="employer">{t('Empresa encerra: término normal ou dispensa antecipada')}</option><option value="resignation">{t('Empregado pede desligamento')}</option><option value="continue">{t('Vínculo continua: mostrar direitos acumulados')}</option></select></label>
    <label className="check-field"><input type="checkbox" checked={period.reciprocalClause} onChange={event => update('reciprocalClause', event.target.checked)} /><span>{t('Contratos a prazo têm cláusula recíproca de rescisão antecipada · art. 481')}</span></label>
    <p className="field-help">{t('A experiência termina na admissão + dias de experiência. Se a demanda acabar antes, a empresa simula rescisão antecipada; se acabar depois, a modalidade fica impedida. Confirme o evento de término da safra.')}</p>
    <p className="field-help">{t('Aviso devido é simulado como indenizado. O quadro atual permanece empregado. Salário e alíquotas são mantidos constantes; a cobertura semanal e as HE são projetadas para o período. Períodos de 12 meses ou mais exigem planejamento de férias e substituições antes da indicação.')}</p>
  </details></fieldset>;
}
