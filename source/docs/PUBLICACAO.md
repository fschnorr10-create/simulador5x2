# Publicação do Simulador 5 × 2

- Repositório: https://github.com/fschnorr10-create/simulador5x2
- Endereço solicitado: https://simulador5x2.advschnorr.com.br/
- Hospedagem: GitHub Pages, branch main, raiz.
- Publicação inicial: commit 11c7f68829b72fd675328bd2267e1e6e3bbf9b55.
- Preservação do fonte e testes: commit 35bab31a852c8cbecdaa89b8272eec7b14e8735e.
- DNS: CNAME simulador5x2.advschnorr.com.br → fschnorr10-create.github.io.
- Conferência: 33 registros anteriores preservados, 34 após a inclusão.
- Resolução confirmada no DNS autoritativo, Google Public DNS e Cloudflare DNS.
- HTTP 200 confirmado no destino por Host com IP resolvido; HTML remoto idêntico por SHA-256 ao build local.
- TLS: certificado validado em 15/11/2026 às 10h15 (America/Recife), HTTPS 200 e redirecionamento HTTP → HTTPS 301 confirmados.
- HTML HTTPS remoto conferido por SHA-256, idêntico ao build local.
- Navegador abriu o endereço definitivo normalmente, sem alertas de certificado.
- Integração ao menu e aos materiais publicada inicialmente no commit ad1e12076d36961187e872d11c66245c3e9733e6; links direcionados ao endereço definitivo no commit e20f091c67b94f0ad15b6d87a6a56ffafb8ab3b1.
- Endereço HTTPS adicional ativo: https://advschnorr.com.br/simulador5x2/.
- As duas execuções de GitHub Pages concluíram com sucesso; IDs 43717322083 e 43717161377.
- Versão pública verificada no navegador: recálculo, logo e viewport móvel 390px sem transbordamento horizontal.

## Conferência final

- Execução final de GitHub Pages concluída com sucesso: https://github.com/fschnorr10-create/advschnorr-site/actions/runs/43718194392.
- Os dois links do menu e dos materiais apontam para https://simulador5x2.advschnorr.com.br/.
- URL definitiva verificada no navegador, com logo oficial, recálculo e base jurídica atualizada.
- HTTPS obrigatório ativado; HTTP retorna 301 para HTTPS.

## Edição dos dias de funcionamento

- Exclusão de dia inteiro e restauração sem duplicação; calendário limitado a sete dias.
- Faixas de horário adicionais continuam pertencendo ao mesmo dia.
- Cenários salvos preservam os dias excluídos; copiar segunda-feira não restaura dias excluídos.
- Testes: 19 aprovados, incluindo jornadas de 44h, 42h e 40h e recalculo da demanda excluída.
- Simulador: commit 667c5f9071248d9d9496d3ea7945c340933372b1.
- Endereço alternativo no site: commit b150e96bd14511fae2cb53b3dd17acb9bbe27e6b.


## Atualização de 15/11/2026 — versão 1.1

Português, espanhol e inglês em todas as seções, notificações e legendas; moeda BRL com formatação local. Tema escuro inicial, alternância clara, logo oficial 1165 × 551 com contraste reforçado. Banner com quatro setores e roteiro ilustrado de uso. Conteúdo e dados de cenário preservados na troca de idioma.

- Simulador: `4a23ef916fa8015d3309c6c99db48ba30da5c3de`.
- Site integrado: `903d9c8cf5a608c695a425bc5d26ef66550e3d8c`.
- SHA-256 do HTML: `701b5ff1032352f84de7760358bd50f169e284f24af466c25a4829c93ce508be`.
- Ambos os endereços responderam HTTP 200 e serviram HTML idêntico ao build.
- 22 testes aprovados, build TypeScript/Vite aprovado. Verificação em navegador: PT/ES/EN, temas, preservação das entradas, guia rural, metodologia, validação e exclusão/restauração de dia; celular de 390px sem overflow horizontal.
- Capturas: `outputs/Simulador_banner_setores.jpg` e `outputs/Simulador_logo_claro_ingles.jpg`. Origem das imagens e prompt em `docs/IMAGENS.md`.


### Banner rotativo no topo — 15/11/2026

Quatro slides sincronizados, intervalo de 10 segundos, pausa/reprodução, anterior/próximo e indicadores. Apresentação inicialmente pausada para movimento reduzido; suspende temporizador em abas ocultas. Navegação manual pausa para leitura. Testes em navegador confirmaram troca automática, pausa estável, avanço, retorno, seleção direta, PT/ES/EN, modo claro e celular sem overflow. Os 22 testes e build continuam aprovados.

