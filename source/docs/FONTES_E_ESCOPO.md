# Fontes e escopo da reconstrução

Conferência: 15/11/2026, contexto America/Recife.

## Referências efetivamente consultadas

1. [CNC — Calculadora 5×2](https://portaldocomercio.org.br/calculadora-5x2/): leitura da interface, entradas, resultados, escala, metodologia e regras exibidas. Referência de experiência; código próprio, sem cópia do código-fonte. Divergência identificada: exigência geral de negociação coletiva para as 8h24 e descrição de que o STF ainda não decidiu.
2. [STF — cautelar ADI 8042, 12/11/2026, aplicável também à ADI 8041](https://portal.stf.jus.br/processos/downloadPeca.asp?ext=.pdf&id=15392248508): documento primário, em especial dispositivo. Fundamenta a atualização em relação à página da CNC.
3. [STF — notícia oficial da decisão](https://noticias.stf.jus.br/postsnoticias/stf-mantem-regra-de-transicao-para-implementacao-da-jornada-5x2): contextualização da transição.
4. [STF — andamento](https://portal.stf.jus.br/processos/abaAndamentos.asp?incidente=7740896): pauta inicial do referendo de 13 a 16/11/2026 e registro de destaque pelo ministro Luiz Fux em 14/11/2026. Não foi presumido um julgamento encerrado em 15/11.
5. [Senado — EC 141/2026](https://legis.senado.leg.br/norma/44184944): identificação e referência normativa. O acesso direto ao texto no Planalto foi bloqueado por verificação automatizada; não foi contornada.
6. [Câmara — CLT compilada](https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-5452-1-maio-1943-415500-normaatualizada-pe.pdf): regras gerais e referência para conferência.
7. [Câmara — Lei 5.889/1973](https://www2.camara.leg.br/legin/fed/lei/1970-1979/lei-5889-8-junho-1973-357971-normaatualizada-pl.html): regras rurais.
8. [MTE — possibilidades de jornada](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/perguntas-frequentes/jornada-de-trabalho/quais-sao-as-possibilidades-de): tempo parcial e referência geral anterior à reforma; não usada para sobrepor o cronograma constitucional posterior.
9. [MTE — negociação coletiva](https://www.gov.br/trabalho-e-emprego/pt-br/pdfs/livro-mte-negociacao-coletiva-trabalhista-04nov2024_op002.pdf): referência ao art. 611-A, inclusive prorrogação em ambientes insalubres.

## Origem Claude

O endereço informado retornou “Página não encontrada” no navegador, inclusive autenticado. A ferramenta de leitura web também não obteve o artefato. Não foi encontrado código do simulador no diretório de trabalho, inicialmente vazio. A captura fornecida mostra tema de contratação rural e controles PT/EN/ES, mas não contém o código ou o conteúdo integral.

Portanto, preservação integral e traduções não são afirmadas. O projeto contém nova implementação em português, incluindo jornadas e um orientador rural. Para reconciliar com a versão original, obter sua exportação e comparar seções, cálculos e idiomas, mantendo esta base testada.

## Distinções jurídicas preservadas

- Cronograma da emenda versus pedidos das confederações versus comandos efetivamente deferidos.
- Cautelar imediata versus julgamento definitivo ou referendo encerrado.
- Admissão de portaria subsidiária versus comprovação de portaria editada.
- Revisão de contrapartidas versus autorização de retirada unilateral.
- Estimativa de custos versus autorização de HE, redução de salário ou certificação de escala.
- Enquadramento rural versus atividade/município/CCT efetivamente aplicáveis.

## Validação técnica

Testes em `tests/engine.test.ts` verificam minutos da transição, jornadas menores, custos, pausas, sobreposições, cobertura noturna e invariantes de repouso e limites em cenários variados. Build TypeScript e bundle único. A interface é verificada no navegador para recálculo, validação, navegação e tema. Esses controles não substituem validação jurídica individualizada.
