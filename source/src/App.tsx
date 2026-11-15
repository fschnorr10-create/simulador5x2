import { workScheduleShifts } from './workSchedule';
import { addDays, dateString, parseDate } from './periodDates';
import { ContractWizard } from './components/ContractWizard';
import { defaultContractAnswers } from './annualContracts';
import { JourneyResults } from './components/JourneyResults';
import { journeyScenario } from './journey';
import { compareAllContracts, optionName, optionExtraLabel } from './contractComparison';
import { saveFile } from './download';
import { analyzeEmployment } from './staffing';
import { LanguageSelector, useI18n } from './i18n';
import schnorrLogo from './assets/logo-schnorr-hd.webp';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Calculator, Check, Copy, FileText, Leaf, Moon, Printer, RotateCcw, Scale, Sun, Upload, X } from 'lucide-react';
import type { Scenario } from './types';
import { defaultScenario } from './defaults';
import { calculate, duration, legalSources, validateScenario } from './engine';
import { VisualGuide } from './components/VisualGuide';
import { ScenarioForm } from './components/ScenarioForm';
import { money } from './components/Results';
import { LegalKnowledge, Methodology, RuralGuide } from './components/Knowledge';

import type { Page } from './bannerContent';
const pages: Array<{ id: Page; title: string; icon: typeof Calculator }> = [
  { id: 'simulador', title: 'Simulador 5 × 2', icon: Calculator },
  { id: 'contratacao', title: 'Simulação de contratos', icon: Leaf },
  { id: 'base-legal', title: 'Base legal e decisão STF', icon: Scale },
  { id: 'metodologia', title: 'Como calculamos', icon: FileText },
];

