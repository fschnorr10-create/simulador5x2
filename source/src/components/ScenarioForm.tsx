import { Building2, Users, CalendarClock, Plus, X, SlidersHorizontal } from 'lucide-react';
import type { Scenario } from '../types';
import { shortDays, states } from '../defaults';

interface Props { value: Scenario; onChange: (value: Scenario) => void }

export function ScenarioForm({ value, onChange }: Props) {
  const set = <K extends keyof Scenario>(key: K, next: Scenario[K]) => onChange({ ...value, [key]: next });
  function updateBand(day: number, index: number, key: 'open' | 'close' | 'people', next: string | number) {
    set('days', value.days.map((entry, d) => d === day ? { ...entry, bands: entry.bands.map((band, i) => i === index ? { ...band, [key]: next } : band) } : entry));
  }
  function copyWeekdays() {
    set('days', value.days.map((day, index) => index > 0 && index < 5 ? { ...day, bands: value.days[0].bands.map((band, i) => ({ ...band, id: `day-${index}-${i}` })) } : day));
  }
  return <aside className="form-panel">
    <div className="panel-heading"><span className="eyebrow">DADOS DA SIMULAÇÃO</span><span className="live-dot">Em tempo real</span></div>
    <section className="form-section">
      <h3><Building2 size={18} /><span>01</span> Sua operação</h3>
      <label>Nome do cenário<input value={value.name} maxLength={120} onChange={e => set('name', e.target.value)} /></label>
      <div className="field-grid"><label>Atividade<select value={value.sector} onChange={e => set('sector', e.target.value as Scenario['sector'])}><option value="rural">Agronegócio / rural</option><option value="comercio">Comércio</option><option value="servicos">Serviços</option></select></label><label>Estado<select value={value.state} onChange={e => set('state', e.target.value)}>{states.map(state => <option key={state}>{state}</option>)}</select></label></div>
      <label>Município <span className="optional">opcional</span><input value={value.city} maxLength={120} placeholder="Ex.: Petrolina" onChange={e => set('city', e.target.value)} /></label>
      <p className="field-help">UF e município contextualizam o relatório. Não consultam nem aplicam uma CCT automaticamente.</p>
    </section>
    <section className="form-section">
      <h3><Users size={18} /><span>02</span> Sua equipe hoje</h3>
      <label>Escala atual<select value={value.scale} onChange={e => set('scale', e.target.value as Scenario['scale'])}><option value="6x1">6 × 1 · seis dias e uma folga</option><option value="5x2">5 × 2 · cinco dias e duas folgas</option><option value="12x36">12 × 36 · análise específica</option><option value="turnos">Turnos variados · análise específica</option></select></label>
      <div className="field-grid"><label>Empregados<input type="number" min="1" max="100" step="1" value={value.employees || ''} onChange={e => set('employees', e.target.valueAsNumber || 0)} /></label><label>Jornada atual <span className="unit">h/semana</span><input type="number" min="1" max="44" step="0.5" value={value.currentHours || ''} onChange={e => set('currentHours', e.target.valueAsNumber || 0)} /></label></div>
      <div className="field-grid"><label>Salário médio <span className="unit">R$</span><input type="number" min="1" max="1000000" step="50" value={value.salary || ''} onChange={e => set('salary', e.target.valueAsNumber || 0)} /></label><label>Encargos estimados <span className="unit">%</span><input type="number" min="0" max="300" value={value.charges} onChange={e => set('charges', e.target.valueAsNumber || 0)} /></label></div>
      <p className="field-help">Use a remuneração da mesma função. Encargos são uma premissa ajustável; peça à contabilidade a composição efetiva.</p>
    </section>
    <section className="form-section">
      <h3><CalendarClock size={18} /><span>03</span> Funcionamento e demanda</h3>
      <p className="field-help">Informe quantas pessoas precisam trabalhar simultaneamente. Zero fecha a faixa. Horários iguais representam 24h; fechamento anterior à abertura termina no dia seguinte.</p>
      <div className="hours-labels"><span>Dia</span><span>Abre</span><span>Fecha</span><span>Pessoas</span><span /></div>
      {value.days.map((day, dayIndex) => <div className="day-fields" key={dayIndex}>
        {day.bands.map((band, index) => <div className="hours-row" key={band.id}>
          <span className="day-name">{index === 0 ? shortDays[dayIndex] : '↳'}</span>
          <input aria-label={`${day.name} faixa ${index + 1}: abre`} type="time" value={band.open} onChange={e => updateBand(dayIndex, index, 'open', e.target.value)} />
          <input aria-label={`${day.name} faixa ${index + 1}: fecha`} type="time" value={band.close} onChange={e => updateBand(dayIndex, index, 'close', e.target.value)} />
          <input aria-label={`${day.name} faixa ${index + 1}: pessoas`} type="number" min="0" max="500" value={band.people} onChange={e => updateBand(dayIndex, index, 'people', e.target.valueAsNumber || 0)} />
          {index === 0 ? <button className="icon-button tiny" disabled={day.bands.length >= 6} title={`Adicionar faixa em ${day.name}`} aria-label={`Adicionar faixa em ${day.name}`} onClick={() => set('days', value.days.map((entry, i) => i === dayIndex ? { ...entry, bands: [...entry.bands, { id: crypto.randomUUID(), open: '18:00', close: '20:00', people: 0 }] } : entry))}><Plus size={14} /></button> : <button className="icon-button tiny" title="Remover faixa" aria-label={`Remover faixa ${index + 1} de ${day.name}`} onClick={() => set('days', value.days.map((entry, i) => i === dayIndex ? { ...entry, bands: entry.bands.filter((_, b) => b !== index) } : entry))}><X size={14} /></button>}
        </div>)}
      </div>)}
      <button className="text-button" onClick={copyWeekdays}>Aplicar segunda-feira a terça–sexta →</button>
      <label>Intervalo para jornadas acima de 6h<select value={value.interval} onChange={e => set('interval', Number(e.target.value))}><option value={60}>1 hora · premissa geral</option><option value={30}>30 minutos · exige ACT/CCT aplicável</option><option value={90}>1 hora e 30 minutos</option><option value={120}>2 horas</option></select></label>
      <p className="field-help">O motor desconta pausas da cobertura: 15min nas jornadas acima de 4h até 6h; intervalo selecionado acima de 6h. No rural, validar também os usos locais e a norma coletiva.</p>
    </section>
    <section className="form-section">
      <h3><SlidersHorizontal size={18} /><span>04</span> Condições e premissas</h3>
      <label>Há ACT/CCT aplicável à organização da jornada?<select value={value.collective} onChange={e => set('collective', e.target.value as Scenario['collective'])}><option value="nao-sei">Ainda não conferi</option><option value="sim">Sim · verificar conteúdo e vigência</option><option value="nao">Não</option></select></label>
      <label>Referência do instrumento <span className="optional">opcional</span><input placeholder="Número, vigência e cláusula" value={value.collectiveRef} maxLength={250} onChange={e => set('collectiveRef', e.target.value)} /></label>
      <label className="check-field"><input type="checkbox" checked={value.insalubrious} onChange={e => set('insalubrious', e.target.checked)} /><span>Há atividade insalubre ou exposição a verificar</span></label>
      <label className="check-field"><input type="checkbox" checked={value.publicContract} onChange={e => set('publicContract', e.target.checked)} /><span>Operação vinculada a contrato administrativo</span></label>
      <details className="cost-settings"><summary>Ajustar premissas de custo</summary><div className="field-grid"><label>Adicional de HE <span className="unit">%</span><input type="number" min="50" max="300" value={value.extraRate} onChange={e => set('extraRate', e.target.valueAsNumber || 0)} /></label><label>Reflexo DSR <span className="unit">%</span><input type="number" min="0" max="100" value={value.dsrRate} onChange={e => set('dsrRate', e.target.valueAsNumber || 0)} /></label></div><label>Fator mensal das horas semanais<select value={value.monthlyWeeks} onChange={e => set('monthlyWeeks', Number(e.target.value))}><option value={5}>5 · aproximação usada na referência CNC</option><option value={52 / 12}>52 ÷ 12 · média de semanas por mês</option></select></label></details>
    </section>
    <div className="privacy-note">Seus dados são processados neste dispositivo. Nenhum cadastro ou envio a servidor é necessário.</div>
  </aside>;
}
