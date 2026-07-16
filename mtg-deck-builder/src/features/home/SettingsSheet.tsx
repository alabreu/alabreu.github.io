import React from 'react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { useT } from '../../lib/i18n';
import { getAutoGroupEnabled, setAutoGroupEnabled } from '../../lib/deckSettings';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** iOS-style toggle switch. */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: '46px',
        height: '28px',
        flexShrink: 0,
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        backgroundColor: checked ? 'var(--accent)' : 'var(--surface-3)',
        transition: 'background-color 0.18s',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.18s',
        }}
      />
    </button>
  );
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const t = useT();
  const [autoGroup, setAutoGroup] = React.useState(() => getAutoGroupEnabled());

  // Re-read on each open in case another surface changed it.
  React.useEffect(() => {
    if (isOpen) setAutoGroup(getAutoGroupEnabled());
  }, [isOpen]);

  function toggleAutoGroup(v: boolean) {
    setAutoGroup(v);
    setAutoGroupEnabled(v);
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <div style={{ padding: '8px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              {t('settings.autoGroup')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {t('settings.autoGroupDesc')}
            </p>
          </div>
          <Switch checked={autoGroup} onChange={toggleAutoGroup} label={t('settings.autoGroup')} />
        </div>
      </div>
    </BottomSheet>
  );
}
