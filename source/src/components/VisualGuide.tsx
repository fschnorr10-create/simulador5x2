import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, ArrowRight, BarChart3, CalendarDays, ClipboardList, Users } from 'lucide-react';
import sectorBanner from '../assets/setores-banner.webp';
import { useI18n } from '../i18n';

const sectors = [
  { name: 'Agro', caption: 'Planeje a cobertura na lavoura, no manejo e no beneficiamento. Antecipe necessidades de equipe nos períodos de maior demanda.', alt: 'Profissionais acompanhando o trabalho em um parreiral' },
  { name: 'Indústria', caption: 'Compare a capacidade da equipe com os horários de produção. Identifique lacunas antes de reorganizar turnos ou contratar.', alt: 'Profissionais com equipamentos de proteção em uma fábrica' },
  { name: 'Colégios', caption: 'Organize secretaria, limpeza, manutenção e apoio escolar. Informe a jornada de cada função e revise os regimes específicos.', alt: 'Equipe de educadores planejando atividades em um colégio' },
  { name: 'Instituições beneficentes', caption: 'Planeje a continuidade do atendimento e a equipe de apoio. Avalie alternativas de cobertura com atenção ao orçamento.', alt: 'Equipe de uma instituição beneficente organizando doações' },
];
const steps = [
  { icon: Users, title: '1. Informe sua equipe', text: 'Preencha empregados, jornada atual, salário e encargos da mesma função.', visual: 'people' },
  { icon: CalendarDays, title: '2. Desenhe a demanda', text: 'Indique dias, horários e quantas pessoas precisam trabalhar ao mesmo tempo.', visual: 'calendar' },
  { icon: ClipboardList, title: '3. Veja a cobertura', text: 'Compare 42h e 40h, confira o mapa por hora e a sugestão de escala.', visual: 'coverage' },
  { icon: BarChart3, title: '4. Compare os caminhos', text: 'Analise reorganização, novas contratações e a referência de custo de horas extras.', visual: 'cost' },
];

const SLIDE_INTERVAL_MS = 10000;

export function VisualGuide({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const playing = !paused && !interacting && !hidden;

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setActive(current => (current + 1) % sectors.length), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, playing]);

  function selectSlide(index: number) {
    setActive((index + sectors.length) % sectors.length);
    setPaused(true);
  }
  const sector = sectors[active];
  const step = steps[active];
  const StepIcon = step.icon;

  return <section className="visual-guide carousel" aria-label={t('Apresentação do simulador')} aria-roledescription={t('Carrossel')}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget) && !(event.target as HTMLElement).closest('[data-playback-control]')) setPaused(true); }}>
    <div className="carousel-slide" key={active} aria-live={paused ? 'polite' : 'off'} aria-atomic="true">
      <div className="carousel-copy"><span className="eyebrow">{t('SIMULADOR 5 × 2')} · {t('PESSOAS, OPERAÇÃO E CONTINUIDADE')}</span>
        <h2>{t(sector.name)}</h2><h3>{t('Um planejamento para quem faz acontecer.')}</h3><p>{t(sector.caption)}</p>
        <div className="carousel-step"><StepIcon size={22} /><div><span className="eyebrow">{t('COMO USAR · 4 PASSOS')}</span><h4>{t(step.title)}</h4><p>{t(step.text)}</p></div></div>
        <a className="primary-button" href="#simulador" onClick={onStart}>{t('Começar meu planejamento')} <ArrowRight size={16} /></a>
      </div>
      <div className="carousel-photo"><img src={sectorBanner} alt={t(sector.alt)} width="2172" height="724" decoding="async" fetchPriority="high" style={{ left: `${-100 * active}%` }} /><span>{t('Imagens ilustrativas')}</span></div>
    </div>
    <div className="carousel-controls"><div className="carousel-buttons"><button type="button" className="carousel-control" aria-label={t('Voltar imagem')} onClick={() => selectSlide(active - 1)}><ChevronLeft size={19} /></button><button type="button" className="carousel-control pause-control" data-playback-control="true" aria-label={paused ? t('Reproduzir apresentação') : t('Pausar apresentação')} aria-pressed={paused} onClick={() => { setPaused(current => !current); setInteracting(false); }}>{paused ? <Play size={16} /> : <Pause size={16} />}<span>{paused ? t('Reproduzir') : t('Pausar')}</span></button><button type="button" className="carousel-control" aria-label={t('Avançar imagem')} onClick={() => selectSlide(active + 1)}><ChevronRight size={19} /></button></div>
      <div className="carousel-dots">{sectors.map((item, index) => <button type="button" key={item.name} aria-label={`${t('Exibir')}: ${t(item.name)}`} aria-current={index === active ? 'true' : undefined} className={index === active ? 'active' : ''} onClick={() => selectSlide(index)}><span /></button>)}</div>
      <span className="carousel-counter">{active + 1} / {sectors.length} <span>· {t('Troca automática a cada 10 segundos')}</span></span>
    </div>
    <p className="visual-guide-note">{t('Simule grupos da mesma função separadamente. Na educação e em outras categorias com jornada especial, valide a norma coletiva e os limites próprios antes de aplicar o resultado. Imagens ilustrativas.')}</p>
  </section>;
}
