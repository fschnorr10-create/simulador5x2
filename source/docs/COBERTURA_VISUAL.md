# Cobertura visual — versão 1.4.1

Correção solicitada: a legenda anterior usava símbolos sem quantificar a cobertura. O quadro indicava o mesmo símbolo para déficits de magnitudes distintas e dependia de hover para explicar dados.

## Apresentação

- Legenda permanente com símbolos idênticos aos das células: ✓100% completo; ◐ parcial; ×0% sem cobertura; — sem demanda.
- Percentual em todas as células com demanda, sem depender exclusivamente de cores.
- Clique/toque/teclado abre uma tabela dos intervalos exatos da hora: pessoas necessárias, disponíveis e faltantes. Demandas e pausas são segmentadas por minuto; não se apresentam médias fracionárias como se fossem pessoas simultâneas.
- Total de cada dia de calendário, sempre considerando as24horas, com demanda, cobertura, falta em horas-pessoa e percentual.
- Opção de exibir00h–24h. Sem essa opção, exibem-se os horários com demanda, com legenda explícita do recorte.
- Cabeçalho identifica o escopo. Padrão: equipe atual, sem HE ou novas admissões. Seletor permite ver HE autorizadas, novas admissões posicionadas pelo planejador e a combinação. Opções bloqueadas pela regra de contratação/autorização/contexto ficam indisponíveis, com motivos consultáveis.
- Novas contratações usam os turnos efetivamente posicionados pelo planejador; podem superar a referência econômica por volume de horas da tela principal. O texto explica a diferença. A tabela de escala que segue continua mostrando o quadro atual.

## Regras de cálculo

`coverage.ts`: somatório por minuto de mínimo(demanda, disponíveis), sem transferir excedentes para outros horários; déficit = demanda menos cobertura atendida. Classificação completa exige ausência de déficit, não média próxima de100%. Percentuais parciais são apresentados entre0,1%e99,9%, evitando arredondamento enganoso para0%/100%.

`coverageIntervals` agrupa somente minutos contíguos com demanda e disponibilidade idênticas. `addWorkerCoverage` soma as faixas efetivas de trabalho dos novos contratos, excluindo intervalos e respeitando o ciclo semanal. Não altera as matrizes de origem.

## Verificação

Seis novos testes cobrem estados, intervalos exatos, limites do arredondamento, horários parcialmente abertos, reconciliação de totais diários com a semana e cobertura das admissões/HE. Idiomas português/espanhol/inglês. Conferência visual em claro/escuro e celular, sem alterar os cálculos econômicos.
