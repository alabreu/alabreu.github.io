import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CONTENT_MAX_WIDTH } from '../design-system/responsive';

interface DayCount { day: string; count: number }
interface DayCost { day: string; count: number; cost_micro: number }
interface Metrics {
  generated_at: string;
  totals: { users: number; decks: number; coach_messages: number; coach_messages_today: number; cost_micro_usd_30d: number };
  active_users: { dau: number; wau: number; mau: number };
  new_users_by_day: DayCount[];
  decks_by_day: DayCount[];
  messages_by_day: DayCost[];
  model_mix: { model: string; count: number }[];
  feedback: { type: string; count: number }[];
}

const usd = (micro: number) => `US$ ${(micro / 1_000_000).toFixed(2)}`;
const shortDay = (iso: string) => iso.slice(5); // MM-DD

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  );
}

/** Lightweight inline bar chart — no charting dependency. */
function BarChart({ data, color = 'var(--accent)' }: { data: { label: string; value: number }[]; color?: string }) {
  if (data.length === 0) return <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0' }}>Sem dados ainda.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 320;
  const H = 90;
  const gap = 2;
  const bw = Math.max(1, (W - gap * (data.length - 1)) / data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {data.map((d, i) => {
        const h = (d.value / max) * H;
        const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx={1} fill={color} opacity={0.85}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          </g>
        );
      })}
      {/* first + last day labels only, to avoid clutter */}
      <text x={0} y={H + 12} fontSize={8} fill="var(--text-muted)">{data[0]?.label}</text>
      <text x={W} y={H + 12} fontSize={8} fill="var(--text-muted)" textAnchor="end">{data[data.length - 1]?.label}</text>
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
      <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [state, setState] = React.useState<{ kind: 'loading' } | { kind: 'error'; msg: string } | { kind: 'ok'; data: Metrics }>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    if (!supabase) {
      setState({ kind: 'error', msg: 'Backend não configurado.' });
      return;
    }
    setState({ kind: 'loading' });
    const { data, error } = await supabase.rpc('admin_metrics');
    if (error) {
      setState({ kind: 'error', msg: error.message.includes('not authorized') ? 'Acesso negado — sua conta não é administradora.' : error.message });
      return;
    }
    setState({ kind: 'ok', data: data as Metrics });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'max(14px, env(safe-area-inset-top)) 16px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>Painel</h1>
          <button onClick={load} aria-label="Atualizar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main style={{ padding: '16px', width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {state.kind === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {state.kind === 'error' && (
          <p style={{ color: 'var(--error)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>{state.msg}</p>
        )}
        {state.kind === 'ok' && (() => {
          const m = state.data;
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <Tile label="Usuários" value={m.totals.users} />
                <Tile label="Decks" value={m.totals.decks} />
                <Tile label="Msgs Tutor (hoje)" value={m.totals.coach_messages_today} sub={`${m.totals.coach_messages} no total`} />
                <Tile label="Custo est. (30d)" value={usd(m.totals.cost_micro_usd_30d)} />
                <Tile label="Ativos (DAU)" value={m.active_users.dau} sub={`WAU ${m.active_users.wau} · MAU ${m.active_users.mau}`} />
                <Tile label="Feedback" value={m.feedback.reduce((s, f) => s + f.count, 0)} sub={m.feedback.map((f) => `${f.count} ${f.type}`).join(' · ') || '—'} />
              </div>

              <Section title="Novos usuários / dia (30d)">
                <BarChart data={m.new_users_by_day.map((d) => ({ label: shortDay(d.day), value: d.count }))} />
              </Section>
              <Section title="Decks criados / dia (30d)">
                <BarChart data={m.decks_by_day.map((d) => ({ label: shortDay(d.day), value: d.count }))} color="var(--success)" />
              </Section>
              <Section title="Mensagens do Tutor / dia (30d)">
                <BarChart data={m.messages_by_day.map((d) => ({ label: shortDay(d.day), value: d.count }))} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0' }}>
                  Custo no período: {usd(m.messages_by_day.reduce((s, d) => s + d.cost_micro, 0))}
                </p>
              </Section>
              <Section title="Modelos usados (30d)">
                {m.model_mix.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Sem dados ainda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {m.model_mix.map((mm) => {
                      const total = m.model_mix.reduce((s, x) => s + x.count, 0);
                      const pct = Math.round((mm.count / total) * 100);
                      return (
                        <div key={mm.model} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mm.model}</span>
                          <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '52px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{mm.count} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                Atualizado em {new Date(m.generated_at).toLocaleString('pt-BR')}
              </p>
            </>
          );
        })()}
      </main>
    </div>
  );
}
