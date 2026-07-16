import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';

type FeedbackType = 'bug' | 'feature';

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackSheet({ isOpen, onClose }: FeedbackSheetProps) {
  const { session } = useSupabaseSession();
  const [type, setType] = React.useState<FeedbackType>('bug');
  const [message, setMessage] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); }, []);

  function handleClose() {
    onClose();
    // Delay the state reset until the close animation finishes; track the timer
    // so it's cleared if the sheet unmounts first (avoids a state update on an
    // unmounted component).
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setType('bug');
      setMessage('');
      setContactEmail('');
      setError(null);
      setSent(false);
    }, 350);
  }

  async function handleSubmit() {
    if (!supabase || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.from('feedback').insert({
      type,
      // Clamp to the DB size limits (migration 0005) so a legit long report
      // fails gracefully client-side instead of hitting a constraint error.
      message: message.trim().slice(0, 4000),
      contact_email: (contactEmail.trim() || session?.user.email || '').slice(0, 320) || null,
      user_id: session?.user.id ?? null,
      page_context: (window.location.hash || window.location.pathname).slice(0, 500),
      source: 'in_app',
    });
    setSending(false);
    if (err) {
      console.error('[FeedbackSheet] insert failed:', err.message);
      setError('Não foi possível enviar agora. Tente novamente em alguns segundos.');
      return;
    }
    setSent(true);
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Feedback">
      {sent ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '32px 24px 40px',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Obrigado!
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            Recebemos seu {type === 'bug' ? 'relato' : 'sugestão'}.
          </p>
        </div>
      ) : (
        <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Achou um bug ou tem uma ideia pro app? Manda pra gente.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['bug', 'feature'] as const).map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
                  }}
                >
                  {t === 'bug' ? 'Reportar bug' : 'Sugerir feature'}
                </button>
              );
            })}
          </div>

          <textarea
            placeholder={
              type === 'bug'
                ? 'O que aconteceu? Quanto mais detalhe, melhor (o que você esperava, o que aconteceu de fato)...'
                : 'Qual sua ideia?'
            }
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              minHeight: '120px',
              resize: 'vertical',
              fontFamily: 'inherit',
              fontSize: '15px',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />

          {!session && (
            <Input
              placeholder="Seu e-mail (opcional, pra te responder)"
              value={contactEmail}
              maxLength={320}
              onChange={(e) => setContactEmail(e.target.value)}
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              fullWidth
            />
          )}

          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!message.trim() || sending}
            isLoading={sending}
            onClick={handleSubmit}
          >
            Enviar
          </Button>
          {error && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{error}</p>}
        </div>
      )}
    </BottomSheet>
  );
}
