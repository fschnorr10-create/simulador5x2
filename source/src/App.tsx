import { LanguageSelector, useI18n } from './i18n';
import schnorrLogo from './assets/logo-schnorr-hd.webp';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Calculator, Check, Copy, FileText, Leaf, Moon, Printer, RotateCcw, Scale, Sun, Upload, X } from 'lucide-react';
import type { Scenario } from './types';
import { defaultScenario } from './defaults';
import { calculate, duration, legalSources, validateScenario } from './engine';
import { VisualGuide } from './components/VisualGuide';
import { ScenarioForm } from './components/ScenarioForm';
import { Results, decimal, money } from './components/Results';
import { LegalKnowledge, Methodology, RuralGuide, SourceLink } from './components/Knowledge';

type Page = 'simulador' | 'contratacao' | 'base-legal' | 'metodologia';
const pages: Array<{ id: Page; title: string; icon: typeof Calculator }> = [
  { id: 'simulador', title: 'Simulador de jornada', icon: Calculator },
  { id: 'contratacao', title: 'Contratação rural', icon: Leaf },
  { id: 'base-legal', title: 'Base legal e decisão STF', icon: Scale },
  { id: 'metodologia', title: 'Como calculamos', icon: FileText },
];

function saveFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const { t, locale } = useI18n();
  const formatMoney = (value: number) => money(value, locale);
  const formatDecimal = (value: number) => decimal(value, locale);
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const deferred = useDeferredValue(scenario);
  const [stage, setStage] = useState<42 | 40>(42);
  const [page, setPage] = useState<Page>('simulador');
  const [dark, setDark] = useState(true);
  const [message, setMessage] = useState('');
  const [bannerVisible, setBannerVisible] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = useMemo(() => validateScenario(scenario), [scenario]);
  const computed = useMemo(() => {
    if (validateScenario(deferred).length) return null;
    return [calculate(deferred, 42), calculate(deferred, 40)];
  }, [deferred]);
  const busy = deferred !== scenario;
  function navigate(next: Page) { setPage(next); window.history.replaceState(null, '', `#${next}`); }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 150000) { setMessage("Arquivo muito grande. Use um cenário JSON com até 150 KB."); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const issues = validateScenario(parsed).map(t);
      if (issues.length) throw new Error(issues.join(' '));
      setScenario(parsed as Scenario); setMessage("Cenário importado e validado."); navigate('simulador');
    } catch (error) { setMessage(`${t("Não foi possível importar:")} ${error instanceof Error ? t(error.message) : t("arquivo inválido")}`); }
  }
  function exportCsv() {
    if (!computed || errors.length) return;
    const result = computed.find(item => item.stage === stage)!;
    const rows = [[t("Empregado"), t("Dia"), 'Entrada', t("Saída"), t("Pausa início"), t("Pausa minutos"), t("Trabalho minutos")]];
    result.workers.forEach(worker => worker.shifts.forEach(shift => {
      const clock = (value: number) => `${Math.floor(value % 1440 / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
      rows.push([`E${worker.number}`, String(shift.day + 1), clock(shift.start), `${clock(shift.end)}${Math.floor(shift.end / 1440) > shift.day ? ' +1' : ''}`, shift.breakMinutes ? clock(shift.breakStart) : '', String(shift.breakMinutes), String(shift.workMinutes)]);
    }));
    saveFile('\uFEFF' + rows.map((row, index) => (index === 0 ? row.map(t) : row).map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n'), `escala-sugerida-${stage}h.csv`, 'text/csv;charset=utf-8');
    setMessage("Escala exportada em CSV. Os horários ainda precisam de revisão.");
  }
  async function copySummary() {
    if (!computed || errors.length) return;
    const summary = `${t('SIMULAÇÃO')} · ${scenario.name}\n${scenario.employees} ${t('Empregados')} · ${scenario.currentHours}h ${t('Jornada atual')} · ${t('Salário médio')} ${formatMoney(scenario.salary)}\n` + computed.map(result => `${result.target}h: ${duration(result.gap)}${t('/sem')} ${t('descobertas')}; ${t('Cobertura')} ${formatDecimal(result.coveragePercent)}%; ${t('Parcial')} ${formatMoney(result.partialCost)}${t('/mês')}; ${t('Integral')} ${formatMoney(result.fullCost)}${t('/mês')}; ${t('Horas extras')} ${formatMoney(result.overtimeCost)}${t('/mês')}.`).join('\n') + `\n${t('Valores ilustrativos. Revisão legal em 15/11/2026. Cautelar sujeita a referendo.')}\n${legalSources.decision}`;
    try { await navigator.clipboard.writeText(summary); setMessage("Resumo copiado."); }
    catch { saveFile(summary, 'resumo-simulacao.txt', 'text/plain;charset=utf-8'); setMessage("O navegador não liberou a área de transferência. Resumo salvo como texto."); }
  }
  const noDemand = computed?.[0].demandedHours === 0;
  const currentDeficit = computed ? Math.max(0, computed[0].demandedHours - deferred.employees * deferred.currentHours) : 0;

  return <div className={`app ${dark ? 'dark' : ''}`}>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#simulador" onClick={() => navigate('simulador')} aria-label={t("Schnorr, página inicial")}><img className="brand-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="1165" height="551" /></a><div className="header-right"><LanguageSelector /><span className="product-name">{t("INTELIGÊNCIA TRABALHISTA")}</span><button className="theme-switch" data-testid="theme-switch" onClick={() => setDark(!dark)} aria-label={dark ? t("Ativar modo claro") : t("Ativar modo escuro")}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? t("Modo claro") : t("Modo escuro")}</span></button></div></div></header>
    <main>
      <VisualGuide onStart={() => navigate('simulador')} />
      <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> {t(" SIMULADOR 5 × 2")}</span><h1>{t("Uma nova jornada.")}<br /><em>{t("Um plano para sua operação.")}</em></h1><p>{t("Compare jornadas, visualize a cobertura da equipe e entenda os caminhos de contratação. Decisões mais claras para o agro, a indústria, os colégios e as instituições beneficentes.")}</p><div className="hero-actions"><a className="primary-button" href="#simulador" onClick={() => navigate('simulador')}>{t("Simular minha operação ")}<ArrowRight size={17} /></a><button className="text-button" onClick={() => navigate('base-legal')}>{t("Entenda a decisão do STF ")}<ArrowUpRightIcon /></button></div><span className="hero-detail"><Check size={14} /> {t(" Sem cadastro ")}<span>·</span> {t(" Cálculo no dispositivo ")}<span>·</span> {t(" Premissas abertas")}</span></div><div className="hero-summary"><span className="eyebrow">{t("O CRONOGRAMA DA TRANSIÇÃO")}</span><div className="hero-milestone"><span>01</span><div><strong>42<small>h</small></strong><p>{t("a partir de 16/12/2026")}</p></div><div className="milestone-note">{t("5 dias de até 8h24")}<br />{t("conforme a cautelar")}</div></div><div className="hero-milestone"><span>02</span><div><strong>40<small>h</small></strong><p>{t("a partir de 16/12/2027")}</p></div><div className="milestone-note">{t("Planeje agora")}<br />{t("a próxima etapa")}</div></div><div className="hero-summary-footer"><strong>{t("2 repousos")}</strong><span>{t("Sem redução salarial")}</span></div></div></section>
      {bannerVisible && <div className="legal-banner"><Scale size={21} /><p><strong>{t("Atualizado com a cautelar do ministro Flávio Dino.")}</strong> {t(" Referência jurídica conferida em 15/11/2026. A decisão ainda está sujeita ao referendo do Plenário.")}</p><button className="text-button" onClick={() => navigate('base-legal')}>{t("Ver fundamentos ")}<ArrowRight size={15} /></button><button className="icon-button" aria-label={t("Fechar aviso jurídico")} onClick={() => setBannerVisible(false)}><X size={16} /></button></div>}
      <nav className="page-tabs" aria-label={t("Seções do sistema")}>{pages.map(({ id, title, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={17} />{t(title)}</button>)}</nav>
      {page === 'simulador' && <>
        <div className="workspace-heading" id="simulador"><div><span className="eyebrow">{t("PLANEJAR É O PRIMEIRO PASSO")}</span><h2>{t("Seu cenário, em poucos minutos.")}</h2><p>{t("Comece pelo exemplo e ajuste os números à realidade da sua equipe.")}</p></div><div className="preset-switch"><span>{t("EXEMPLOS")}</span><button onClick={() => { setScenario(defaultScenario('rural')); setMessage('Exemplo rural carregado. Dados ilustrativos.'); }} className={scenario.sector === 'rural' ? 'selected' : ''}>{t("Operação rural")}</button><button onClick={() => { setScenario(defaultScenario('cnc')); setMessage('Entradas iniciais da CNC carregadas. O motor de escala é próprio.'); }}>{t("Referência CNC")}</button></div></div>
        <div className="workspace-actions"><span><span className="status-dot" /> {t(" Sessão local · dados ilustrativos até você editar")}</span><div><button onClick={() => { saveFile(JSON.stringify(scenario, null, 2), 'cenario-jornada.json', 'application/json'); setMessage('Cenário salvo em JSON.'); }}><ArrowDownToLine size={15} />{t("Salvar cenário")}</button><button onClick={() => fileInput.current?.click()}><Upload size={15} />{t("Importar")}</button><button onClick={() => { setScenario(defaultScenario()); setMessage('Exemplo inicial restaurado.'); }}><RotateCcw size={15} />{t("Restaurar exemplo")}</button></div></div>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label={t("Importar cenário JSON")} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="simulator-layout"><ScenarioForm value={scenario} onChange={setScenario} /><div aria-busy={busy} className={busy ? 'updating' : ''}>
          {errors.length > 0 ? <div className="result-card validation-errors" role="alert"><h3>{t("Revise os dados para calcular")}</h3><ul>{errors.map(error => <li key={error}>{t(error)}</li>)}</ul><p>{t("Os resultados ficam suspensos até a correção das entradas.")}</p></div> : computed && <>
            {noDemand && <div className="notice">{t("Nenhuma demanda foi informada. Preencha o número de pessoas nas faixas de funcionamento para obter um diagnóstico útil.")}</div>}
            {currentDeficit > 0 && <div className="notice"><strong>{t("Déficit já existente:")}</strong> {t(" a demanda supera em ")}{duration(currentDeficit)} {t(" por semana a capacidade contratada atual. A mudança de jornada não é a única origem da lacuna.")}</div>}
            {scenario.insalubrious && <div className="notice"><strong>{t("Atividade insalubre:")}</strong> {t(" conferir licença ou autorização coletiva aplicável à prorrogação e requisitos de SST. A regra transitória de 8h24 não resolve este enquadramento automaticamente.")}</div>}
            {scenario.publicContract && <div className="notice"><strong>{t("Contrato administrativo:")}</strong> {t(" o cronograma contratual específico não é aplicado automaticamente aos cálculos. ")}<SourceLink href={legalSources.decision}>{t("Conferir item VII da cautelar")}</SourceLink></div>}
            <Results scenario={deferred} results={computed} stage={stage} setStage={setStage} />
            <div className="export-toolbar"><div><strong>{t("Leve o planejamento com você.")}</strong><span>{t("Revise o cenário antes de implementar.")}</span></div><button onClick={copySummary}><Copy size={16} />{t("Copiar resumo")}</button><button onClick={exportCsv}><ArrowDownToLine size={16} />{t("Escala CSV")}</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} />{t("Imprimir / PDF")}</button></div>
          </>}
        </div></div>
      </>}
      {page === 'contratacao' && <RuralGuide />}
      {page === 'base-legal' && <LegalKnowledge />}
      {page === 'metodologia' && <Methodology />}
      <div className="professional-note"><Scale size={19} /><p>{t("Esta simulação não substitui parecer jurídico individualizado. Antes de implementar qualquer medida, revisar com o advogado responsável e validar a CCT vigente da categoria. A sugestão de escala depende também das condições reais de trabalho e de SST.")}</p></div>
    </main>
    <footer><img className="footer-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="1165" height="551" /><p>{t("Simulador 5 × 2 · Planejamento trabalhista")}<br />{t("Versão 1.1 · Referência jurídica: 15/11/2026")}</p><button className="text-button" onClick={() => navigate('metodologia')}>{t("Método e limitações ")}<ArrowRight size={15} /></button></footer>
    {message && <div className="toast" role="status"><Check size={18} /><span>{t(message)}</span><button className="icon-button" aria-label={t("Fechar mensagem")} onClick={() => setMessage('')}><X size={16} /></button></div>}
  </div>;
}

function ArrowUpRightIcon() { return <ArrowRight size={15} style={{ transform: 'rotate(-35deg)' }} />; }
