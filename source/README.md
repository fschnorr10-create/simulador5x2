# Simulador 5 × 2 — Schnorr

Simulador local de planejamento de jornada e contratação rural, com comparação das etapas de 42h e 40h, custos, mapa de cobertura e sugestão de escala. Implementação independente inspirada na experiência da calculadora CNC.

## Abrir sem instalar

Abra `outputs/Simulador_Jornada_Campo.html` no Chrome, Safari ou Edge. O arquivo contém o aplicativo e funciona sem internet. Não há chamada a API, fonte externa, cadastro ou envio das entradas a servidor. As fontes jurídicas são links externos, abertos apenas quando escolhidos.

Os dados ficam na memória da sessão. Use **Salvar cenário** para baixar JSON e **Importar** para retomar. **Escala CSV** exporta todos os empregados da etapa selecionada. **Imprimir / PDF** abre a impressão do navegador; escolha “Salvar como PDF”, preferencialmente em paisagem. A interface oferece temas claro e escuro.

## Desenvolvimento

Requisitos: Node.js 22.18+ ou 24 e npm. React + TypeScript + Vite; CSS próprio, ícones Lucide. O plugin singlefile gera um HTML autossuficiente.

```bash
cd /Users/fabioschnorr/Documents/ChatGPT/APP
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Para atualizar o arquivo de distribuição após o build:

```bash
cp dist/index.html outputs/Simulador_Jornada_Campo.html
```

## Arquitetura

- `src/engine.ts`: validação, demanda por minuto, alocação de jornadas e custos; sem dependência de React.
- `src/types.ts`: contratos de dados e cenário JSON versão 1.
- `src/defaults.ts`: exemplos ilustrativos rural e CNC.
- `src/components/ScenarioForm.tsx`: coleta das entradas e horários por dia/faixa.
- `src/components/Results.tsx`: comparação de etapas, cobertura, custos e escala.
- `src/components/Knowledge.tsx`: contratação rural, base legal e método.
- `src/App.tsx`: composição, importação/exportação, navegação e tema.
- `tests/engine.test.ts`: cenários de cálculo e invariantes do motor.

## Premissas e limites

O modelo considera migração para 5×2, preserva jornadas menores e usa 8h24 como teto diário da etapa de 42h nas condições descritas na cautelar. A comparação de 12×36 ou turnos variados é apenas uma hipótese de migração; não valida esses regimes.

A demanda e as pausas são contabilizadas por minuto. A busca considera entradas em passos de 30min e bordas de faixas, intervalos, duas folgas consecutivas, limite semanal, descanso entre jornadas de 11h e uma janela de 35h no ciclo repetido. Duas passagens de revisão melhoram o revezamento sem reduzir a cobertura alcançada. É heurística: não prova dimensionamento mínimo nem certifica conformidade. Em jornada noturna, o dia de início identifica a jornada; revisar o gozo dos repousos em dias civis.

Contratações adicionais são equivalências econômicas de horas e não são alocadas automaticamente nos horários descobertos. HE é referência financeira, sujeita a viabilidade específica. Não se presume que pagar HE substitua folgas.

Divisor de referência = jornada semanal × 5 para mensalista comum. Fator mensal das horas extras e DSR são aproximações ajustáveis. Conferir piso, benefícios, regras especiais e a composição dos encargos. O modelo não liquida verbas trabalhistas nem inclui automaticamente adicionais noturnos, de insalubridade/periculosidade ou pausas específicas de SST.

O orientador rural apenas indica hipóteses para análise. A estimativa de pequeno prazo em meses não substitui a contagem exata dos períodos, requisitos de formalização ou exame da causa contratual.

## Referência jurídica e origem

Conferência em **15/11/2026**. Cautelar de **12/11/2026**, ADIs 8041/8042, com eficácia imediata e sujeita ao referendo do Plenário. O julgamento virtual, inicialmente pautado para 13–16/11/2026, recebeu destaque do ministro Luiz Fux em 14/11/2026. Não há atualização automática da base jurídica; revisar a fonte antes de usar após a data de conferência.

Fontes primárias e comparação da CNC estão na seção **Base legal e decisão STF**, além de `docs/FONTES_E_ESCOPO.md`.

O link fornecido para o Claude retornou “Página não encontrada”, inclusive no navegador autenticado. Este projeto é uma reconstrução a partir da captura fornecida e da CNC, **não uma migração integral confirmada**. O conteúdo integral, as traduções PT/EN/ES e eventuais recursos não visíveis do artefato original dependem de exportação do HTML ou de link acessível; não foram recuperados. A versão atual está em português.

## Implantação

Repositório: https://github.com/fschnorr10-create/simulador5x2

Destino: https://simulador5x2.advschnorr.com.br/

GitHub Pages, branch `main`, raiz. O projeto completo também foi preservado na pasta `source/` do repositório remoto. A raiz contém o HTML compilado, `CNAME` e `.nojekyll`. Os testes e o build devem ser executados na pasta `source/`; copiar o novo HTML para a raiz antes de publicar uma atualização.

DNS: registro CNAME `simulador5x2` para `fschnorr10-create.github.io`. Os 33 registros preexistentes foram preservados; evidência local em `docs/dns-preservacao-2026-11-15.json`. Conferir o estado de TLS no registro de publicação.

## Segurança

Importação limitada a 150 KB, valores numéricos finitos e dentro de limites, validação de sete dias e até seis faixas por dia, rejeição de sobreposição inclusive entre domingo e segunda. Sem execução de HTML importado, sem `dangerouslySetInnerHTML`, sem segredos e sem persistência em armazenamento do navegador. Arquivos salvos são locais. A exportação CSV contém identificadores gerados e dados de horário, sem fórmulas vindas de entradas livres.

Esta ferramenta não substitui parecer jurídico individualizado nem conferência da CCT vigente e das condições reais de trabalho.

### Idiomas, temas e apresentação visual (versão 1.1)

O seletor do cabeçalho oferece português (padrão), espanhol e inglês. As traduções ficam em `src/i18n/messages.ts`; `core.ts` trata os textos dinâmicos e `index.tsx` mantém o idioma em contexto React. Idioma e tema não alteram os dados do cenário nem o JSON. Valores monetários continuam em BRL, com formatação do idioma selecionado. O aplicativo inicia no modo escuro e oferece modo claro; não grava preferências ou dados em armazenamento do navegador.

O banner `VisualGuide` apresenta agro, indústria, colégios e instituições beneficentes, seguido de quatro etapas de uso. As imagens são ilustrativas. Consulte `docs/IMAGENS.md` para origem e prompt. A logomarca oficial possui 1165 × 551 pixels e contraste reforçado por CSS no modo claro. Os arquivos WebP mantêm a página única compacta, sem chamadas a serviços de imagem ou tradução.

Validação: `npm test` (22 testes) e `npm run build`. A publicação continua usando `dist/index.html` nos dois endereços documentados em `docs/PUBLICACAO.md`.

### Banner rotativo no topo

`VisualGuide` aparece imediatamente após o cabeçalho. Quatro slides sincronizam setor, fotografia, explicação e etapa de uso, com passagem automática a cada 10 segundos. Há pausa/reprodução, anterior/próximo e seleção direta pelos indicadores. A navegação manual pausa a apresentação para leitura; reproduzir retoma o ciclo. O temporizador é limpo na desmontagem e suspenso em abas ocultas e durante interação com o ponteiro. Pessoas com preferência por movimento reduzido recebem o banner pausado e sem animação. Controles e conteúdo acompanham PT/ES/EN, mantendo ambos os temas e os dados do simulador.


### Banners por finalidade

O menu de seções aparece no topo. Cada finalidade possui um conjunto próprio de slides: simulação (introdução e quatro setores), contratação rural (modalidades e necessidade), base legal (regras, transição e limites), metodologia (premissas, cobertura e custos). O conteúdo fica em `src/bannerContent.ts`; `VisualGuide` controla somente apresentação, temporizador e navegação. Trocar de aba reinicia seu banner sem alterar o cenário. A introdução genérica repetida foi substituída por banners contextuais; o cronograma permanece em uma faixa compacta. As imagens são ilustrativas; consulte `docs/IMAGENS.md`.

Validação desta atualização: 23 testes, incluindo cobertura das traduções de todos os banners, e build TypeScript/Vite.

### Demanda, folha e decisão entre contratar e fazer HE

As abas de simulação e contratação compartilham empregados, demanda diária, piso, modalidade e perfil tributário. O novo relatório discrimina o custo mensal do grupo e dos novos contratos, dimensiona HE por empregado/dia, monta contratação complementar e compara alternativas de cobertura equivalente. Há indeterminado, safra, experiência, intermitente, pequeno prazo e jornada parcial, com restrições específicas. O exemplo rural usa o mínimo de 2026 (R$ 1.621). A referência CNC conserva seus valores iniciais.

Consulte `docs/CUSTOS_CONTRATACAO.md` para arquitetura, fórmulas, premissas, limites e fontes oficiais. `planning` é opcional no JSON v1; arquivos anteriores continuam suportados. O CSV exporta o plano combinado, incluindo minutos de HE. A apresentação mantém três idiomas e temas claro/escuro.

### Comparação geral — versão 1.3

A tabela `ContractComparison` compara nove variantes de contratação, cada uma sem HE e combinada às HE do quadro atual, além da alternativa sem novas admissões. Indica o menor custo mensal elegível com cobertura integral, destaca empates, mostra os motivos das exclusões e permite aplicar a escolha ao detalhamento/CSV. A comparação preserva todas as premissas; os custos de modalidades impedidas são apenas hipotéticos. Consulte `docs/COMPARACAO_MODALIDADES.md`. Validação: 53 testes e build aprovado.
