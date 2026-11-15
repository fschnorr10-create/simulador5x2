# Simulador 5 × 2 — Schnorr

Aplicação estática de planejamento de jornadas, cobertura da equipe e custos, com orientação de contratação rural.

Endereço: https://simulador5x2.advschnorr.com.br/

## Publicação

GitHub Pages, branch main, diretório raiz. index.html contém o aplicativo completo e a logo oficial. CNAME identifica o subdomínio; .nojekyll mantém a publicação estática. Sem APIs, cadastro ou envio das entradas a servidor.

## Manutenção

O projeto React + TypeScript + Vite e seus testes estão em source/. Requer Node.js 22.18+ ou 24.

```bash
cd source
npm ci
npm test
npm run build
cp dist/index.html ../index.html
```

Revise as alterações e publique um commit na branch main para atualizar o site. Nunca inclua credenciais, dados reais de empregados ou node_modules.

## Referência jurídica

Conferência em 15/11/2026. Cautelar de 12/11/2026 nas ADIs 8041/8042, sujeita a referendo. O andamento registra destaque pelo ministro Luiz Fux em 14/11/2026. Não há atualização jurídica automática. Fontes estão no aplicativo.

## Limites

Valores ilustrativos. A escala é heurística e não certifica conformidade ou dimensionamento mínimo. Conferir CCT, condições reais, SST e viabilidade de contratação e horas extras antes de implementar.
