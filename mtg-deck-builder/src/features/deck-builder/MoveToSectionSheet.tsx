import React from 'react';
import { Plus, FolderInput, Check } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Existing destination sections (already excludes "Comandante"). */
  sections: string[];
  /** How many cards are selected — shown in the header. */
  count: number;
  /** Move the selected cards to this section. The name may be a brand-new
   *  section the user just typed; the caller creates it if needed. */
  onPick: (category: string) => void;
}

/** Picks (or creates) a destination section for the cards currently selected
 *  in the decklist. "Criar seção" sits at the top, above a divider, then the
 *  existing sections follow. */
export function MoveToSectionSheet({ isOpen, onClose, sections, count, onPick }: Props) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setCreating(false);
      setNewName('');
    }
  }, [isOpen]);

  const trimmed = newName.trim();
  const canCreate = trimmed.length > 0 && !sections.includes(trimmed);

  function handleCreate() {
    if (!canCreate) return;
    onPick(trimmed);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover ${count} carta${count !== 1 ? 's' : ''} para…`}
      maxHeight="80dvh"
    >
      <div style={{ padding: '8px 0 24px' }}>
        {/* Create a new section */}
        {creating ? (
          <div style={{ display: 'flex', gap: '8px', padding: '4px 20px 8px' }}>
            <Input
              autoFocus
              placeholder="Nome da nova seção…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              fullWidth
            />
            <Button variant="primary" size="md" onClick={handleCreate} disabled={!canCreate}>
              <Check size={15} />
            </Button>
          </div>
        ) : (
          <SectionRow
            icon={<Plus size={17} />}
            label="Criar seção"
            accent
            onClick={() => setCreating(true)}
          />
        )}

        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '8px 20px' }} />

        {/* Existing sections */}
        {sections.length === 0 ? (
          <p style={{ padding: '4px 20px', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Nenhuma outra seção ainda. Crie uma acima.
          </p>
        ) : (
          sections.map((name) => (
            <SectionRow key={name} icon={<FolderInput size={17} />} label={name} onClick={() => onPick(name)} />
          ))
        )}
      </div>
    </BottomSheet>
  );
}

function SectionRow({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '13px 20px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span
        style={{
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: accent ? 'var(--accent-subtle)' : 'var(--surface-1)',
          border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border-default)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: accent ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
    </button>
  );
}
