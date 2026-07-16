import React from 'react';
import { RefreshCw, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CONTENT_MAX_WIDTH } from '../design-system/responsive';
import { TUTOR_MODELS, ACTIVE_MODEL_SETTING_KEY, TutorModel } from '../features/deck-builder/tutorModels';

interface DayCount { day: string; count: number }
interface DayCost { day: string; count: number; cost_micro: number }
interface InboxMsg {
  id: string | number;
  source: string;
  type: string;
  message: string;
  contact_email: string | null;
  page_context: string | null;
  user_email: string | null;
  created_at: string;
}
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

function Inbox() {
  const [msgs, setMsgs] = React.useState<InboxMsg[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    supabase.rpc('admin_feedback', { p_limit: 50, p_offset: 0 }).then(({ data, error }) => {
      if (error) setErr(error.message);
      else setMsgs((data as InboxMsg[]) ?? []);
    });
  }, []);

  if (err) return <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{err}</p>;
  if (!msgs) return <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Carregando…</p>;
  if (msgs.length === 0) return <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Nenhuma mensagem ainda.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {msgs.map((m) => {
        const isBug = m.type === 'bug';
        const contact = m.contact_email || m.user_email;
        return (
          <div key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isBug ? 'var(--error)' : 'var(--success)', backgroundColor: isBug ? 'rgba(248,113,113,0.12)' : 'rgba(47,174,121,0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                {isBug ? 'bug' : 'ideia'}
              </span>
              {m.source !== 'in_app' && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-3)', padding: '1px 6px', borderRadius: '4px' }}>{m.source}</span>
              )}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              {contact && (
                <a href={`mailto:${contact}`} style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>{contact}</a>
              )}
              {m.page_context && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.page_context}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Admin-only control that picks which model the Tutor runs on for everyone.
 *  Writes go through the admin_set_active_model SQL function (migration 0007);
 *  the coach-proxy reads the value server-side, so users never choose. */
function ActiveModelControl() {
  const [active, setActive] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', ACTIVE_MODEL_SETTING_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setErr(
            error.code === 'PGRST205' || error.message?.includes('app_settings')
              ? 'Rode a migração 0007 no Supabase para habilitar o controle de modelo.'
              : error.message
          );
          return;
        }
        if (typeof data?.value === 'string') setActive(data.value);
      });
  }, []);

  async function pick(id: string) {
    if (!supabase || saving || id === active) return;
    setSaving(id);
    setErr(null);
    const prev = active;
    setActive(id); // optimistic
    const { error } = await supabase.rpc('admin_set_active_model', { p_model: id });
    setSaving(null);
    if (error) {
      setActive(prev);
      setErr(
        error.message?.includes('Could not find the function') || error.code === 'PGRST202'
          ? 'Rode a migração 0007 no Supabase para habilitar o controle de modelo.'
          : error.message?.includes('not authorized')
          ? 'Acesso negado.'
          : error.message
      );
    }
  }

  const groups: { tier: TutorModel['tier']; label: string }[] = [
    { tier: 'paid', label: 'Pagos' },
    { tier: 'free', label: 'Grátis' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
        Vale para TODOS os usuários. Modelos pagos custam dinheiro por mensagem; grátis podem ficar sobrecarregados.
      </p>
      {err && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{err}</p>}
      {groups.map((g) => (
        <div key={g.tier} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{g.label}</span>
          {TUTOR_MODELS.filter((mm) => mm.tier === g.tier).map((mm) => {
            const isActive = active === mm.id;
            return (
              <button
                key={mm.id}
                onClick={() => pick(mm.id)}
                disabled={!!saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  backgroundColor: isActive ? 'var(--accent-subtle)' : 'var(--surface-2)',
                  border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)', cursor: saving ? 'wait' : 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', width: '100%',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {mm.label}
                    {mm.tier === 'paid' && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--error)', marginLeft: '6px' }}>$</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{mm.provider}{mm.note ? ` · ${mm.note}` : ''}</p>
                </div>
                {saving === mm.id ? (
                  <Loader2 size={15} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                ) : isActive ? (
                  <Check size={15} style={{ color: 'var(--accent)' }} />
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface ORStatus {
  key: { usage?: number; limit?: number | null; limit_remaining?: number | null; is_free_tier?: boolean };
  credits: { total_credits?: number; total_usage?: number };
}

/** Live OpenRouter spend/credit for the shared key, via the admin-gated
 *  admin-openrouter-status edge function (the key never reaches the browser). */
function OpenRouterStatus() {
  const [data, setData] = React.useState<ORStatus | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    supabase.functions.invoke('admin-openrouter-status').then(({ data, error }) => {
      if (error) {
        setErr('Função admin-openrouter-status não implantada ainda (veja o backlog).');
        return;
      }
      setData(data as ORStatus);
    });
  }, []);

  if (err) return <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{err}</p>;
  if (!data) return <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Carregando…</p>;

  const usage = data.credits?.total_usage ?? data.key?.usage ?? 0;
  const totalCredits = data.credits?.total_credits;
  const remaining =
    typeof totalCredits === 'number' ? totalCredits - usage : data.key?.limit_remaining ?? null;
  const limit = typeof totalCredits === 'number' ? totalCredits : data.key?.limit ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gasto</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>US$ {usage.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Restante</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: remaining !== null && remaining < 5 ? 'var(--error)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {remaining !== null ? `US$ ${remaining.toFixed(2)}` : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Crédito total</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {limit !== null ? `US$ ${limit.toFixed(2)}` : 'sem limite'}
        </span>
      </div>
    </div>
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
  const [state, setState] = React.useState<{ kind: 'loading' } | { kind: 'error'; msg: string } | { kind: 'ok'; data: Metrics }>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    if (!supabase) {
      setState({ kind: 'error', msg: 'Backend não configurado.' });
      return;
    }
    setState({ kind: 'loading' });
    const { data, error } = await supabase.rpc('admin_metrics');
    if (error) {
      const m = error.message || '';
      let friendly: string;
      if (m.includes('not authorized')) {
        friendly = 'Acesso negado — sua conta não está na tabela de administradores.';
      } else if (m.includes('Could not find the function') || m.includes('schema cache') || error.code === 'PGRST202') {
        friendly = 'Painel ainda não configurado. Rode a migração 0006 no Supabase e adicione seu usuário na tabela public.admins.';
      } else {
        friendly = m;
      }
      setState({ kind: 'error', msg: friendly });
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
          padding: 'calc(env(safe-area-inset-top) + 16px) 16px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto' }}>
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

              <Section title="Modelo ativo do Tutor">
                <ActiveModelControl />
              </Section>
              <Section title="OpenRouter (chave do Tutor)">
                <OpenRouterStatus />
              </Section>

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
              <Section title="Caixa de entrada">
                <Inbox />
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
