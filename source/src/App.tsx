import schnorrLogo from './assets/logo-schnorr.webp';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Calculator, Check, Copy, FileText, Leaf, Moon, Printer, RotateCcw, Scale, Sun, Upload, X } from 'lucide-react';
import type { Scenario } from './types';
import { defaultScenario } from './defaults';
import { calculate, duration, legalSources, validateScenario } from './engine';
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
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const deferred = useDeferredValue(scenario);
  const [stage, setStage] = useState<42 | 40>(42);
  const [page, setPage] = useState<Page>('simulador');
  const [dark, setDark] = useState(false);
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
    if (file.size > 150000) { setMessage('Arquivo muito grande. Use um cenário JSON com até 150 KB.'); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const issues = validateScenario(parsed);
      if (issues.length) throw new Error(issues.join(' '));
      setScenario(parsed as Scenario); setMessage('Cenário importado e validado.'); navigate('simulador');
    } catch (error) { setMessage(`Não foi possível importar: ${error instanceof Error ? error.message : 'arquivo inválido'}`); }
  }
  function exportCsv() {
    if (!computed || errors.length) return;
    const result = computed.find(item => item.stage === stage)!;
    const rows = [['Empregado', 'Dia', 'Entrada', 'Saída', 'Pausa início', 'Pausa minutos', 'Trabalho minutos']];
    result.workers.forEach(worker => worker.shifts.forEach(shift => {
      const clock = (value: number) => `${Math.floor(value % 1440 / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
      rows.push([`E${worker.number}`, String(shift.day + 1), clock(shift.start), `${clock(shift.end)}${Math.floor(shift.end / 1440) > shift.day ? ' +1' : ''}`, shift.breakMinutes ? clock(shift.breakStart) : '', String(shift.breakMinutes), String(shift.workMinutes)]);
    }));
    saveFile('\uFEFF' + rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n'), `escala-sugerida-${stage}h.csv`, 'text/csv;charset=utf-8');
    setMessage('Escala exportada em CSV. Os horários ainda precisam de revisão.');
  }
  async function copySummary() {
    if (!computed || errors.length) return;
    const summary = `SIMULAÇÃO · ${scenario.name}\n${scenario.employees} empregados · ${scenario.currentHours}h atuais · salário ${money(scenario.salary)}\n` + computed.map(result => `${result.target}h: ${duration(result.gap)}/sem descobertas; cobertura ${decimal(result.coveragePercent)}%; parcial ${money(result.partialCost)}/mês; integral ${money(result.fullCost)}/mês; HE ${money(result.overtimeCost)}/mês.`).join('\n') + `\nValores ilustrativos. Revisão legal em 15/11/2026. Cautelar sujeita a referendo.\n${legalSources.decision}`;
    try { await navigator.clipboard.writeText(summary); setMessage('Resumo copiado.'); }
    catch { saveFile(summary, 'resumo-simulacao.txt', 'text/plain;charset=utf-8'); setMessage('O navegador não liberou a área de transferência. Resumo salvo como texto.'); }
  }
  const noDemand = computed?.[0].demandedHours === 0;
  const currentDeficit = computed ? Math.max(0, computed[0].demandedHours - deferred.employees * deferred.currentHours) : 0;

  return <div className={`app ${dark ? 'dark' : ''}`}>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#simulador" onClick={() => navigate('simulador')} aria-label="Schnorr, página inicial"><img className="brand-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="470" height="222" /></a><div className="header-right"><span className="product-name">INTELIGÊNCIA TRABALHISTA</span><button className="theme-switch" onClick={() => setDark(!dark)} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Modo claro' : 'Modo escuro'}</span></button></div></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> SIMULADOR 5 × 2</span><h1>Uma nova jornada.<br /><em>Um plano para sua operação.</em></h1><p>Compare jornadas, visualize a cobertura da equipe e entenda os caminhos de contratação. Decisões mais claras para o campo, o comércio e os serviços.</p><div className="hero-actions"><a className="primary-button" href="#simulador" onClick={() => navigate('simulador')}>Simular minha operação <ArrowRight size={17} /></a><button className="text-button" onClick={() => navigate('base-legal')}>Entenda a decisão do STF <ArrowUpRightIcon /></button></div><span className="hero-detail"><Check size={14} /> Sem cadastro <span>·</span> Cálculo no dispositivo <span>·</span> Premissas abertas</span></div><div className="hero-summary"><span className="eyebrow">O CRONOGRAMA DA TRANSIÇÃO</span><div className="hero-milestone"><span>01</span><div><strong>42<small>h</small></strong><p>a partir de 16/12/2026</p></div><div className="milestone-note">5 dias de até 8h24<br />conforme a cautelar</div></div><div className="hero-milestone"><span>02</span><div><strong>40<small>h</small></strong><p>a partir de 16/12/2027</p></div><div className="milestone-note">Planeje agora<br />a próxima etapa</div></div><div className="hero-summary-footer"><strong>2 repousos</strong><span>Sem redução salarial</span></div></div></section>
      {bannerVisible && <div className="legal-banner"><Scale size={21} /><p><strong>Atualizado com a cautelar do ministro Flávio Dino.</strong> Referência jurídica conferida em 15/11/2026. A decisão ainda está sujeita ao referendo do Plenário.</p><button className="text-button" onClick={() => navigate('base-legal')}>Ver fundamentos <ArrowRight size={15} /></button><button className="icon-button" aria-label="Fechar aviso jurídico" onClick={() => setBannerVisible(false)}><X size={16} /></button></div>}
      <nav className="page-tabs" aria-label="Seções do sistema">{pages.map(({ id, title, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={17} />{title}</button>)}</nav>
      {page === 'simulador' && <>
        <div className="workspace-heading"><div><span className="eyebrow">PLANEJAR É O PRIMEIRO PASSO</span><h2>Seu cenário, em poucos minutos.</h2><p>Comece pelo exemplo e ajuste os números à realidade da sua equipe.</p></div><div className="preset-switch"><span>EXEMPLOS</span><button onClick={() => { setScenario(defaultScenario('rural')); setMessage('Exemplo rural carregado. Dados ilustrativos.'); }} className={scenario.sector === 'rural' ? 'selected' : ''}>Operação rural</button><button onClick={() => { setScenario(defaultScenario('cnc')); setMessage('Entradas iniciais da CNC carregadas. O motor de escala é próprio.'); }}>Referência CNC</button></div></div>
        <div className="workspace-actions"><span><span className="status-dot" /> Sessão local · dados ilustrativos até você editar</span><div><button onClick={() => { saveFile(JSON.stringify(scenario, null, 2), 'cenario-jornada.json', 'application/json'); setMessage('Cenário salvo em JSON.'); }}><ArrowDownToLine size={15} />Salvar cenário</button><button onClick={() => fileInput.current?.click()}><Upload size={15} />Importar</button><button onClick={() => { setScenario(defaultScenario()); setMessage('Exemplo inicial restaurado.'); }}><RotateCcw size={15} />Restaurar exemplo</button></div></div>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Importar cenário JSON" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="simulator-layout"><ScenarioForm value={scenario} onChange={setScenario} /><div aria-busy={busy} className={busy ? 'updating' : ''}>
          {errors.length > 0 ? <div className="result-card validation-errors" role="alert"><h3>Revise os dados para calcular</h3><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul><p>Os resultados ficam suspensos até a correção das entradas.</p></div> : computed && <>
            {noDemand && <div className="notice">Nenhuma demanda foi informada. Preencha o número de pessoas nas faixas de funcionamento para obter um diagnóstico útil.</div>}
            {currentDeficit > 0 && <div className="notice"><strong>Déficit já existente:</strong> a demanda supera em {duration(currentDeficit)} por semana a capacidade contratada atual. A mudança de jornada não é a única origem da lacuna.</div>}
            {scenario.insalubrious && <div className="notice"><strong>Atividade insalubre:</strong> conferir licença ou autorização coletiva aplicável à prorrogação e requisitos de SST. A regra transitória de 8h24 não resolve este enquadramento automaticamente.</div>}
            {scenario.publicContract && <div className="notice"><strong>Contrato administrativo:</strong> o cronograma contratual específico não é aplicado automaticamente aos cálculos. <SourceLink href={legalSources.decision}>Conferir item VII da cautelar</SourceLink></div>}
            <Results scenario={deferred} results={computed} stage={stage} setStage={setStage} />
            <div className="export-toolbar"><div><strong>Leve o planejamento com você.</strong><span>Revise o cenário antes de implementar.</span></div><button onClick={copySummary}><Copy size={16} />Copiar resumo</button><button onClick={exportCsv}><ArrowDownToLine size={16} />Escala CSV</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} />Imprimir / PDF</button></div>
          </>}
        </div></div>
      </>}
      {page === 'contratacao' && <RuralGuide />}
      {page === 'base-legal' && <LegalKnowledge />}
      {page === 'metodologia' && <Methodology />}
      <div className="professional-note"><Scale size={19} /><p>Esta simulação não substitui parecer jurídico individualizado. Antes de implementar qualquer medida, revisar com o advogado responsável e validar a CCT vigente da categoria. A sugestão de escala depende também das condições reais de trabalho e de SST.</p></div>
    </main>
    <footer><img className="footer-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="470" height="222" /><p>Simulador 5 × 2 · Planejamento trabalhista<br />Versão 1.0 · Referência jurídica: 15/11/2026</p><button className="text-button" onClick={() => navigate('metodologia')}>Método e limitações <ArrowRight size={15} /></button></footer>
    {message && <div className="toast" role="status"><Check size={18} /><span>{message}</span><button className="icon-button" aria-label="Fechar mensagem" onClick={() => setMessage('')}><X size={16} /></button></div>}
  </div>;
}

function ArrowUpRightIcon() { return <ArrowRight size={15} style={{ transform: 'rotate(-35deg)' }} />; }
