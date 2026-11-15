# Demanda, contratação, encargos e horas extras

Revisão funcional e das fontes em 15/11/2026. Motor próprio de planejamento; não é folha oficial, liquidação rescisória ou certificação de conformidade.

## Dados compartilhados

Simulador e contratação rural usam o mesmo `Scenario`. `planning` é opcional no JSON versão 1, preservando arquivos anteriores. O grupo atual é composto por mensalistas da mesma função, entre 0 e 100 pessoas; os novos contratos têm modalidade selecionada. Funções e enquadramentos diferentes devem ser simulados separadamente. A demanda informa pessoas simultâneas por faixa em cada um dos sete dias. Horários noturnos e pausas são tratados em minutos.

`src/payroll.ts` reúne configurações, validação, restrições contratuais e custo. `src/staffing.ts` dimensiona extensões de jornada e novos contratos. `engine.ts` conserva o motor de escala, com possibilidade de jornadas mais curtas no quadro complementar. Componentes `EmploymentFields` e `EmploymentResults` usam os dados compartilhados; nenhum resultado depende de transmissão a servidor.

## Referência salarial

Salário mínimo de 2026: R$ 1.621, Decreto 12.797/2025. O exemplo rural usa esse valor; o exemplo CNC conserva R$ 2.200. Não se presume o mínimo de 2027. A base aplicada é o maior entre salário informado e piso indicado para o grupo. Piso coletivo e proporcionalidade precisam ser verificados.

## Custo de um mês

O valor principal é uma equivalência mensal com provisões. Para mensalistas, as 12 remunerações do ano já incluem o mês de férias: acrescentam-se 1/12 de 13º e 1/36 de terço de férias, evitando um salário de férias duplicado. A base de incidência contempla remuneração, 13º e terço. O relatório distingue desembolso corrente estimado e provisões. Não calcula cobertura de férias ou afastamentos automaticamente.

Há CPP, RAT × FAP, terceiros/FPAS, FGTS de 8%, PIS sobre folha quando informado, benefícios não salariais, reserva rescisória voluntária e despesas fixas do grupo. INSS do empregado e IRRF são retenções, não custo patronal adicional. Benefícios salariais devem integrar a remuneração ou ser revistos, pois o campo de benefícios considera parcelas não salariais.

Perfis: folha comum, Simples fora do Anexo IV (CPP dentro do DAS), Simples Anexo IV, contribuição rural sobre receita, imunidade de entidade beneficente condicionada a confirmação, percentual global personalizado para compatibilidade. Terceiros e contribuições variam pelo enquadramento; não são identificados automaticamente por CNAE. No perfil beneficente, CPP/RAT/terceiros/PIS só são zerados após confirmação dos requisitos. FGTS permanece.

Receita e alíquota efetiva do DAS ou contribuição substitutiva são informadas pelo usuário, separadas da folha e cobradas uma única vez. Não são multiplicadas por empregado nem por contratação. Não há alíquota rural antiga presumida: a Receita registra alterações a partir de abril de 2026. O modelo não recalcula fator R ou incidências da empresa fora das premissas fornecidas.

## Novos contratos

- Indeterminado: custo mensal equivalente, com provisões.
- Safra: exige rural e necessidade estacional. Para termos de até 12 meses, reserva de férias proporcionais indenizadas e 13º. Soma a indenização de 1/12 do salário por mês de serviço do art. 14 da Lei 5.889/1973, sem presumir multa de 40% ou aviso no término normal.
- Experiência: prazo de 1 a 90 dias, reserva de termo curto. Bloqueia experiência na mesma função já exercida para o mesmo empregador; não automatiza eventual exceção coletiva reconhecida em jurisprudência.
- Intermitente: exige alternância declarada e confirmação de contrato escrito/convocação. Limite mensal de convocação por pessoa. Paga horas efetivamente posicionadas, DSR estimado em 1/6, 13º e férias proporcionais com 1/3. Essas parcelas compõem a base de encargos, conforme natureza remuneratória da SC Cosit 17/2019. A disponibilidade e a aceitação das convocações não são garantidas.
- Pequeno prazo rural: produtor PF, necessidade temporária, até dois meses acumulados no ano; meses são estimativa e datas devem ser conferidas. Pagamentos proporcionais por período no orçamento.
- Tempo parcial: até 30h sem HE nos novos contratos. Pode ser combinado com safra, experiência e indeterminado no campo de jornada parcial. Intermitente respeita seu limite de convocação próprio.

