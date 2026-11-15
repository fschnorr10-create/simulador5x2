export type Page = 'simulador' | 'contratacao' | 'base-legal' | 'metodologia';

export interface BannerSlide {
  title: string;
  subtitle: string;
  description: string;
  tipTitle: string;
  tip: string;
  action: string;
  image: 'sector' | 'purpose';
  imageIndex: number;
  imageAlt: string;
}

const commonAction = 'Começar meu planejamento';
const sectorSlides: BannerSlide[] = [
  { title: 'Agro', subtitle: 'Um planejamento para quem faz acontecer.', description: 'Planeje a cobertura na lavoura, no manejo e no beneficiamento. Antecipe necessidades de equipe nos períodos de maior demanda.', tipTitle: '1. Informe sua equipe', tip: 'Preencha empregados, jornada atual, salário e encargos da mesma função.', action: commonAction, image: 'sector', imageIndex: 0, imageAlt: 'Profissionais acompanhando o trabalho em um parreiral' },
  { title: 'Indústria', subtitle: 'Um planejamento para quem faz acontecer.', description: 'Compare a capacidade da equipe com os horários de produção. Identifique lacunas antes de reorganizar turnos ou contratar.', tipTitle: '2. Desenhe a demanda', tip: 'Indique dias, horários e quantas pessoas precisam trabalhar ao mesmo tempo.', action: commonAction, image: 'sector', imageIndex: 1, imageAlt: 'Profissionais com equipamentos de proteção em uma fábrica' },
  { title: 'Colégios', subtitle: 'Um planejamento para quem faz acontecer.', description: 'Organize secretaria, limpeza, manutenção e apoio escolar. Informe a jornada de cada função e revise os regimes específicos.', tipTitle: '3. Veja a cobertura', tip: 'Compare 42h e 40h, confira o mapa por hora e a sugestão de escala.', action: commonAction, image: 'sector', imageIndex: 2, imageAlt: 'Equipe de educadores planejando atividades em um colégio' },
  { title: 'Instituições beneficentes', subtitle: 'Um planejamento para quem faz acontecer.', description: 'Planeje a continuidade do atendimento e a equipe de apoio. Avalie alternativas de cobertura com atenção ao orçamento.', tipTitle: '4. Compare os caminhos', tip: 'Analise reorganização, novas contratações e a referência de custo de horas extras.', action: commonAction, image: 'sector', imageIndex: 3, imageAlt: 'Equipe de uma instituição beneficente organizando doações' },
];

