import React from 'react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { useT } from '../../lib/i18n';
import { getGroupMode, setGroupMode, GroupMode } from '../../lib/deckSettings';
import { ensureFunctionTagsLoaded } from '../../lib/functionTags';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const t = useT();
  const [mode, setMode] = React.useState<GroupMode>(() => getGroupMode());

  React.useEffect(() => {
    if (isOpen) setMode(getGroupMode());
  }, [isOpen]);

  function pick(next: GroupMode) {
    setMode(next);
    setGroupMode(next);
    // Warm the (lazy) function-tag snapshot now, so it's ready before the user
    // adds their next card.
    if (next === 'function') ensureFunctionTagsLoaded();
  }

  const options: { value: GroupMode; label: string }[] = [
    { value: 'off', label: t('settings.groupOff') },
    { value: 'type', label: t('settings.groupType') },
    { value: 'function', label: t('settings.groupFunction') },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          {t('settings.autoGroup')}
        </p>

        {/* Segmented control */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {options.map((opt, i) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => pick(opt.value)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border-default)' : 'none',
                  backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.5 }}>
          {mode === 'off' && t('settings.groupOffDesc')}
          {mode === 'type' && t('settings.groupTypeDesc')}
          {mode === 'function' && t('settings.groupFunctionDesc')}
        </p>
      </div>
    </BottomSheet>
  );
}