export default function App() {
  const { t, locale } = useI18n();
  const formatMoney = (value: number) => money(value, locale);
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const deferred = useDeferredValue(scenario);
  const [contractAnswers,setContractAnswers]=useState(defaultContractAnswers);
  const [stage, setStage] = useState<42 | 40>(42);
  const [page, setPage] = useState<Page>(() => { const requested=window.location.hash.slice(1); return pages.some(item=>item.id===requested)?requested as Page:'simulador'; });
  const [dark, setDark] = useState(true);
  const [message, setMessage] = useState('');
  const [bannerVisible, setBannerVisible] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const simulation = useMemo(() => journeyScenario(deferred), [deferred]);
  const errors = useMemo(() => validateScenario(journeyScenario(scenario)), [scenario]);
  const computed = useMemo(() => {
    if (validateScenario(simulation).length) return null;
    return [calculate(simulation, 42), calculate(simulation, 40)];
  }, [simulation]);
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
    const workPlan = simulation.workSchedules?.[stage];
    if (workPlan && page === 'simulador') {
      const planRows = [[t('Empregado'), t('Semana'), t('Data'), t('Dia'), t('Tipo do dia'), t('Entrada'), t('Início do almoço'), t('Fim do almoço'), t('Saída'), t('Trabalho minutos'), t('Situação')]];
      const shifts = workScheduleShifts(workPlan);
      for (let employee = 1; employee <= simulation.employees; employee++) for (let day = 0; day < workPlan.cycleWeeks * 7; day++) {
        const entry = workPlan.weeks[Math.floor(day / 7)][day % 7], shift = shifts.find(item => item.day === day);
        planRows.push([String(employee), String(Math.floor(day / 7) + 1), dateString(addDays(parseDate(workPlan.cycleStart)!, day)), String(day % 7 + 1), entry.kind === 'dsr' ? 'DSR' : t('Trabalho'), entry.kind === 'dsr' ? '' : entry.start, entry.kind === 'dsr' ? '' : entry.mealStart, entry.kind === 'dsr' ? '' : entry.mealEnd, entry.kind === 'dsr' ? '' : entry.end, String(shift?.workMinutes ?? 0), t(result.scheduleIssues?.length ? 'Plano para revisão · não validado' : 'Revisar ACT/CCT e regras da categoria antes de implementar')]);
      }
      saveFile('\uFEFF' + planRows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n'), `jornada-personalizada-${stage}h.csv`, 'text/csv;charset=utf-8');
      setMessage('Jornada personalizada exportada com almoço, horas diárias e DSR. Confira os alertas antes de implementar.');
      return;
    }
    const employment = analyzeEmployment(simulation, result);
    const rows = [[t('Grupo'), t('Empregado'), t('Dia'), t('Entrada'), t('Saída'), t('Pausa início'), t('Pausa minutos'), t('Trabalho minutos'), t('HE minutos')]];
    const clock = (value: number) => `${Math.floor(value % 1440 / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
    const withoutOvertime = employment.p.preferredStrategy === 'hiring';
    const scheduleGroups = page === 'simulador' ? [{ name: 'Quadro atual', prefix: 'E', workers: result.workers }] : [{ name: 'Quadro atual', prefix: 'E', workers: withoutOvertime ? result.workers : employment.overtime.workers }, { name: 'Novos contratos', prefix: 'N', workers: withoutOvertime ? employment.hiring.workers : employment.complementary.workers }];
    for (const group of scheduleGroups) {
      group.workers.forEach(worker => worker.shifts.forEach(shift => {
        const extra = page !== 'simulador' && group.prefix === 'E' && !withoutOvertime ? employment.overtime.assignments.find(item => item.employee === worker.number && item.day === shift.day)?.extraMinutes ?? 0 : 0;
        rows.push([t(group.name), `${group.prefix}${worker.number}`, String(shift.day + 1), clock(shift.start), `${clock(shift.end)}${Math.floor(shift.end / 1440) > shift.day ? ' +1' : ''}`, shift.breakMinutes ? clock(shift.breakStart) : '', String(shift.breakMinutes), String(shift.workMinutes), String(extra)]);
      }));
    }
    saveFile('\uFEFF' + rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n'), `plano-cobertura-${stage}h.csv`, 'text/csv;charset=utf-8');
    setMessage("Escala exportada em CSV. Os horários ainda precisam de revisão.");
  }
  async function copySummary() {
    if (!computed || errors.length) return;
    const summary = `${t('SIMULAÇÃO')} · ${scenario.name}\n${scenario.employees} ${t('Empregados')} · ${scenario.currentHours}h ${t('Jornada atual')} · ${t('Salário médio')} ${formatMoney(scenario.salary)}\n` + computed.map(result => {
      const plan = analyzeEmployment(simulation, result);
      const comparison = compareAllContracts(simulation, result, plan);
      const winner = comparison.best;
      const globalSummary = page === 'simulador' && result.scheduleIssues?.length ? t('A comparação de custo fica suspensa enquanto houver pendências na jornada personalizada.') : page === 'simulador' ? `${t('Referência por volume de horas')}: ${t('Parcial')} ${formatMoney(result.partialCost)}; ${t('Integral')} ${formatMoney(result.fullCost)}; ${t('Horas extras')} ${formatMoney(result.overtimeCost)} ${t('/mês')}` : winner ? `${t(comparison.basis === 'period' ? 'Menor custo total estimado no período' : 'Menor custo mensal estimado')}: ${t(optionName(winner))}${winner.variant?.partTime && winner.variant.contract !== 'partial' ? ` · ${t('Jornada parcial')}` : ''}${winner.kind === 'hybrid' ? ` + ${t(optionExtraLabel(winner))}` : ''} · ${formatMoney(comparison.rankCost(winner))}` : t('Sem indicação conclusiva entre as modalidades.');
      if (page === 'simulador') return `${(result.scheduleIssues ?? []).map(t).join('\n')}\n${result.target}h · ${duration(result.gap)} ${t('ainda precisam de cobertura')}${(result.cycleWeeks ?? 1)>1 ? `\n${t('Lacuna média do ciclo')}: ${duration(result.costReferenceGap ?? result.gap)}` : ''}\n${globalSummary}`;
      return globalSummary + '\n' + `${result.target}h: ${t(plan.recommendation)}\n${t('Custo mensal atual do grupo')}: ${formatMoney(plan.currentMonthly)}; ${t('Contratar na modalidade escolhida')}: ${plan.hiring.count} / ${formatMoney(plan.hiring.cost)}${t('/mês')}; ${t('Empregados alocados em HE')}: ${plan.overtime.people}; ${t('HE planejadas por semana')}: ${duration(plan.overtime.extraHours)}; ${t('HE e contratação complementar')}: ${formatMoney(plan.hybridCost)}${t('/mês')}; ${t('Cobertura restante')}: ${duration(plan.complementary.remaining)}${t('/sem')}.`;
    }).join('\n') + `\n${t('Valores ilustrativos. Revisão legal em 15/11/2026. Cautelar sujeita a referendo.')}\n${legalSources.decision}`;

    try { await navigator.clipboard.writeText(summary); setMessage("Resumo copiado."); }
    catch { saveFile(summary, 'resumo-simulacao.txt', 'text/plain;charset=utf-8'); setMessage("O navegador não liberou a área de transferência. Resumo salvo como texto."); }
  }

  return <div className={`app ${dark ? 'dark' : ''}`}>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#simulador" onClick={() => navigate('simulador')} aria-label={t("Schnorr, página inicial")}><img className="brand-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="1165" height="551" /></a><div className="header-right"><LanguageSelector /><span className="product-name">{t("INTELIGÊNCIA TRABALHISTA")}</span><button className="theme-switch" data-testid="theme-switch" onClick={() => setDark(!dark)} aria-label={dark ? t("Ativar modo claro") : t("Ativar modo escuro")}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? t("Modo claro") : t("Modo escuro")}</span></button></div></div></header>
    <main>
      <nav className="page-tabs purpose-nav" aria-label={t("Seções do sistema")}>{pages.map(({ id, title, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={17} />{t(title)}</button>)}</nav>
      <VisualGuide key={page} page={page} />
      {page !== 'contratacao' && <section className="transition-strip" aria-label={t('O CRONOGRAMA DA TRANSIÇÃO')}><div><strong>42h</strong><span>{t('a partir de 16/12/2026')}</span></div><div><strong>40h</strong><span>{t('a partir de 16/12/2027')}</span></div><div><strong>{t('2 repousos')}</strong><span>{t('Sem redução salarial')}</span></div><button className="text-button" onClick={() => navigate('base-legal')}>{t('Entenda a decisão do STF')} <ArrowRight size={16} /></button></section>}
      {page !== 'contratacao' && bannerVisible && <div className="legal-banner"><Scale size={21} /><p><strong>{t("Atualizado com a cautelar do ministro Flávio Dino.")}</strong> {t(" Referência jurídica conferida em 15/11/2026. A decisão ainda está sujeita ao referendo do Plenário.")}</p><button className="text-button" onClick={() => navigate('base-legal')}>{t("Ver fundamentos ")}<ArrowRight size={15} /></button><button className="icon-button" aria-label={t("Fechar aviso jurídico")} onClick={() => setBannerVisible(false)}><X size={16} /></button></div>}

      <div id="area-conteudo" className="content-anchor" />
      {page === 'simulador' && <>
        <div className="workspace-heading" id="simulador"><div><span className="eyebrow">{t("PLANEJAR É O PRIMEIRO PASSO")}</span><h2>{t("Seu cenário, em poucos minutos.")}</h2><p>{t("Comece pelo exemplo e ajuste os números à realidade da sua equipe.")}</p></div><div className="preset-switch"><span>{t("EXEMPLOS")}</span><button onClick={() => { setScenario(defaultScenario('rural')); setMessage('Exemplo rural carregado. Dados ilustrativos.'); }} className={scenario.sector === 'rural' ? 'selected' : ''}>{t("Operação rural")}</button><button onClick={() => { setScenario(defaultScenario('cnc')); setMessage('Entradas iniciais da CNC carregadas. O motor de escala é próprio.'); }}>{t("Referência CNC")}</button></div></div>
        <details className="workspace-file-actions"><summary>{t('Salvar, importar ou restaurar cenário')}</summary><div className="workspace-actions"><span><span className="status-dot" /> {t(" Sessão local · dados ilustrativos até você editar")}</span><div><button onClick={() => { saveFile(JSON.stringify(scenario, null, 2), 'cenario-jornada.json', 'application/json'); setMessage('Cenário salvo em JSON.'); }}><ArrowDownToLine size={15} />{t("Salvar cenário")}</button><button onClick={() => fileInput.current?.click()}><Upload size={15} />{t("Importar")}</button><button onClick={() => { setScenario(defaultScenario()); setMessage('Exemplo inicial restaurado.'); }}><RotateCcw size={15} />{t("Restaurar exemplo")}</button></div></div></details>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label={t("Importar cenário JSON")} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        {page === 'simulador' && <div className="simulator-layout simple-workspace"><ScenarioForm value={scenario} onChange={setScenario} quick stage={stage} setStage={setStage} /><div aria-busy={busy} inert={busy}>{errors.length ? <div className="notice" role="alert">{errors.map(t).join(' ')}</div> : computed && <><JourneyResults scenario={simulation} results={computed} stage={stage} setStage={setStage} /><div className="export-toolbar"><button onClick={copySummary}><Copy size={16} />{t('Copiar resumo')}</button><button onClick={exportCsv}><ArrowDownToLine size={16} />{t('Escala da equipe atual · CSV')}</button><button onClick={() => window.print()}><Printer size={16} />{t('Imprimir / PDF')}</button></div></>}</div></div>}
      </>}

      {page === 'contratacao' && <ContractWizard value={contractAnswers} onChange={setContractAnswers} />}
      {page === 'contratacao' && <details className="contract-settings"><summary>{t('Consultar regras de contratação rural')}</summary><RuralGuide /></details>}
      {page === 'base-legal' && <LegalKnowledge />}
      {page === 'metodologia' && <Methodology />}
      <div className="professional-note"><Scale size={19} /><p>{t("Esta simulação não substitui parecer jurídico individualizado. Antes de implementar qualquer medida, revisar com o advogado responsável e validar a CCT vigente da categoria. A sugestão de escala depende também das condições reais de trabalho e de SST.")}</p></div>
    </main>
    <footer><img className="footer-logo" src={schnorrLogo} alt="Schnorr & Advogados Associados" width="1165" height="551" /><p>{t("Simulador 5 × 2 · Planejamento trabalhista")}<br />{t("Versão 1.5 · Referência jurídica: 15/11/2026")}</p><button className="text-button" onClick={() => navigate('metodologia')}>{t("Método e limitações ")}<ArrowRight size={15} /></button></footer>
    {message && <div className="toast" role="status"><Check size={18} /><span>{t(message)}</span><button className="icon-button" aria-label={t("Fechar mensagem")} onClick={() => setMessage('')}><X size={16} /></button></div>}
  </div>;
}

