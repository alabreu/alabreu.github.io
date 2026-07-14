import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, User, Key, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Deck, ScryfallCard } from '../../types';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { WizardHatIcon } from '../../design-system/components/WizardHatIcon';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import { AuthGate } from './AuthGate';
import { CardMentionRow } from './CoachCardPreviews';
import { splitIntoParagraphs, extractBoldNames, useResolvedCardMentions, resolveCardMentions } from './coachCardMentions';
import { getMarkdownComponents, TypingDots } from './coachMarkdown';
import {
  PERSONAS,
  Persona,
  buildTutorSystemPrompt,
  getCustomInstructions,
  setCustomInstructions,
  CUSTOM_INSTRUCTIONS_MAX_LEN,
} from './tutorPersona';

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  note?: string;
}

export const MODELS: ModelOption[] = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', provider: 'OpenAI', note: 'Pago (barato) · sem fila de sobrecarga' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', provider: 'Meta', note: 'Grátis · pode ficar sobrecarregado' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', provider: 'DeepSeek', note: 'Grátis · raciocínio avançado' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', provider: 'Google', note: 'Grátis · rápido e capaz' },
  { id: 'qwen/qwq-32b:free', label: 'QwQ 32B', provider: 'Alibaba', note: 'Grátis · raciocínio passo a passo' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', provider: 'Mistral', note: 'Grátis · leve e rápido' },
];

export const MODEL_KEY = 'openrouter-model';