/** Presentation copy is independent of the calculation engine and selected scenario. */
export const banners: Record<Page, { label: string; slides: BannerSlide[] }> = {
  simulador: { label: 'Simulador de jornada', slides: [
    { title: 'Uma nova jornada.', subtitle: 'Um plano para sua operação.', description: 'Compare jornadas, visualize a cobertura da equipe e entenda os caminhos de contratação. Decisões mais claras para o agro, a indústria, os colégios e as instituições beneficentes.', tipTitle: 'Seu cenário, em poucos minutos.', tip: 'Comece pelo exemplo e ajuste os números à realidade da sua equipe.', action: 'Simular minha operação', image: 'purpose', imageIndex: 2, imageAlt: 'Analista conferindo o planejamento de equipes e os cálculos' },
    ...sectorSlides,
  ] },
  contratacao: { label: 'Contratação rural', slides: [
    { title: 'Contratação rural', subtitle: 'Comece pela necessidade real.', description: 'A modalidade contratual e a jornada são decisões diferentes. Uma safra não dispensa registro, salário, repousos ou proteção à saúde.', tipTitle: 'Orientador de contratação', tip: 'Informe quem contrata, o motivo da necessidade e a duração estimada. O orientador apresenta uma hipótese para revisão.', action: 'Encontrar a modalidade adequada', image: 'purpose', imageIndex: 0, imageAlt: 'Gestor rural e assessora revisando o planejamento de contratação no campo' },
    { title: 'Contrato de safra', subtitle: 'O ciclo da atividade orienta a contratação.', description: 'A duração deve decorrer das variações estacionais da atividade agrária, com justificativa documentada.', tipTitle: 'Documentos e decisões para conferir', tip: 'Causa e duração do contrato, histórico de admissões e registro.', action: 'Conferir as opções de contratação', image: 'sector', imageIndex: 0, imageAlt: 'Profissionais acompanhando o trabalho em um parreiral' },
    { title: 'Prazo e jornada são escolhas diferentes.', subtitle: 'Compare as opções antes de contratar.', description: 'Avalie prazo indeterminado, safra, pequeno prazo rural e tempo parcial conforme a necessidade da operação.', tipTitle: 'Pequeno prazo tem limite', tip: 'O contrato rural por pequeno prazo tem requisitos próprios. Confira o perfil do empregador, o período acumulado e a formalização.', action: 'Abrir o orientador rural', image: 'purpose', imageIndex: 0, imageAlt: 'Gestor rural e assessora revisando o planejamento de contratação no campo' },
  ] },
  'base-legal': { label: 'Base legal e decisão STF', slides: [
    { title: 'Base legal e decisão STF', subtitle: 'Entenda as regras antes de decidir.', description: 'O que mudou com a cautelar', tipTitle: 'Cautelar com eficácia imediata, sujeita a referendo.', tip: 'Consulte o cronograma, os limites e as fontes oficiais reunidas nesta seção. A referência jurídica desta versão é de 15/11/2026.', action: 'Consultar a base legal', image: 'purpose', imageIndex: 1, imageAlt: 'Profissionais do direito examinando documentos e fundamentos jurídicos' },
    { title: '42h na transição. 40h na etapa seguinte.', subtitle: 'O cronograma da transição', description: 'Planeje a mudança com atenção às datas, aos dois repousos e à preservação salarial.', tipTitle: '8h24 na transição', tip: 'A regra transitória depende das condições da cautelar e da existência de ACT/CCT. Confira os fundamentos antes de aplicar.', action: 'Ver cronograma e condições', image: 'purpose', imageIndex: 1, imageAlt: 'Profissionais do direito examinando documentos e fundamentos jurídicos' },
    { title: 'LIMITES E DIREITOS', subtitle: 'O que conferir antes de adotar a escala', description: 'Revise instrumentos coletivos, horas extras, descansos e condições de SST. Exceções exigem análise própria.', tipTitle: 'Fontes consultadas', tip: 'Abra os documentos oficiais e confira o enquadramento da sua categoria com o advogado responsável.', action: 'Abrir fontes e limites', image: 'purpose', imageIndex: 1, imageAlt: 'Profissionais do direito examinando documentos e fundamentos jurídicos' },
  ] },
  metodologia: { label: 'Como calculamos', slides: [
    { title: 'Você vê o resultado. E as premissas.', subtitle: 'MÉTODO E TRANSPARÊNCIA', description: 'O sistema separa capacidade contratada, cobertura nos horários necessários e referências econômicas. O cálculo trabalha com minutos inteiros, preservando os 24 minutos da regra transitória.', tipTitle: 'Fórmulas do planejamento', tip: 'Entenda de onde vêm a demanda, a lacuna de cobertura e as estimativas de custo.', action: 'Entender os cálculos', image: 'purpose', imageIndex: 2, imageAlt: 'Analista conferindo o planejamento de equipes e os cálculos' },
    { title: 'Cobertura, hora a hora', subtitle: 'Capacidade não é disponibilidade simultânea.', description: 'A escala considera os horários necessários e desconta as pausas. Ter horas contratadas suficientes não garante pessoas disponíveis em cada faixa.', tipTitle: 'Como a escala é construída', tip: 'Confira a busca de horários, os limites do modelo e a diferença entre capacidade e cobertura.', action: 'Conhecer o método da escala', image: 'purpose', imageIndex: 2, imageAlt: 'Analista conferindo o planejamento de equipes e os cálculos' },
    { title: 'Quanto custa cada caminho?', subtitle: 'Compare com premissas transparentes.', description: 'Compare reorganização, contratação parcial, contratação integral e a referência de custo de horas extras.', tipTitle: 'O que não está no valor estimado', tip: 'As estimativas não substituem a folha nem garantem a cobertura. Confira os custos não incluídos e revise a escala complementar.', action: 'Revisar fórmulas e limitações', image: 'purpose', imageIndex: 2, imageAlt: 'Analista conferindo o planejamento de equipes e os cálculos' },
  ] },
};
