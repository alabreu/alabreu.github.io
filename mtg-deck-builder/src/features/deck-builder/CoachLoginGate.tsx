import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Sparkles } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { supabase } from '../../lib/supabase';

export function CoachLoginGate() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSend() {
    if (!email.trim() || !supabase) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    });
    setSending(false);
    if (err) {
      setError('Não foi possível enviar o link. Tente novamente.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <Mail size={32} style={{ color: 'var(--accent)' }} />
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Verifique seu e-mail
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Enviamos um link de acesso para <strong>{email}</strong>. Toque nele para entrar e liberar o Coach.
        </p>
        <button
          onClick={() => setSent(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

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
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
      </motion.div>

      <div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Entrar no Coach
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Sem senha, sem configurar chave de API. Só seu e-mail.
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Input
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) handleSend(); }}
          type="email"
          fullWidth
        />
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!email.trim() || sending}
          isLoading={sending}
          onClick={handleSend}
        >
          Enviar link de acesso
        </Button>
        {error && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}
