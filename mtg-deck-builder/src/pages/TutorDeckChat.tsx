import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUp, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { ScryfallCard } from '../types';
import { WizardHatIcon } from '../design-system/components/WizardHatIcon';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { AuthGate } from '../features/deck-builder/AuthGate';
import {
  MODELS,
  MODEL_KEY,
  API_KEY_KEY,
  ApiKeySetup,
} from '../features/deck-builder/CoachTab';
import { getMarkdownComponents, TypingDots } from '../features/deck-builder/coachMarkdown';
import {
  splitIntoParagraphs,
  extractBoldNames,
  useResolvedCardMentions,
} from '../features/deck-builder/coachCardMentions';
import { CommanderSuggestionRow } from '../features/deck-builder/CommanderSuggestionRow';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const TUTOR_SYSTEM_PROMPT = `Você é o Tutor, um especialista em Magic: The Gathering, focado no formato Commander/EDH.

Nesta conversa, sua ÚNICA tarefa é ajudar o usuário a escolher um COMANDANTE para um deck novo — o deck ainda NÃO foi criado, então não fale como se ele já existisse.

Pergunte sobre o tema, mecânica, cores, arquétipo ou estilo de jogo que a pessoa quer, e sugira comandantes específicos e legais (criatura lendária, ou planeswalker cujo texto permite ser comandante) que se encaixem. Explique brevemente por que cada sugestão funciona.

Regras de resposta:
- Sempre em português brasileiro
- Seja direto; se a descrição for vaga, peça esclarecimentos antes de sugerir
- Sempre que sugerir um comandante, escreva o nome oficial em inglês entre ** (ex: **Atraxa, Praetors' Voice**), mesmo no meio da frase — isso ativa uma prévia clicável que já leva pra criação do deck com aquele comandante
- Não coloque outros textos entre ** — apenas nomes reais de cartas que podem ser comandante
- Não sugira cartas que não podem ser comandante`;

const SUGGESTIONS = [
  'Quero um deck agressivo de vermelho e preto',
  'Quero focar em reanimação de criaturas grandes',
  'Quero um deck de controle azul e branco',
];

