import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, ArrowRight, Lightbulb } from 'lucide-react';
import sectorBanner from '../assets/setores-banner.webp';
import { useI18n } from '../i18n';

import purposeBanner from '../assets/finalidades-banner.webp';
import { banners } from '../bannerContent';
import type { Page } from '../bannerContent';

const SLIDE_INTERVAL_MS = 10000;

export function VisualGuide({ page }: { page: Page }) {
  const { slides, label } = banners[page];
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
    const timer = window.setTimeout(() => setActive(current => (current + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, playing, slides.length]);

  function selectSlide(index: number) {
    setActive((index + slides.length) % slides.length);
    setPaused(true);
  }
  const slide = slides[active];
  const image = slide.image === 'sector' ? sectorBanner : purposeBanner;
  const panelCount = slide.image === 'sector' ? 4 : 3;

  return <section className="visual-guide carousel" aria-label={t('Apresentação do simulador')} aria-roledescription={t('Carrossel')}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget) && !(event.target as HTMLElement).closest('[data-playback-control]')) setPaused(true); }}>
    <div className="carousel-slide" key={active} aria-live={paused ? 'polite' : 'off'} aria-atomic="true">
      <div className="carousel-copy"><span className="eyebrow">{t('SIMULADOR 5 × 2')} · {t(label)}</span>
        <h1>{t(slide.title)}</h1><h3>{t(slide.subtitle)}</h3><p>{t(slide.description)}</p>
        <div className="carousel-step"><Lightbulb size={22} /><div><span className="eyebrow">{t('PARA SUA DECISÃO')}</span><h4>{t(slide.tipTitle)}</h4><p>{t(slide.tip)}</p></div></div>
        <a className="primary-button" href="#area-conteudo">{t(slide.action)} <ArrowRight size={16} /></a>
      </div>
      <div className="carousel-photo"><img src={image} alt={t(slide.imageAlt)} width="2172" height="724" decoding="async" fetchPriority="high" style={{ left: `${-100 * slide.imageIndex}%`, width: `${panelCount * 100}%` }} /><span>{t('Imagens ilustrativas')}</span></div>
    </div>
    <div className="carousel-controls"><div className="carousel-buttons"><button type="button" className="carousel-control" aria-label={t('Voltar imagem')} onClick={() => selectSlide(active - 1)}><ChevronLeft size={19} /></button><button type="button" className="carousel-control pause-control" data-playback-control="true" aria-label={paused ? t('Reproduzir apresentação') : t('Pausar apresentação')} aria-pressed={paused} onClick={() => { setPaused(current => !current); setInteracting(false); }}>{paused ? <Play size={16} /> : <Pause size={16} />}<span>{paused ? t('Reproduzir') : t('Pausar')}</span></button><button type="button" className="carousel-control" aria-label={t('Avançar imagem')} onClick={() => selectSlide(active + 1)}><ChevronRight size={19} /></button></div>
      <div className="carousel-dots">{slides.map((item, index) => <button type="button" key={item.title} aria-label={`${t('Exibir')}: ${t(item.title)}`} aria-current={index === active ? 'true' : undefined} className={index === active ? 'active' : ''} onClick={() => selectSlide(index)}><span /></button>)}</div>
      <span className="carousel-counter">{active + 1} / {slides.length} <span>· {t('Troca automática a cada 10 segundos')}</span></span>
    </div>
    <p className="visual-guide-note">{t('Simule grupos da mesma função separadamente. Na educação e em outras categorias com jornada especial, valide a norma coletiva e os limites próprios antes de aplicar o resultado. Imagens ilustrativas.')}</p>
  </section>;
}
