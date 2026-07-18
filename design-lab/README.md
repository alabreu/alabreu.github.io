# Design Lab — Organic UI

Protótipo isolado pra testar um estilo de UI "orgânico e desenhado à mão",
inspirado no visual do jogo **Ollie Ollie World**: formas coloridas com
contornos imperfeitos e linhas que se movem suavemente.

Não tem relação com o resto do site nem com o `mtg-deck-builder` — é só um
laboratório de UI.

## Como ver

Abra `design-lab/index.html` direto no navegador (é um único arquivo, sem
build, sem dependências).

## Como o efeito funciona

O "molho secreto" são **filtros SVG**:

- `feTurbulence` gera um ruído (padrão aleatório).
- `feDisplacementMap` usa esse ruído para empurrar os pixels das bordas de
  cada forma → contorno orgânico e imperfeito, como se fosse desenhado.
- No filtro `#wobble`, o `baseFrequency` do ruído é **animado** (SMIL
  `<animate>`), então as linhas ondulam devagar.

Truque de legibilidade: o filtro é aplicado a uma camada de fundo
(`.blob__bg`) atrás do conteúdo, e não no elemento inteiro — assim as bordas
deformam mas o texto continua nítido.

## O que tem na página

Tabs de ícones, paleta de cores, botões, cards/painéis, chips/badges,
toggles, sliders arrastáveis, input e barra de progresso — todos no mesmo
estilo.

## Toggle "Live edges"

No topo da página tem um interruptor **Live edges**: liga/desliga a
*animação* do contorno de **todos** os elementos de uma vez.

- **Ligado** → todo contorno usa o filtro animado (`#wobble`) e ondula.
- **Desligado** → todo contorno fica estático, mas ainda orgânico/desenhado
  (`#organic`).

É só um switch de classe no `<body>` (`body.live-edges`); as regras com essa
classe têm especificidade maior e trocam o filtro de cada elemento sem
`!important`. Começa **desligado** automaticamente pra quem tem
`prefers-reduced-motion` ativo.
