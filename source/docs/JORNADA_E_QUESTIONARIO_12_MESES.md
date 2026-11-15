# Versão 1.5 — horários e dois simuladores independentes

## Escopo solicitado

1. Horário geral da semana, com exceções editáveis apenas nos dias escolhidos.
2. Jornada diária com almoço e trabalho efetivo; opção segunda–sexta e DSR sábado/domingo; montagem personalizada e compensação de descansos, com alerta de ACT/CCT.
3. Um domingo de descanso por mês, confirmado pelo usuário como premissa do planejamento, sem confundir essa premissa com regra universal de todas as categorias.
4. Contratos em questionário separado, começando em PF/PJ e contribuição sobre folha, FUNRURAL/receita ou Simples; necessidade de safra, eventual, permanente, pequeno prazo e tempo parcial.
5. Doze horizontes mensais, com rescisão em cada hipótese; experiência limitada a90 dias e conversão quando houver continuidade; todos os vínculos registrados.

## Arquitetura

`time.ts` centraliza minutos, relógio, duração e constantes, preservando reexportações públicas do motor.

`workSchedule.ts` concentra configurações opcionais, validação de JSON, horário geral de operação, duração de trabalho com almoço, análise do plano e construção das jornadas/cobertura.

`OperatingHours.tsx` controla horário geral e exceções. Alterar o geral modifica apenas os dias marcados que não tenham exceção. A operação tem sempre sete posições de calendário; exclusão/restauração de dias e múltiplas faixas permanecem disponíveis no editor do dia.

`WorkScheduleEditor.tsx` define um grupo com horário comum. Há planos separados para42h e40h, sem apagar um ao editar o outro. Modos: automático; segunda–sexta com DSR sábado/domingo; personalizado. Os dados opcionais preservam compatibilidade com cenários JSON antigos.

`annualContracts.ts` contém o questionário próprio e a comparação de12 horizontes. `ContractWizard.tsx` mostra perguntas condicionais e resultados; não recebe o cenário do simulador5×2. Seu estado fica separado em `App.tsx` e permanece ao alternar abas/idiomas. Os links com fragmento abrem diretamente a aba correspondente.

Os componentes anteriores de comparação permanecem no código para referência; o fluxo público de contratos foi substituído pelo questionário por necessidade, conforme solicitação. O formulário de funcionamento, presets CNC, jornada5×2 e alertas da transição não aparecem no questionário de contratos.

## Jornada, almoço e DSR

- Trabalho efetivo = saída−entrada−almoço, com tratamento de virada de dia. Almoço e total efetivo aparecem no editor e na escala de cada empregado.
- O plano manual é aplicado de fato aos empregados do grupo e à cobertura; não é somente um texto decorativo. Simular grupos com horários diferentes separadamente.
- Segunda–sexta: até8h24na etapa42h e8hna etapa40h, preservando jornada anterior menor. A exceção da liminar depende das condições expressas, inclusive a existência de instrumento coletivo.
- O botão+24min adiciona24min ao plano informado, sem transformar automaticamente o excesso em jornada normal. Exceder a exceção, a carga média, os descansos ou os limites de almoço gera alertas. ACT/CCT não elimina excessos ou demais direitos por mera confirmação.
- A distribuição personalizada de DSR é tratada pelo produto como regime compensatório a conferir em ACT/CCT. Requer referência documental; não basta um acordo individual ou uma caixa marcada. O campo não verifica autenticidade ou conteúdo do instrumento.
- Ciclo exibido: uma semana repetida ou quatro semanas, com8 DSR de referência no ciclo completo de4 semanas. A janela de quatro semanas é uma convenção conservadora do planejador, não um prazo obrigatório imposto pela decisão.
- O controle de domingos usa o maior intervalo entre domingos de descanso, inclusive a passagem do fim para o início do ciclo. Exige no máximo28 dias na premissa mensal do usuário; no comércio sinaliza também o máximo de21 dias. Outras regras, inclusive proteção específica do trabalho feminino e normas coletivas, podem exigir frequência maior.
- Uma escala automática semanal repetida que mantenha trabalho em todos os domingos fica sinalizada para montagem de revezamento. Não é declarada regular só porque respeita duas folgas em outros dias.
- São verificadas11h entre jornadas, inclusive entre ciclos, dia integral de DSR sem invasão da jornada noturna anterior, intervalo mínimo e limite conservador10h de trabalho/dia. O plano continua editável quando houver pendências, mas a indicação econômica fica suspensa.
- Para ciclo de4 semanas, mapa e tabela exibem a semana escolhida. A referência econômica mensal por volume usa a lacuna semanal média do ciclo inteiro; mudar a semana visível não altera esse orçamento. HE no ciclo exige apuração específica e não é indicada automaticamente.
- CSV personalizado inclui todas as semanas do ciclo, com data, almoço, horas efetivas, DSR e situação da revisão. CSV automático mantém o formato anterior.

## Questionário de contratos