- Simulador: `71e3aecfe1d3d2f5e42122c5a93f8a627b1a9f2b`.
- Site integrado: `dcdd3c91dccff8956ed279f0ace0852ecc81e395`.
- SHA-256 do HTML: `8fa08c62b62e018e68036d6b937ddd44d64c9e8b942efb99003bb8b7ffb5095a`.


### Banners por finalidade — 15/11/2026

Menu no topo, banner contextual de cada aba e cronograma compacto. Novas fotos ilustrativas: contratação rural, análise jurídica e cálculos. Cinco slides no simulador (introdução e quatro setores) e três em cada uma das demais finalidades. Rotação de 10 segundos e controles preservados. Traduções completas, dados de cenário independentes da apresentação.

- Simulador: `92e8620fbb9a658291cc02f8378d554bf1f8023d`.
- Site integrado: `a43e1378df7457055bc673523cc02f319b80aa1b`.
- HTML SHA-256: `55b964f8aa797c27615d6c3881f2036e26e9c9b2bb7bab213fb0c3bc56c4817e`.
- HTTP 200 e HTML idêntico ao build em ambos os endereços.
- 23 testes e build aprovados. Conferidos em navegador: quatro abas, CTA rural, preservação de empregados, inglês, espanhol, modo claro e viewport de 390px sem overflow horizontal.
- Prompt e origem das imagens: `docs/BANNERS_FINALIDADES.md`.


## Versão 1.2.0 — demanda, encargos e contratação — 15/11/2026

Dados compartilhados nas abas de simulação e contratação rural; empregados de 0 a 100; demanda diária; salário mínimo de referência de R$ 1.621 em 2026; seis modalidades; perfis tributários; folha/provisões discriminadas; HE dimensionadas com limites diários e descansos; comparação de cobertura equivalente e contratação complementar; CSV com HE. Conferir `docs/CUSTOS_CONTRATACAO.md` para limites e fontes.

- Simulador: `11bc5082f47b007946749c2ed0d644075d0b245e`.
- Site integrado: `2cb4f9e03906dfc126e4e91cb3910f52065418a3`.
- SHA-256: `ed34bfc528614d5c49419efdd7d739f6d2896399f1b817760360b13021812115`.
- Ambos os workflows concluídos com sucesso; HTTP 200 e build idêntico nos dois endereços.
- 42 testes aprovados e build TypeScript/Vite aprovado.
- Navegador: demanda e quadro atual na aba rural; uso do mínimo; safra e reserva do art. 14; bloqueio de experiência na mesma função; intermitente; confirmação fiscal e de HE; textos em inglês/espanhol; viewport de 390px sem overflow; CSV conferido com nove colunas, quadro atual e novas admissões, 72 jornadas do cenário ilustrativo.
- Captura do exemplo público: `outputs/Simulador_custos_contratacao_1_2.jpg`.


## Versão 1.3.0 — todas as modalidades lado a lado — 15/11/2026

Comparação geral de seis modalidades, com variações parciais (nove variantes), sem/com HE e opção sem novas admissões. Menor custo mensal condicionado à elegibilidade, cobertura integral e premissas fiscais confirmadas. Custos de opções impedidas são hipotéticos. Empates, economia para próxima opção elegível, aplicação ao detalhamento/escala e CSV com 20 alternativas.

- Simulador: `775424cabd8e8b1924d8320704697dff988eb86e`.
- Site integrado: `c78e4803e2a8e2be217a3fe7942301f3a3f91c3a`.
- SHA-256: `9b499df9113b60072e1ab902737db9e4a9a67a48e5c31bc3444fd43833b96faf`.
- Ambos os workflows concluídos com sucesso; HTTP 200 e build idêntico nos dois endereços.
- 53 testes e build aprovados.
- Conferidos no navegador: tabela, aplicação, intermitente bloqueado na demanda contínua e habilitado sob novas condições explícitas, troca 42h/40h, empates, inglês/espanhol e celular sem overflow horizontal da página.
- CSV conferido: 20 alternativas, dez colunas, confirmação fiscal e empates consistentes com o mínimo elegível.
- Captura pública: `outputs/Simulador_comparativo_modalidades_1_3.jpg`.
- Método: `docs/COMPARACAO_MODALIDADES.md`.