interface CoachTabProps {
  deck: Deck;
  model: string;
  personaId: string;
  onKeyboardChange?: (open: boolean) => void;
  onOpenSearch?: (query: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const API_KEY_KEY = 'openrouter-api-key';
export const MESSAGES_PREFIX = 'coach-messages-';

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildSystemPrompt(deck: Deck, personaId: string): string {
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  const byCategory: Record<string, string[]> = {};
  for (const card of deck.cards) {
    if (!byCategory[card.category]) byCategory[card.category] = [];
    byCategory[card.category].push(card.quantity > 1 ? `${card.quantity}x ${card.name}` : card.name);
  }

  const allLines: string[] = [];
  for (const [cat, cards] of Object.entries(byCategory)) {
    allLines.push(`${cat} (${cards.length}):`);
    for (const c of cards) allLines.push(`  - ${c}`);
    allLines.push('');
  }
  // Keep system prompt under ~3000 chars to fit smaller free-model context windows
  let deckList = allLines.join('\n');
  if (deckList.length > 2800) {
    deckList = deckList.slice(0, 2800) + '\n  ... (lista truncada)';
  }

  const scopeIntro = `Você é o Tutor, um especialista em Magic: The Gathering, focado no formato Commander/EDH.

Você domina:
- Regras oficiais do Magic e interações complexas
- Estratégia e sinergias do formato Commander (100 cartas, uma cópia por carta, sem básicas)
- Staples e meta atual do Commander
- Curva de mana, ramp, compra de cartas, remoção, win conditions
- Análise de decks e sugestões de melhoria com foco em custo-benefício

Deck atual do usuário:
Nome: ${deck.name}
${
  deck.partnerName
    ? `Comandantes (dupla/partner): ${deck.commanderName} e ${deck.partnerName}`
    : `Comandante: ${deck.commanderName ?? 'Não definido'}`
}
Identidade de cores: ${(deck.colorIdentity ?? []).length > 0 ? deck.colorIdentity.join('') : 'Incolor'}
Total: ${totalCards} cartas

${deckList}`;

  return buildTutorSystemPrompt({
    personaId,
    customInstructions: getCustomInstructions(),
    scopeIntro,
    extraRules: '- Considere sempre a identidade de cores do comandante\n- Se o deck tiver menos de 100 cartas ou problemas óbvios, mencione',
  });
}

const personaArtCache = new Map<string, string | null>();

function PersonaAvatar({ persona }: { persona: Persona }) {
  const [artUrl, setArtUrl] = React.useState<string | null>(() =>
    persona.cardName ? personaArtCache.get(persona.cardName) ?? null : null
  );

  React.useEffect(() => {
    if (!persona.cardName || personaArtCache.has(persona.cardName)) return;
    let cancelled = false;
    resolveCardMentions([persona.cardName]).then((map) => {
      if (cancelled) return;
      const card = map.get(persona.cardName!);
      const url = card?.image_uris?.art_crop ?? card?.card_faces?.[0]?.image_uris?.art_crop ?? null;
      personaArtCache.set(persona.cardName!, url);
      setArtUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [persona.cardName]);

  const facePosition = persona.facePosition ?? '50% 50%';

  return (
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#0f0f0f',
        border: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {artUrl ? (
        <img
          src={artUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: facePosition,
            transform: `scale(${persona.faceZoom ?? 1})`,
            transformOrigin: facePosition,
          }}
        />
      ) : (
        <WizardHatIcon size={19} style={{ color: 'var(--accent)' }} />
      )}
    </div>
  );
}

export function PersonaPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {PERSONAS.map((p) => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color 0.1s, border-color 0.1s',
            }}
          >
            <PersonaAvatar persona={p} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                {p.name}
                {p.subtitle !== 'Padrão' && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {p.subtitle}</span>
                )}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{p.description}</p>
            </div>
            {active && <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}

export function ModelPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {MODELS.map((m) => {
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color 0.1s, border-color 0.1s',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                {m.label}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                {m.provider}
                {m.note ? ` · ${m.note}` : ''}
              </p>
            </div>
            {active && <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}

export function CustomInstructionsField() {
  const [value, setValue] = React.useState(() => getCustomInstructions());

  React.useEffect(() => {
    const t = setTimeout(() => setCustomInstructions(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, CUSTOM_INSTRUCTIONS_MAX_LEN))}
        placeholder="Ex.: seja mais sucinto, priorize cartas até R$30, mostre sempre 10 exemplos..."
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '10px 12px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          fontSize: '13px',
          lineHeight: 1.5,
          outline: 'none',
        }}
      />
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textAlign: 'right' }}>
        {value.length}/{CUSTOM_INSTRUCTIONS_MAX_LEN}
      </p>
    </div>
  );
}

export function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = React.useState('');

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: '24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Key size={28} style={{ color: 'var(--accent)' }} />
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Configurar Tutor IA
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Insira sua chave da API do OpenRouter. Ela fica salva apenas no seu dispositivo.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <Input
          placeholder="sk-or-v1-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSave(value.trim()); }}
          type="password"
          fullWidth
        />
        <Button variant="primary" size="md" fullWidth disabled={!value.trim()} onClick={() => onSave(value.trim())}>
          Ativar Tutor
        </Button>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          Crie sua chave em openrouter.ai/keys · Modelo configurável no menu ···
        </p>
      </motion.div>
    </div>
  );
}

