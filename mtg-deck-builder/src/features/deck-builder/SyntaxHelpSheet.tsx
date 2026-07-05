import { BottomSheet } from '../../design-system/components/BottomSheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS: Array<{
  title: string;
  intro?: string;
  rows: Array<{ code: string; desc: string }>;
}> = [
  {
    title: 'Básico',
    intro: 'Palavras soltas buscam no nome da carta. Termos separados por espaço se combinam (E lógico).',
    rows: [
      { code: 'lightning bolt', desc: 'nome contém "lightning" e "bolt"' },
      { code: '"draw a card"', desc: 'frase exata, com aspas' },
      { code: 't:elf t:warrior', desc: 'combina condições (E)' },
      { code: '(t:elf or t:goblin)', desc: 'OU lógico, entre parênteses' },
      { code: '-t:creature', desc: 'negação: exclui criaturas' },
    ],
  },
  {
    title: 'Texto e tipo',
    rows: [
      { code: 'o:flying', desc: 'texto de regras contém "flying"' },
      { code: 'o:"enters tapped"', desc: 'frase exata no texto' },
      { code: 't:creature', desc: 'linha de tipo' },
      { code: 't:legendary t:dragon', desc: 'dragão lendário' },
      { code: 'kw:haste', desc: 'tem a keyword (ímpeto)' },
    ],
  },
  {
    title: 'Cores e identidade',
    intro: 'Letras: w u b r g (cores) e c (incolor).',
    rows: [
      { code: 'c:rg', desc: 'é vermelha E verde' },
      { code: 'c=rg', desc: 'exatamente vermelha e verde' },
      { code: 'c<=ub', desc: 'no máximo azul/preta' },
      { code: 'id<=wub', desc: 'cabe em comandante Esper' },
      { code: 'id=c', desc: 'identidade incolor' },
    ],
  },
  {
    title: 'Números',
    rows: [
      { code: 'mv=3', desc: 'valor de mana igual a 3' },
      { code: 'mv<=2', desc: 'valor de mana até 2' },
      { code: 'pow>=4', desc: 'poder 4 ou mais' },
      { code: 'tou>5', desc: 'resistência maior que 5' },
      { code: 'pow>tou', desc: 'poder maior que a resistência' },
    ],
  },
  {
    title: 'Raridade, sets e formato',
    rows: [
      { code: 'r:mythic', desc: 'raridade (common, uncommon, rare, mythic)' },
      { code: 'r>=rare', desc: 'rara ou mítica' },
      { code: 's:tdc', desc: 'código da coleção' },
      { code: 'f:commander', desc: 'legal em Commander' },
      { code: 'banned:commander', desc: 'banida em Commander' },
    ],
  },
  {
    title: 'Propriedades úteis',
    rows: [
      { code: 'is:commander', desc: 'pode ser comandante' },
      { code: 'is:ramp', desc: 'aceleração de mana (tags Scryfall)' },
      { code: 'is:removal', desc: 'remoção' },
      { code: 'is:fetchland', desc: 'fetch lands' },
      { code: 'is:dfc', desc: 'carta dupla-face' },
      { code: 'year>=2024', desc: 'lançada a partir de 2024' },
      { code: 'usd<=5', desc: 'preço até US$ 5' },
    ],
  },
];

export function SyntaxHelpSheet({ isOpen, onClose }: Props) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Sintaxe de busca" maxHeight="88vh">
      <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          O campo de busca aceita a sintaxe completa do{' '}
          <a
            href="https://scryfall.com/docs/syntax"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            Scryfall
          </a>
          . Você pode combinar sintaxe digitada com os filtros da busca avançada — as condições se somam.
        </p>

        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              {section.title}
            </p>
            {section.intro && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '8px' }}>
                {section.intro}
              </p>
            )}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {section.rows.map((row, i) => (
                <div
                  key={row.code}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '9px 12px',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <code
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--accent)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {row.code}
                  </code>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, minWidth: 0 }}>
                    {row.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
