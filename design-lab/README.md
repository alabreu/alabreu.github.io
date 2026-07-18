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
- Animar o `baseFrequency` do ruído (SMIL `<animate>`, `calcMode="linear"`)
  faz as linhas ondularem devagar, em velocidade fixa (sem aceleração).
- `numOctaves="1"` + um `feGaussianBlur` leve deixam as curvas suaves (menos
  serrilhado); `color-interpolation-filters="sRGB"` evita escurecer a borda; e
  a região do filtro é ampliada (`-50%`/`200%`) pra não cortar a forma quando
  ela é deslocada pra fora.

**Um filtro por elemento (movimento próprio):** em vez de um filtro
compartilhado, o JS gera na carga da página um filtro para cada elemento, com
`seed`, duração e fase **aleatórios**. Assim cada contorno tem seu próprio
desenho e se mexe fora de sincronia com os outros.

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

- **Ligado** → as bordas ondulam (cada uma no seu ritmo).
- **Desligado** → as bordas congelam onde estão, mas continuam
  orgânicas/desenhadas.

Implementação: o toggle apenas **pausa/retoma a timeline SMIL** do SVG inteiro
(`svg.pauseAnimations()` / `unpauseAnimations()`), então congela todos os
contornos de uma vez sem recriar nada. Começa **desligado** automaticamente
pra quem tem `prefers-reduced-motion` ativo.
