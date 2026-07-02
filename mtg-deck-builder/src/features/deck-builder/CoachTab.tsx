import React from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Key, Trash2, ChevronDown, Check } from 'lucide-react';
import { Deck } from '../../types';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { BottomSheet } from '../../design-system/components/BottomSheet';

interface CoachTabProps {
  deck: Deck;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ModelOption {
  id: string;
  label: string;
  provider: string;
  note?: string;
}

const MODELS: ModelOption[] = [
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash', provider: 'Google', note: 'Rápido e capaz' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', provider: 'Meta', note: 'Muito capaz' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', provider: 'DeepSeek', note: 'Raciocínio avançado' },
  { id: 'qwen/qwq-32b:free', label: 'QwQ 32B', provider: 'Alibaba', note: 'Raciocínio passo a passo' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', provider: 'Mistral', note: 'Leve e rápido' },
];

const API_KEY_KEY = 'openrouter-api-key';
const MODEL_KEY = 'openrouter-model';
const MESSAGES_PREFIX = 'coach-messages-';

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

// --- Model picker ---
function ModelPicker({
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
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
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

// --- API key + model setup ---
function ApiKeySetup({
  model,
  onModelChange,
  onSave,
}: {
  model: string;
  onModelChange: (id: string) => void;
  onSave: (key: string) => void;
}) {
  const [value, setValue] = React.useState('');

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
        gap: '24px',
      }}
    >
      {/* Icon + title */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
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
        >
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Configurar Coach IA
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            Insira sua chave da API do OpenRouter. Ela fica salva apenas no seu dispositivo.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
          API Key
        </p>
        <Input
          placeholder="sk-or-v1-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onSave(value.trim());
          }}
          type="password"
          fullWidth
        />
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          Crie sua chave em openrouter.ai/keys
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.16 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
          Modelo — todos gratuitos
        </p>
        <ModelPicker selected={model} onChange={onModelChange} />
      </motion.div>

      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!value.trim()}
          onClick={() => onSave(value.trim())}
        >
          Ativar Coach
        </Button>
      </motion.div>
    </div>
  );
}

// --- Typing dots ---
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

// --- Message bubble ---
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
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
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

// --- Main component ---
export function CoachTab({ deck }: CoachTabProps) {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(API_KEY_KEY) ?? '');
  const [model, setModel] = React.useState(() => localStorage.getItem(MODEL_KEY) ?? MODELS[0].id);
  const [messages, setMessages] = React.useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(`${MESSAGES_PREFIX}${deck.id}`);
      return raw ? (JSON.parse(raw) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const [modelSheetOpen, setModelSheetOpen] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);
  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  React.useEffect(() => {
    localStorage.setItem(`${MESSAGES_PREFIX}${deck.id}`, JSON.stringify(messages));
  }, [messages, deck.id]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function saveApiKey(key: string) {
    localStorage.setItem(API_KEY_KEY, key);
    setApiKey(key);
  }

  function changeModel(id: string) {
    localStorage.setItem(MODEL_KEY, id);
    setModel(id);
    setModelSheetOpen(false);
  }

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
        throw new Error(`${res.status} — ${await res.text()}`);
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
        prev.map((m) =>
          m.id === aId ? { ...m, content: `Erro ao conectar com a API:\n${msg}\n\nVerifique sua chave e tente novamente.` } : m
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }

  if (!apiKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ApiKeySetup model={model} onModelChange={changeModel} onSave={saveApiKey} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Context + model chip */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bot size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontSize: '12px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ color: 'var(--text-secondary)' }}>{deck.name}</strong>
            {deck.commanderName ? ` · ${deck.commanderName}` : ''}
            {` · ${totalCards} cartas`}
          </span>

          {/* Model selector button */}
          <button
            onClick={() => setModelSheetOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 7px',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: '999px',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'inherit',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {currentModel.label}
            <ChevronDown size={11} />
          </button>

          {/* Clear history */}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
              title="Limpar conversa"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Empty state */}
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '32px 0 8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Coach IA pronto
              </p>
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
                    padding: '10px 14px',
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
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
      <div
        style={{
          padding: '10px 16px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Pergunte sobre seu deck..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={isLoading}
            size="md"
            fullWidth
          />
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          leftIcon={<Send size={14} />}
        >
          Enviar
        </Button>
      </div>

      {/* Model picker bottom sheet */}
      <BottomSheet isOpen={modelSheetOpen} onClose={() => setModelSheetOpen(false)} title="Escolher modelo">
        <div style={{ padding: '8px 20px 32px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Todos os modelos abaixo são gratuitos via OpenRouter.
          </p>
          <ModelPicker selected={model} onChange={changeModel} />
        </div>
      </BottomSheet>
    </div>
  );
}