- Primeiro PF/PJ. Depois base de contribuição; a pessoa física não recebe opções de Simples Nacional.
- PF/PJ não permite adivinhar CNAE, FPAS, RAT/FAP, opção substitutiva ou alíquotas. Os valores iniciais são referências editáveis, sem indicação definitiva até confirmação contábil.
- Na opção pela folha, o questionário pergunta separadamente se há contribuição sobre comercialização, como SENAR da PF. A resposta e a base são confirmadas pela contabilidade; não se presume que escolher folha elimine essa contribuição.
- FUNRURAL: CPP/RAT substituídos não são somados novamente à folha. FGTS permanece. Terceiros/PIS entram quando informados. Receita e alíquota efetiva são obrigatórias para apresentar total do perfil sobre receita; não se calcula imposto faltante como zero.
- Contribuição sobre receita é comum ao empregador e computada uma vez por mês, não por empregado. A receita mensal informada é projetada constante por12 meses, inclusive fora da safra se essa receita continuar. Não repetir na folha componentes já incluídos na receita.
- Registro de todas as modalidades em CTPS Digital/eSocial e formalidades próprias é indicado antes da primeira pergunta.
- Safra compara safra e experiência com eventual continuidade, para a mesma duração da necessidade. Se a safra durar3meses, ambos os cenários cessam nessa data; os meses restantes não recebem salário. O horizonte do relatório permanece de12 meses, com eventuais custos comuns de receita.
- Eventuais sugerem avaliar intermitente, com alternância real e convocação confirmadas; exibe contraponto de prazo indeterminado integral. Não prova que seja a modalidade mais barata em toda configuração possível de jornada parcial.
- Permanentes comparam indeterminado e experiência/conversão. Pequeno prazo e parcial continuam acessíveis por perguntas específicas.
- Experiência: dias inteiros1–90; histórico na mesma função bloqueia; finalidade real de avaliação deve ser confirmada. A continuidade é por prazo indeterminado, computando serviço desde a admissão; não se adiciona outra rescisão na conversão.

## Custos mensais e anual

Doze horizontes independentes. O mês1responde quanto custaria encerrar no fim do primeiro período. O mês12é o custo do cenário anual. **Não se somam12rescisões de um mesmo vínculo.**

Na safra, os meses anteriores ao fim previsto representam saída antecipada, sujeita à revisão específica das indenizações. Após o fim normal informado, o vínculo consta como já encerrado, sem novos salários e sem outra rescisão.

O ledger separa salários/encargos pagos no período, verbas de encerramento e custos comuns. Saldo salarial informativo não se soma de novo. Intermitente/pequeno prazo não repetem proporcionais já pagos. O aviso indenizado projeta direitos quando devido; mantém-se o tratamento de FGTS e da multa conforme as fontes do modelo.

O horizonte exato de12 meses permite férias adquiridas indenizadas no encerramento do primeiro período aquisitivo, sem presumir gozo anterior. Períodos superiores a12 meses no ledger genérico continuam sujeitos a planejamento específico de férias/substituições. Aviso e direitos projetados são incluídos sem inventar férias já gozadas.

Salário/piso/alíquotas constantes, sem adivinhar reajustes e mínimo de2027. Intermitente usa horas e valor-hora informados; referência inicial conservadora com divisor200. A validação verifica o piso de referência e as etapas44/42/40 conhecidas dentro do horizonte. DSR1/6 e calendário de convocações são estimativas. Não há apuração líquida de INSS/IRRF do empregado nem cálculo de estabilidade/afastamento/férias anteriores.

## Fontes consultadas

- STF, notícia oficial: https://noticias.stf.jus.br/postsnoticias/stf-mantem-regra-de-transicao-para-implementacao-da-jornada-5x2/
- Íntegra da decisão, especialmente itensI eIV: https://portal.stf.jus.br/processos/downloadPeca.asp?ext=.pdf&id=15392248509
- CLT consolidada, experiência e rescisão: https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.pdf
- MTE, contratos rurais: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/trabalho-sustentavel/cartilhas/formalizacao_contrato_de_trabalho
- MTE, intermitente: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes
- Receita, aquisição rural e contribuição SENAR remanescente na opção pela folha: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-6-2-quais-contribuicoes-sao
- Receita, comercialização rural: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-eventos-da-efd-reinf/2-5-4-quais-contribuicoes-sao
- TST, revezamento dominical e normas específicas: https://consultadocumento.tst.jus.br/consultaDocumento/acordao.do?anoProcInt=2018&dtaPublicacaoStr=11%2F02%2F2022+07%3A00%3A00&nia=7768496&numProcInt=244606

## Verificação e execução

`npm test`, `npm run build`, `npm run dev`. Novos testes de aplicação do horário geral, exceções, almoço, DSR, domingos, limites, médias do ciclo, validade do questionário, bases fiscais,12 horizontes, continuidade da experiência, safra sazonal, encargos comuns e ausência de dupla contagem. Idiomas preservados em português/espanhol/inglês.
