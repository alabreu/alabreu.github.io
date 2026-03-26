import React from 'react';
import { motion } from 'framer-motion';
import { Send, Lock, Bot, User } from 'lucide-react';
import { Deck } from '../../types';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';

interface CoachTabProps {
  deck: Deck;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const PLACEHOLDER_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Quais cartas devo adicionar para melhorar meu ramp?',
    timestamp: Date.now() - 120000,
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'Para melhorar o ramp do seu deck Commander, recomendo considerar cartas como Sol Ring, Arcane Signet, e Cultivate. Dependendo das cores do seu comandante, há opções ainda mais poderosas disponíveis.\n\nVocê também deve considerar ter pelo menos 10 fontes de ramp no seu deck para garantir uma curva de mana consistente.',
    timestamp: Date.now() - 115000,
  },
  {
    id: '3',
    role: 'user',
    content: 'Como devo balancear remoção e proteção?',
    timestamp: Date.now() - 60000,
  },
  {
    id: '4',
    role: 'assistant',
    content:
      'A regra geral para Commander é ter pelo menos 10 remoções e 5-7 proteções para seu comandante. Um bom equilíbrio seria:\n\n• 7-8 remoções de criaturas\n• 2-3 remoções de encantamentos/artefatos\n• 2-3 proteções (counter, hexproof, indestructible)\n\nAjuste conforme o seu grupo de jogo e o estilo do seu deck.',
    timestamp: Date.now() - 55000,
  },
];

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function CoachTab({ deck }: CoachTabProps) {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* "Coming soon" overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          backgroundColor: 'rgba(15, 15, 15, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '32px',
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
          <Lock size={28} style={{ color: 'var(--accent)' }} />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            Coach IA — Em breve
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
            Em breve você poderá pedir sugestões de cartas, análise de curva de mana e dicas para
            otimizar seu deck Commander.
          </p>
        </motion.div>
      </div>

      {/* Messages list (blurred background content) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Deck context header */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bot size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Analisando: <strong style={{ color: 'var(--text-secondary)' }}>{deck.name}</strong>
            {' — '}
            {totalCards} cartas
          </span>
        </div>

        {PLACEHOLDER_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor:
                  msg.role === 'user' ? 'var(--surface-3)' : 'var(--accent-subtle)',
                border: `1px solid ${msg.role === 'user' ? 'var(--border-default)' : 'var(--accent-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {msg.role === 'user' ? (
                <User size={14} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <Bot size={14} style={{ color: 'var(--accent)' }} />
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 12px',
                borderRadius:
                  msg.role === 'user'
                    ? 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)'
                    : 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                backgroundColor:
                  msg.role === 'user' ? 'var(--surface-3)' : 'var(--surface-2)',
                border: `1px solid ${msg.role === 'user' ? 'var(--border-default)' : 'var(--border-subtle)'}`,
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {msg.content}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
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
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled
            size="md"
          />
        </div>
        <Button variant="primary" size="md" disabled leftIcon={<Send size={14} />}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
