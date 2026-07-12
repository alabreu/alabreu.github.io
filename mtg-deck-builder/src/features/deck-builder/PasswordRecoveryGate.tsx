import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Check } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { supabase } from '../../lib/supabase';

interface PasswordRecoveryGateProps {
  onDone: () => void;
}

/**
 * Full-screen gate shown after the user follows a "reset password" email
 * link. Supabase signs them into a temporary recovery session but doesn't
 * itself prompt for a new password — without this screen, they'd just land
 * on whatever page the link redirected to, with no way to actually finish
 * resetting their password.
 */
export function PasswordRecoveryGate({ onDone }: PasswordRecoveryGateProps) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit() {
    if (!supabase || !password || sending) return;
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSending(false);
    if (err) {
      setError('Não foi possível salvar a nova senha. Tente novamente.');
      return;
    }
    setDone(true);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: '16px',
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
        {done ? <Check size={28} style={{ color: 'var(--accent)' }} /> : <KeyRound size={28} style={{ color: 'var(--accent)' }} />}
      </motion.div>

      {done ? (
        <>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Senha redefinida!
          </p>
          <Button variant="primary" size="md" onClick={onDone}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Defina uma nova senha
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Escolha uma nova senha para sua conta.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Input
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              fullWidth
            />
            <Input
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && password && confirmPassword) handleSubmit(); }}
              type="password"
              autoComplete="new-password"
              fullWidth
            />
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!password || !confirmPassword || sending}
              isLoading={sending}
              onClick={handleSubmit}
            >
              Salvar nova senha
            </Button>
            {error && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
