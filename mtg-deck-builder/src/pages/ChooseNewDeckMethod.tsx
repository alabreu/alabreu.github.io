import React from 'react';
import { ArrowLeft, Crown, FileInput, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WizardHatIcon } from '../design-system/components/WizardHatIcon';
import { ImportDeckSheet } from '../features/deck-builder/ImportDeckSheet';
import { CONTENT_MAX_WIDTH } from '../design-system/responsive';

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function OptionCard({ icon, title, description, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        padding: '16px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>
          {title}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{description}</p>
      </div>
      <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}

export default function ChooseNewDeckMethod() {
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = React.useState(false);

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
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: CONTENT_MAX_WIDTH,
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '4px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Novo deck
          </h1>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>Como você quer começar?</p>

        <OptionCard
          icon={<Crown size={20} />}
          title="Já sei o comandante"
          description="Escolha o nome do deck e busque o comandante direto"
          onClick={() => navigate('/new-deck/manual')}
        />
        <OptionCard
          icon={<WizardHatIcon size={20} />}
          title="Pedir ajuda ao Tutor"
          description="Descreva o tema ou mecânica que você quer e receba sugestões de comandante"
          onClick={() => navigate('/new-deck/tutor')}
        />
        <OptionCard
          icon={<FileInput size={20} />}
          title="Importar lista"
          description="Cole uma lista de cartas de um deck que você já tem"
          onClick={() => setImportOpen(true)}
        />
      </div>

      <ImportDeckSheet isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
