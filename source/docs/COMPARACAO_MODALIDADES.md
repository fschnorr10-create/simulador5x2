# Comparação de todas as modalidades — versão 1.3

A tabela de largura completa reúne indeterminado, parcial, safra, experiência, intermitente e pequeno prazo rural. Safra, experiência e pequeno prazo também aparecem em jornada parcial: nove linhas de contratação e uma linha para o quadro atual sem novas admissões. Colunas paralelas apresentam contratação sem HE e contratação complementar às HE do quadro atual, com pessoas, adicional mensal, total do grupo e lacuna. As etapas de 42h e 40h usam o mesmo seletor compartilhado com o relatório detalhado.

## Critério de indicação

- Mesma demanda, período, empregador, necessidade, piso, benefícios e perfil fiscal para todas as alternativas. Nenhuma declaração é alterada para habilitar uma modalidade.
- A indicação exige cobertura integral, ausência de restrições aplicáveis e premissas fiscais confirmadas. O custo isolado não habilita uma alternativa incompatível nem uma solução de cobertura parcial.
- Valores de modalidades impedidas são referências hipotéticas, visíveis para comparação, mas não entram na indicação e não podem ser aplicados. Os motivos estão na coluna Condições.
- Horas extras respeitam os limites do módulo existente. As colunas com HE referem-se ao quadro atual, não à jornada parcial de novos contratos. Há também a alternativa somente HE/reorganização e, se não há lacuna, manutenção do quadro.
- Experiência precisa cobrir o período informado pela aproximação de meses × 30, além das verificações de função anterior e prazo. Continuidade posterior exige conversão e novo planejamento; o orçamento continua mensalizado, sem liquidação de avos por datas exatas.
- Regime especial ou jornada insalubre de transição sem validação impede a conclusão automática, mantendo custos ilustrativos para revisão.
- A ordenação usa centavos. Empates são destacados em todas as opções elegíveis com o mesmo custo. Critérios de desempate para o destaque principal: menos HE, menos novas pessoas e identificador estável. A economia informada usa a próxima alternativa elegível com custo diferente; não usa opções impedidas ou incompletas como comparador.

A recomendação é de menor custo mensal estimado entre as alternativas avaliadas. Não certifica adequação jurídica, mínimo global de pessoas ou otimização global de todas as possíveis escalas. Rescisão, continuidade após experiência, disponibilidade dos intermitentes e regras coletivas continuam sujeitos às limitações de `CUSTOS_CONTRATACAO.md`.

## Implementação e compatibilidade

`src/contractComparison.ts` gera variantes, reaproveita `planHiring` e `planOvertime`, filtra elegibilidade e calcula a indicação. Caches locais, separados por demanda residual, reutilizam somente a escala de mesma capacidade diária; cada modalidade conserva seu próprio custo, provisões e restrições. Não há cache persistente ou envio de dados.

`ContractComparison.tsx` exibe tabela, destaque, aplicação e CSV. `planning.preferredStrategy` é opcional no JSON v1; ao aplicar uma opção, muda modalidade/jornada e estratégia de exportação, preservando demanda, remuneração, perfil fiscal e autorização de comparação com HE. O plano CSV existente respeita a estratégia escolhida; o resumo inclui a indicação geral. `download.ts` centraliza o salvamento dos arquivos.

O CSV comparativo contém 20 alternativas (18 combinações de contratação, HE somente e quadro atual), custos, lacuna, situação, restrições, confirmação fiscal e indicação. Valores numéricos usam o idioma selecionado. A tabela e as ações estão disponíveis em português, espanhol e inglês, nos dois temas.

## Conferência

`npm test`: 53 testes, incluindo opções incompatíveis mais baratas, cobertura incompleta, fidelidade dos caches, ausência de mutação das entradas, bloqueios de experiência, HE sem autorização, confirmação fiscal, aplicação da escolha, manutenção de equipe suficiente e empates.

`npm run build`: TypeScript + Vite, HTML único. Verificação visual: comparação em 42h/40h, aplicação do vencedor, bloqueio e habilitação condicional do intermitente, idiomas e viewport de 390px sem overflow horizontal da página. A tabela tem rolagem própria no celular.