function MessageBubble({
  msg,
  isStreaming,
  deck,
  onOpenSearch,
}: {
  msg: Message;
  isStreaming: boolean;
  deck: Deck;
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
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={13} style={{ color: 'var(--text-secondary)' }} />
        </div>

        <div
          style={{
            maxWidth: '82%',
            padding: '10px 12px',
            borderRadius: 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)',
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
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

  // Assistant replies render as plain text (no bubble surface), matching a
  // Claude-style chat layout — only the user's own messages get a bubble.
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
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
                  {cards.length > 0 && <CardMentionRow cards={cards} deck={deck} onOpenSearch={onOpenSearch} />}
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

const SUGGESTIONS = [
  'Quais são as maiores fraquezas do meu deck?',
  'Sugira melhorias para o ramp',
  'O meu deck está equilibrado para Commander?',
];

export function CoachTab({ deck, model, personaId, onKeyboardChange, onOpenSearch = () => {} }: CoachTabProps) {
  // When Supabase is configured, the Coach runs through our proxy (magic-link
  // login, no per-user API key). Otherwise, fall back to the legacy
  // bring-your-own-OpenRouter-key flow.
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(API_KEY_KEY) ?? '');
  const [messages, setMessages] = React.useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(`${MESSAGES_PREFIX}${deck.id}`);
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputBarRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef<HTMLDivElement>(null);
  // Keep a stable ref to the callback so the effect doesn't re-run on every render
  const onKeyboardChangeRef = React.useRef(onKeyboardChange);
  React.useEffect(() => { onKeyboardChangeRef.current = onKeyboardChange; }, [onKeyboardChange]);

  // On iOS Safari, pin the input bar to the top of the keyboard using position:fixed.
  // Fixed elements are positioned relative to the visual viewport on iOS, so bottom:0
  // naturally places the bar just above the keyboard as it slides up.
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let wasOpen = false;

    const reset = () => {
      const el = inputBarRef.current;
      if (el) {
        el.style.position = '';
        el.style.bottom = '';
        el.style.left = '';
        el.style.right = '';
        el.style.zIndex = '';
        el.style.backgroundColor = '';
      }
      if (messagesRef.current) messagesRef.current.style.paddingBottom = '';
    };

    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const isOpen = kh > 50;
      if (isOpen !== wasOpen) {
        wasOpen = isOpen;
        onKeyboardChangeRef.current?.(isOpen);
      }
      const el = inputBarRef.current;
      if (!el) return;
      if (isOpen) {
        el.style.position = 'fixed';
        el.style.bottom = '0px';
        el.style.left = '0px';
        el.style.right = '0px';
        el.style.zIndex = '200';
        el.style.backgroundColor = 'var(--bg-base)';
        if (messagesRef.current) {
          messagesRef.current.style.paddingBottom = `${el.offsetHeight}px`;
        }
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        reset();
      }
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      reset();
      onKeyboardChangeRef.current?.(false);
    };
  }, []);

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);
  const canSend = input.trim().length > 0 && !isLoading;

  React.useEffect(() => {
    // Persisting the whole history per streamed token janks the main thread;
    // save only when no stream is running (i.e., once per completed reply)
    if (streamingId) return;
    localStorage.setItem(`${MESSAGES_PREFIX}${deck.id}`, JSON.stringify(messages));
  }, [messages, deck.id, streamingId]);

  const lastScrollRef = React.useRef(0);
  React.useEffect(() => {
    const streaming = streamingId !== null;
    const now = Date.now();
    if (streaming && now - lastScrollRef.current < 400) return; // throttle during stream
    lastScrollRef.current = now;
    bottomRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' });
  }, [messages, streamingId]);

  // Cancel any in-flight stream when leaving the Coach
  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abortRef.current?.abort(), []);

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
        { role: 'system', content: buildSystemPrompt(deck, personaId) },
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
                ? 'Sessão expirada — saia e entre novamente no menu ···.'
                : 'Chave de API inválida. Verifique no menu ···.';
            } else if (res.status === 404) {
              friendly = 'Modelo indisponível. Escolha outro no menu ···.';
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

        // Accumulate into lineBuffer so lines split across chunks are handled correctly
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

            // Reasoning models (DeepSeek R1, QwQ) emit reasoning_content before content
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
      if (controller.signal.aborted) return; // unmounted/navigated away
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === aId ? { ...m, content: msg } : m))
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setStreamingId(null);
      }
    }
  }

  if (supabaseConfigured) {
    if (sessionLoading) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
            <Loader2 size={28} style={{ color: 'var(--accent)' }} />
          </motion.div>
        </div>
      );
    }
    if (!session) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <AuthGate />
        </div>
      );
    }
  } else if (!apiKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ApiKeySetup onSave={(key) => { localStorage.setItem(API_KEY_KEY, key); setApiKey(key); }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        ref={messagesRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0 8px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WizardHatIcon size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Tutor IA pronto</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Pergunte sobre cartas, sinergias, curva de mana ou como melhorar seu deck.
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
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={msg.id === streamingId}
            deck={deck}
            onOpenSearch={onOpenSearch}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div ref={inputBarRef} style={{ padding: '10px 16px 16px' }}>
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
            placeholder="Pergunte sobre seu deck..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              minWidth: 0,
              cursor: isLoading ? 'not-allowed' : 'text',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: canSend ? 'var(--accent)' : 'var(--surface-2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background-color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ArrowUp size={18} color={canSend ? '#0f0f0f' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>
    </div>
  );
}
