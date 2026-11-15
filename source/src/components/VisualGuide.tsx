import { ArrowRight, BarChart3, CalendarDays, ClipboardList, Users } from 'lucide-react';
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

export function VisualGuide({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return <section className="visual-guide" aria-labelledby="visual-guide-title">
    <div className="visual-guide-heading"><div><span className="eyebrow">{t('PESSOAS, OPERAÇÃO E CONTINUIDADE')}</span><h2 id="visual-guide-title">{t('Um planejamento para quem faz acontecer.')}</h2><p>{t('Antecipe o impacto da jornada na cobertura da equipe e no orçamento. Transforme os dados da sua operação em alternativas para discutir com segurança.')}</p></div><a className="text-button" href="#simulador" onClick={onStart}>{t('Começar meu planejamento')} <ArrowRight size={16} /></a></div>
    <div className="sector-grid">{sectors.map((sector, index) => <article className="sector-card" key={sector.name}><div className="sector-photo"><img src={sectorBanner} alt={t(sector.alt)} width="2172" height="724" loading="lazy" decoding="async" style={{ left: `${-100 * index}%` }} /></div><div className="sector-copy"><h3>{t(sector.name)}</h3><p>{t(sector.caption)}</p></div></article>)}</div>
    <div className="usage-heading"><span className="eyebrow">{t('COMO USAR · 4 PASSOS')}</span><h3>{t('Da sua equipe ao plano de ação.')}</h3></div>
    <ol className="usage-steps">{steps.map(({ icon: Icon, title, text, visual }) => <li key={title}><div className={`step-visual ${visual}`} aria-hidden="true"><Icon size={22} />{visual === 'coverage' ? <span className="mini-heatmap">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i === 6 || i === 10 ? 'gap' : ''} />)}</span> : visual === 'cost' ? <span className="mini-bars"><i /><i /><i /></span> : <span className="mini-fields"><i /><i /><i /></span>}</div><h4>{t(title)}</h4><p>{t(text)}</p></li>)}</ol>
    <p className="visual-guide-note">{t('Simule grupos da mesma função separadamente. Na educação e em outras categorias com jornada especial, valide a norma coletiva e os limites próprios antes de aplicar o resultado. Imagens ilustrativas.')}</p>
  </section>;
}