Valores mensalizados não liquidam um contrato de duração fracionada: avos exatos, calendário, férias gozadas em prazos maiores, término antecipado e eventos rescisórios exigem cálculo específico.

## Horas extras e comparação

Prorroga somente jornadas já existentes; não ocupa folgas nem pausas. Exige confirmação de acordo e autorizações. Atividade insalubre sem confirmação coletiva e regimes especiais não são prorrogados automaticamente.

Limite de até 2h extras por pessoa/jornada e limite conservador de 10h de trabalho. Na transição de 8h24, este modelo permite até 1h36 de extensão. Preserva 11h entre jornadas, janela semanal de 35h e dias já alocados. Não cria blocos contínuos maiores que 6h. Recupera primeiro horas ordinárias disponíveis dentro dos limites diário e semanal; cobra como HE apenas o excedente diário. A folha adicional de HE recebe prêmio, DSR informado, provisões e incidências sem benefício fixo duplicado.

A demanda usa dia civil. HE noturnas são atribuídas ao dia de início da jornada. O relatório informa volume, pico simultâneo, mínimo de pessoas por volume (limite inferior, não dimensionamento de escala), pessoas realmente alocadas em HE, máximo individual e total diário, distribuição por empregado e lacuna restante.

Novos contratos são posicionados contra a demanda residual, com até 100 novas pessoas. Compara contratar na modalidade escolhida, HE somente e HE + contratação complementar. Só compara de modo conclusivo alternativas com cobertura integral equivalente e premissas fiscais confirmadas. Uma solução de HE mais barata e incompleta não vence uma alternativa de cobertura integral. O motor é heurístico: não prova mínimo global de pessoas ou custo ótimo.

JSON conserva os campos. CSV inclui quadro atual, novos contratos complementares, horários, pausas, minutos de trabalho e de HE. Resumo copiado usa os resultados detalhados.

## Fontes oficiais

- [Salário mínimo de 2026 / Decreto 12.797](https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/2025/12/publicado-decreto-que-reajusta-salario-minimo-para-r-1-621-a-partir-de-1o-de-janeiro).
- [CLT, Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.html): arts. 58-A, 59, 60, 66, 71, 443, 445, 451 e 452-A.
- [Lei 5.889/1973, arts. 14 e 14-A](https://www2.camara.leg.br/legin/fed/lei/1970-1979/lei-5889-8-junho-1973-357971-normaatualizada-pl.pdf).
- [MTE, formas de contratação no meio rural](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/trabalho-sustentavel/cartilhas/formalizacao_contrato_de_trabalho).
- [Receita, contribuições previdenciárias](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/contribuicoes-previdenciarias-pf).
- [Receita, Simples Anexo IV](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/contribuicao-previdenciaria-anexo-iv-do-simples-nacional).
- [Receita, contribuição rural vigente](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-eventos-da-efd-reinf/2-5-4-quais-contribuicoes-sao).
- [Receita, SC Cosit 17/2019, férias do intermitente](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=51057).
- [MTE, perguntas frequentes sobre trabalho intermitente](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes).
- [TRT-6, Ejud Atualiza 104, ressalva coletiva sobre nova experiência](https://portal-ej.trt6.jus.br/noticias/2026/01/30/ejud-6-atualiza-no-104).
- [PGFN, imunidade de entidades beneficentes](https://www.gov.br/pgfn/pt-br/cidadania-tributaria/copy_of_por-perfil-de-contribuinte-1/entidades-beneficentes-de-assistencia-social-e-outras-entidades-sem-fins-lucrativos).

## Executar e validar

`npm run dev`, `npm test`, `npm run build`. O build continua sendo um HTML único para GitHub Pages. Testes incluem fórmulas, parcelas tributáveis, restrições contratuais, imunidade condicionada, limites de HE/descanso, lacunas de intervalo, dimensionamento, dados legados e traduções.
