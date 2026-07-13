import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mail } from 'lucide-react';
import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { GoogleIcon } from '../../design-system/components/GoogleIcon';
import { supabase } from '../../lib/supabase';

type Mode = 'signin' | 'signup';

function translateAuthError(err: AuthError): string {
  // Supabase's client only wraps 500-range responses in a generic
  // "retryable" error without reading the body, so err.message is
  // useless here (often literally "{}") — this is almost always a
  // transient backend/e-mail-delivery hiccup, not something the user did.
  if (isAuthRetryableFetchError(err)) {
    return 'Erro temporário no servidor. Tente novamente em alguns segundos.';
  }
  const m = err.message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Esse e-mail já tem conta — tente entrar em vez de criar uma nova.';
  }
  if (m.includes('password should be at least') || m.includes('should contain at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (m.includes('pwned') || m.includes('easy to guess') || m.includes('weak')) {
    return 'Essa senha é muito comum/fácil de adivinhar. Escolha outra.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'E-mail inválido.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
  if (m.includes('error sending') || m.includes('confirmation email')) {
    return 'Não conseguimos enviar o e-mail agora. Tente novamente em alguns minutos.';
  }
  if (m.includes('security purposes') || m.includes('rate limit') || m.includes('too many requests')) {
    return 'Muitas tentativas seguidas — aguarde um minuto e tente de novo.';
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'Cadastro de novas contas está temporariamente indisponível.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Falha de conexão. Verifique sua internet e tente de novo.';
  }
  return 'Algo deu errado. Tente novamente.';
}

export function AuthGate() {
  const [mode, setMode] = React.useState<Mode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmSent, setConfirmSent] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmPassword('');
  }

  async function handleSubmit() {
    if (!supabase || !email.trim() || !password || sending) return;

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
    }

    setSending(true);
    setError(null);

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setSending(false);
      if (err) {
        console.error('[AuthGate] signIn failed:', err.status, err.message);
        setError(translateAuthError(err));
      }
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
    setSending(false);
    if (err) {
      console.error('[AuthGate] signUp failed:', err.status, err.message);
      setError(translateAuthError(err));
      return;
    }
    // If email confirmation is required in the Supabase project settings,
    // signUp() succeeds but returns no active session yet.
    if (!data.session) setConfirmSent(true);
  }

  async function handleGoogleSignIn() {
    if (!supabase || sending) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
    if (err) {
      console.error('[AuthGate] Google OAuth failed:', err.status, err.message);
      setError(translateAuthError(err));
    }
    // On success the browser navigates away to Google immediately — nothing more to do here.
  }

  async function handleForgotPassword() {
    if (!supabase || sending) return;
    if (!email.trim()) {
      setError('Digite seu e-mail primeiro.');
      return;
    }
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    setSending(false);
    if (err) {
      console.error('[AuthGate] resetPasswordForEmail failed:', err.status, err.message);
      setError(translateAuthError(err));
      return;
    }
    setResetSent(true);
  }

  if (confirmSent) {
    return (
      <div style={centeredStyle}>
        <Mail size={32} style={{ color: 'var(--accent)' }} />
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Confirme seu e-mail
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Enviamos um link de confirmação para <strong>{email}</strong>. Toque nele para ativar sua conta.
        </p>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div style={centeredStyle}>
        <Mail size={32} style={{ color: 'var(--accent)' }} />
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Verifique seu e-mail
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Enviamos um link para redefinir sua senha para <strong>{email}</strong>.
        </p>
        <button onClick={() => setResetSent(false)} style={linkButtonStyle}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div style={centeredStyle}>
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
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Sincroniza seus decks entre dispositivos e libera o Tutor.
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button
          variant="white"
          size="md"
          fullWidth
          leftIcon={<GoogleIcon size={18} />}
          disabled={sending}
          onClick={handleGoogleSignIn}
        >
          Continuar com Google
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ou</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Input
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          fullWidth
        />
        <Input
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (mode === 'signup') return; // let focus move to "confirmar senha" instead
            if (email.trim() && password) handleSubmit();
          }}
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          fullWidth
        />
        {mode === 'signup' && (
          <Input
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && email.trim() && password && confirmPassword) handleSubmit(); }}
            type="password"
            autoComplete="new-password"
            fullWidth
          />
        )}
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!email.trim() || !password || (mode === 'signup' && !confirmPassword) || sending}
          isLoading={sending}
          onClick={handleSubmit}
        >
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </Button>
        {error && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            style={linkButtonStyle}
          >
            {mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}
          </button>
          {mode === 'signin' && (
            <button onClick={handleForgotPassword} style={linkButtonStyle}>
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 24px',
  gap: '16px',
  textAlign: 'center',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  WebkitTapHighlightColor: 'transparent',
  padding: 0,
};
