import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CONTENT_MAX_WIDTH } from '../../design-system/responsive';

/** Shared chrome for the static legal pages (Terms, Privacy): a sticky header
 *  with a back button and a readable, centered content column. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'calc(env(safe-area-inset-top) + 16px) 16px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto' }}>
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Voltar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', padding: '18px 20px 48px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px' }}>Última atualização: {updated}</p>
        {children}
      </main>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '22px 0 8px' }}>{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 10px' }}>{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: '0 0 10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</ul>;
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</li>;
}
