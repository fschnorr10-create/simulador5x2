# Versão 1.4 — duas tarefas separadas

Pedido final: a experiência anterior estava complexa. O simulador 5×2 passa a seguir a sequência e a referência econômica da CNC. A simulação de contratos rurais passa a uma aba específica.

## Simulador 5×2

Entradas principais: empregados, jornada atual, salário, percentual global de encargos e pessoas simultâneas por dia/horário. Dados da empresa são opcionais. Ajustes especiais, instruções extensas, mapa de cobertura e escala ficam recolhidos.

- Parcial: lacuna semanal ÷ jornada de referência × salário × (1 + encargos%). Quantidade econômica: teto(lacuna ÷ min(30h, jornada)).
- Integral: teto(lacuna ÷ jornada) × salário × (1 + encargos%).
- HE: lacuna semanal × fator mensal × salário/divisor × adicional × DSR × encargos.
- Trata-se de referência por volume de horas, como na CNC, não orçamento de admissões com cobertura garantida minuto a minuto. A escala heurística própria pode exigir mais pessoas. Essa distinção aparece junto aos valores.
- A alternativa HE só concorre ao menor valor quando autorizada e quando o planejador consegue cobrir toda a lacuna respeitando limites. Sua referência econômica continua visível, com viabilidade e horas por dia em detalhes.
- O CSV da aba principal exporta a equipe atual, exatamente como na escala apresentada. O CSV avançado conserva quadro atual, HE e novas admissões do caminho aplicado.
- A configuração fiscal/modalidade da aba de contratos não interfere na referência da aba 5×2.

Correção Dino: 42h com até 8h24 na etapa intermediária nas condições da cautelar (sem adicional automático pelos 24 minutos); 40h na etapa seguinte. Pausas são descontadas e jornadas menores preservadas. Não se presume que a lógica interna da CNC ou seus valores reproduzam a escala própria.

## Simulação de contratos

Empresa rural PJ ou produtor rural PF; novas pessoas a contratar; salário; horas necessárias; datas. Seis modalidades selecionáveis, cada qual com explicação recolhida. Comparação simples: operação, encerramento/direitos acumulados e total. Dados das novas admissões e seleção persistem ao alternar abas e idiomas e no JSON do cenário.

Base comum da comparação simples: 40h semanais; integrais recebem salário inteiro; parcial proporcional até 30h; intermitente proporcional às horas de convocação efetivamente projetadas. Modalidades incapazes de atender à mesma necessidade/jornada ficam fora da indicação. Custos de opções incompatíveis permanecem explicitamente ilustrativos.

Valores do grupo novo, sem inventar rescisão dos empregados antigos. Benefícios por pessoa; tributos sobre receita e outros custos comuns incluídos uma única vez por alternativa. Confirmação fiscal necessária para indicar menor custo. Percentual global personalizado não permite indicação de ciclo completo, por não separar rubricas.

## Ledger do período

Módulos puros `periodDates.ts` e `periodCost.ts`, sem dependência de React.

- Calendário UTC, datas inclusivas; mês civil completo = uma remuneração, frações = dias/30. 13º por mês civil com 15 dias ou mais; férias por meses de serviço e fração de 15 dias.
- Novas admissões iniciam juntas. Salário e alíquotas constantes; não presume mínimo de 2027, reajustes, faltas, adicionais especiais ou benefícios não informados.
- Salários correntes entram uma vez na operação. Saldo salarial final aparece apenas como informação já incluída.
- 13º de anos anteriores é registrado como pago na operação; saldo do ano e reflexos da projeção no encerramento. Não se presume adiantamento do 13º do último ano. Trata-se de composição do custo total, não de guia ou TRCT líquido.
- Férias adquiridas/proporcionais não gozadas e terço indenizado no encerramento; sem CPP/FGTS nessa indenização. Períodos de 12 meses ou mais ficam ilustrativos e fora da indicação, pois o modelo não dimensiona concessão de férias e substituições. Não usar o valor ilustrativo para liquidar férias em dobro ou situações com gozo anterior.
- Aviso quando devido: indenizado, 30 dias + 3 por ano completo, limitado a 90. Mensalistas recebem projeção para avos. CPP sobre 13º reflexo, não sobre aviso indenizado; FGTS sobre aviso. Base da multa de 40% exclui projeção do aviso conforme OJ42-II/TST.
- Experiência: término normal no dia final previsto não tem aviso ou multa de 40%; dispensa antecipada sem cláusula recíproca usa metade dos salários faltantes (art.479) e multa FGTS. Cláusula art.481 aplica regras de prazo indeterminado na rescisão antecipada. Prazo inferior à demanda e repetição na mesma função bloqueados.
- Safra: no término normal, art.14 Lei5.889/1973 (1/12 por mês ou fração superior a14dias), sem aviso e sem multa40. Antecipação da safra exige análise específica, sem indicação automática.
- Intermitente: remuneração, DSR1/6 estimado, 13º e férias+terço pagos durante o vínculo; não se repetem essas parcelas na rescisão. Aviso pela média dos valores recebidos no contrato, conforme orientação do MTE/art.37 Portaria671. Convocações uniformes projetadas, não recibos reais.
- Pequeno prazo: proporcionais pagos no período e não novamente no término normal; respeita perfil PF e dois meses. Períodos anteriores acumulados e cláusula recíproca exigem revisão específica antes da indicação definitiva.
- Pedido de demissão: sem presumir aviso a cargo do empregador ou multa40. Não abate automaticamente art.480/danos ou aviso do empregado.
- Vínculo contínuo após a demanda: direitos acumulados continuam no custo econômico, identificados separadamente do desembolso rescisório.
- Reserva rescisória genérica dos novos contratos é excluída do ledger para não somar reserva e a mesma obrigação outra vez.
- Acordo art.484-A, justa causa, estabilidade, doença, aposentadoria, sucessão e cenários litigiosos não são simulados automaticamente.

A comparação avançada foi preservada, recolhida, com nove variantes/HE, mensal e período, aplicação, exportação e detalhamento.

## Fontes oficiais consultadas em 15/11/2026

- CNC: https://portaldocomercio.org.br/calculadora-5x2/
- STF, notícia oficial da cautelar: https://noticias.stf.jus.br/postsnoticias/stf-mantem-regra-de-transicao-para-implementacao-da-jornada-5x2/
- CLT consolidada: https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.pdf
- MTE, formalização rural: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/trabalho-sustentavel/cartilhas/formalizacao_contrato_de_trabalho
- MTE, intermitente e encerramento: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes
- Receita, incidências: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/pagamentos-e-parcelamentos/emissao-e-pagamento-de-darf-das-gps-e-dae/calculo-de-contribuicoes-previdenciarias-e-emissao-de-gps/tabela-de-incidencia-de-contribuicao
- STJ Tema1170: https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisar&aplicacao=informativo&livre=%40CNOT%3D%27020582%27
- TST aplicação OJ42-II: https://jurisprudencia-backend.tst.jus.br/rest/documentos/a902e3fcfa58e661b429794484419a17

## Execução

`npm install`; `npm run dev`; `npm test`; `npm run build`. Copiar `dist/index.html` para a raiz Pages do simulador e `simulador5x2/index.html` no site institucional. Publicação com atualização condicional da referência Git para preservar alterações concorrentes.