export default function TutorDeckChat() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(API_KEY_KEY) ?? '');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const model = React.useMemo(() => {
    const stored = localStorage.getItem(MODEL_KEY);
    return stored && MODELS.some((m) => m.id === stored) ? stored : MODELS[0].id;
  }, []);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingId]);

  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abortRef.current?.abort(), []);

  function handlePickCommander(card: ScryfallCard) {
    abortRef.current?.abort();
    navigate('/new-deck/manual', { state: { commander: card } });
  }

  const onOpenSearch = React.useCallback(() => {}, []); // no Search screen reachable before a deck exists

  async function sendMessage(content: string) {
    const useProxy = supabaseConfigured;
    if (!content.trim() || isLoading || (useProxy ? !session : !apiKey)) return;

    const userMsg: Message = { id: genId(), role: 'user', content: content.trim(), timestamp: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    const aId = genId();
    setMessages([...history, { id: aId, role: 'assistant', content: '', timestamp: Date.now() }]);
    setStreamingId(aId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chatMessages = [
        { role: 'system', content: TUTOR_SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = useProxy
        ? await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-proxy`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session!.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ model, messages: chatMessages }),
          })
        : await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'MTG Deck Builder Tutor',
            },
            body: JSON.stringify({ model, stream: true, messages: chatMessages }),
          });

      if (!res.ok) {
        let friendly: string;
        try {
          const json = await res.json();
          if (json?.error?.code === 'rate_limited') {
            friendly = json.error.message ?? 'Limite diário do Tutor atingido. Volte amanhã.';
          } else {
            const raw: string = json?.error?.metadata?.raw ?? '';
            if (res.status === 429) {
              const seconds = raw.match(/"Retry-After":"(\d+)"/)?.[1];
              friendly = `Modelo sobrecarregado — aguarde${seconds ? ` ${seconds}s` : ' alguns segundos'} e tente novamente.`;
            } else if (res.status === 401 || res.status === 403) {
              friendly = useProxy
                ? 'Sessão expirada — saia e entre novamente.'
                : 'Chave de API inválida.';
            } else if (res.status === 404) {
              friendly = 'Modelo indisponível.';
            } else {
              friendly = json?.error?.message ?? `Erro ${res.status}`;
            }
          }
        } catch {
          friendly = `Erro ${res.status}`;
        }
        throw new Error(friendly);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let lineBuffer = '';
      let isThinking = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break outer;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.reasoning_content && !accumulated) {
              if (!isThinking) {
                isThinking = true;
                setMessages((prev) =>
                  prev.map((m) => (m.id === aId ? { ...m, content: '\u{1F9E0} Pensando...' } : m))
                );
              }
              continue;
            }

            if (delta.content) {
              if (isThinking) {
                isThinking = false;
                accumulated = '';
              }
              accumulated += delta.content;
              setMessages((prev) => prev.map((m) => (m.id === aId ? { ...m, content: accumulated } : m)));
            }
          } catch {
            // skip malformed SSE chunk
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => (m.id === aId ? { ...m, content: msg } : m)));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setStreamingId(null);
      }
    }
  }

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--bg-base)',
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '14px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Escolher comandante com o Tutor
        </h1>
      </header>

      {supabaseConfigured ? (
        sessionLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
              <Loader2 size={28} style={{ color: 'var(--accent)' }} />
            </motion.div>
          </div>
        ) : !session ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <AuthGate />
          </div>
        ) : (
          renderChat()
        )
      ) : !apiKey ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ApiKeySetup onSave={(key) => { localStorage.setItem(API_KEY_KEY, key); setApiKey(key); }} />
        </div>
      ) : (
        renderChat()
      )}
    </div>
  );

  function renderChat() {
    return (
      <>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0 8px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WizardHatIcon size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Vamos achar seu comandante</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Descreva o tema, mecânica ou cores que você quer no deck.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      padding: '10px 14px', backgroundColor: 'var(--surface-1)',
                      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px',
                      textAlign: 'left', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <TutorMessageBubble
              key={msg.id}
              msg={msg}
              isStreaming={msg.id === streamingId}
              onPickCommander={handlePickCommander}
              onOpenSearch={onOpenSearch}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '10px 16px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 10px 10px 18px',
              border: `1px solid ${inputFocused ? 'var(--border-strong)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)',
              boxShadow: inputFocused ? '0 0 0 3px var(--accent-subtle)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <input
              placeholder="Descreva o deck que você quer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={isLoading}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '16px',
                color: 'var(--text-primary)', fontFamily: 'inherit', minWidth: 0,
                cursor: isLoading ? 'not-allowed' : 'text',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: canSend ? 'var(--accent)' : 'var(--surface-2)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canSend ? 'pointer' : 'default', flexShrink: 0,
                transition: 'background-color 0.15s', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ArrowUp size={18} color={canSend ? '#0f0f0f' : 'var(--text-muted)'} />
            </button>
          </div>
        </div>
      </>
    );
  }
}

function TutorMessageBubble({
  msg,
  isStreaming,
  onPickCommander,
  onOpenSearch,
}: {
  msg: Message;
  isStreaming: boolean;
  onPickCommander: (card: ScryfallCard) => void;
  onOpenSearch: (query: string) => void;
}) {
  const isUser = msg.role === 'user';
  const resolvedCards = useResolvedCardMentions(msg.content, !isUser && !isStreaming);
  const markdownComponents = React.useMemo(() => getMarkdownComponents(onOpenSearch), [onOpenSearch]);

  if (isUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '8px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}
        >
          <User size={13} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div
          style={{
            maxWidth: '82%', padding: '10px 12px',
            borderRadius: 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)',
            backgroundColor: 'var(--surface-3)', border: '1px solid var(--border-default)',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
            {msg.content}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
            {formatTime(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}
      >
        <WizardHatIcon size={13} style={{ color: 'var(--accent)' }} />
      </div>

      <div style={{ maxWidth: '100%', minWidth: 0, padding: '2px 0' }}>
        {isStreaming && !msg.content ? (
          <TypingDots />
        ) : isStreaming ? (
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {msg.content}
            </ReactMarkdown>
            <span style={{ opacity: 0.4, fontSize: '13px' }}>▍</span>
          </div>
        ) : (
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {splitIntoParagraphs(msg.content).map((block, i) => {
              const names = extractBoldNames(block);
              const cards = names
                .map((n) => resolvedCards.get(n))
                .filter((c): c is ScryfallCard => !!c);
              return (
                <React.Fragment key={i}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {block}
                  </ReactMarkdown>
                  {cards.length > 0 && <CommanderSuggestionRow cards={cards} onPick={onPickCommander} />}
                </React.Fragment>
              );
            })}
          </div>
        )}
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}
