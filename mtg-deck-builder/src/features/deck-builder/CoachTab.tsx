import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Bot, User, Key, Check } from 'lucide-react';
import { Deck } from '../../types';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  note?: string;
}

export const MODELS: ModelOption[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', provider: 'Meta', note: 'Muito capaz' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', provider: 'DeepSeek', note: 'Raciocínio avançado' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', provider: 'Google', note: 'Rápido e capaz' },
  { id: 'qwen/qwq-32b:free', label: 'QwQ 32B', provider: 'Alibaba', note: 'Raciocínio passo a passo' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', provider: 'Mistral', note: 'Leve e rápido' },
];

export const MODEL_KEY = 'openrouter-model';

interface CoachTabProps {
  deck: Deck;
  model: string;
  onKeyboardChange?: (open: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const API_KEY_KEY = 'openrouter-api-key';
export const MESSAGES_PREFIX = 'coach-messages-';

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildSystemPrompt(deck: Deck): string {
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  const byCategory: Record<string, string[]> = {};
  for (const card of deck.cards) {
    if (!byCategory[card.category]) byCategory[card.category] = [];
    byCategory[card.category].push(card.quantity > 1 ? `${card.quantity}x ${card.name}` : card.name);
  }

  const deckList = Object.entries(byCategory)
    .map(([cat, cards]) => `${cat} (${cards.length}):\n${cards.map((c) => `  - ${c}`).join('\n')}`)
    .join('\n\n');

  return `Você é um Coach especialista em Magic: The Gathering, focado no formato Commander/EDH.

Você domina:
- Regras oficiais do Magic e interações complexas
- Estratégia e sinergias do formato Commander (100 cartas, uma cópia por carta, sem básicas)
- Staples e meta atual do Commander
- Curva de mana, ramp, compra de cartas, remoção, win conditions
- Análise de decks e sugestões de melhoria com foco em custo-benefício

Deck atual do usuário:
Nome: ${deck.name}
Comandante: ${deck.commanderName ?? 'Não definido'}
Identidade de cores: ${deck.colorIdentity.length > 0 ? deck.colorIdentity.join('') : 'Incolor'}
Total: ${totalCards} cartas

${deckList}

Regras de resposta:
- Sempre em português brasileiro
- Seja direto e objetivo; use bullet points para listas
- Ao sugerir cartas, explique brevemente a sinergia e indique se há alternativas budget
- Considere sempre a identidade de cores do comandante
- Se o deck tiver menos de 100 cartas ou problemas óbvios, mencione`;
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
                {' · '}
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Grátis</span>
              </p>
            </div>
            {active && <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}

function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
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
          Configurar Coach IA
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
          Ativar Coach
        </Button>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          Crie sua chave em openrouter.ai/keys · Modelo configurável no menu ···
        </p>
      </motion.div>
    </div>
  );
}

function TypingDots() {
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

function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: isUser ? 'var(--surface-3)' : 'var(--accent-subtle)',
          border: `1px solid ${isUser ? 'var(--border-default)' : 'var(--accent-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isUser ? <User size={13} style={{ color: 'var(--text-secondary)' }} /> : <Bot size={13} style={{ color: 'var(--accent)' }} />}
      </div>

      <div
        style={{
          maxWidth: '82%',
          padding: '10px 12px',
          borderRadius: isUser
            ? 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)'
            : 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
          backgroundColor: isUser ? 'var(--surface-3)' : 'var(--surface-2)',
          border: `1px solid ${isUser ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        }}
      >
        {isStreaming && !msg.content ? (
          <TypingDots />
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
            {msg.content}
            {isStreaming && <span style={{ opacity: 0.4 }}>▍</span>}
          </p>
        )}
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0', textAlign: isUser ? 'right' : 'left' }}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Quais são as maiores fraquezas do meu deck?',
  'Sugira melhorias para o ramp',
  'O meu deck está equilibrado para Commander?',
];

export function CoachTab({ deck, model, onKeyboardChange }: CoachTabProps) {
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
    localStorage.setItem(`${MESSAGES_PREFIX}${deck.id}`, JSON.stringify(messages));
  }, [messages, deck.id]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading || !apiKey) return;

    const userMsg: Message = { id: genId(), role: 'user', content: content.trim(), timestamp: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    const aId = genId();
    setMessages([...history, { id: aId, role: 'assistant', content: '', timestamp: Date.now() }]);
    setStreamingId(aId);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MTG Deck Builder Coach',
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: buildSystemPrompt(deck) },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        let friendly: string;
        try {
          const json = await res.json();
          const raw: string = json?.error?.metadata?.raw ?? '';
          if (res.status === 429) {
            const seconds = raw.match(/"Retry-After":"(\d+)"/)?.[1];
            friendly = `Modelo sobrecarregado — aguarde${seconds ? ` ${seconds}s` : ' alguns segundos'} e tente novamente.`;
          } else if (res.status === 401 || res.status === 403) {
            friendly = 'Chave de API inválida. Verifique no menu ···.';
          } else if (res.status === 404) {
            friendly = 'Modelo indisponível. Escolha outro no menu ···.';
          } else {
            friendly = json?.error?.message ?? `Erro ${res.status}`;
          }
        } catch {
          friendly = `Erro ${res.status}`;
        }
        throw new Error(friendly);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break outer;
          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages((prev) => prev.map((m) => (m.id === aId ? { ...m, content: accumulated } : m)));
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === aId ? { ...m, content: msg } : m))
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }

  if (!apiKey) {
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
              <Bot size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Coach IA pronto</p>
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
          <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingId} />
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
