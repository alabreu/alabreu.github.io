import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { useT } from '../../lib/i18n';
import { getGroupMode, setGroupMode, GroupMode } from '../../lib/deckSettings';
import { ensureFunctionTagsLoaded } from '../../lib/functionTags';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const t = useT();
  const { session } = useSupabaseSession();
  const [mode, setMode] = React.useState<GroupMode>(() => getGroupMode());
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(getGroupMode());
      setConfirmingDelete(false);
      setDeleteError(null);
    }
  }, [isOpen]);

  async function handleDeleteAccount() {
    if (!supabase || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleting(false);
      setDeleteError(t('settings.deleteAccountError'));
      return;
    }
    // Account gone — end the local session and close.
    await supabase.auth.signOut();
    setDeleting(false);
    onClose();
  }

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

        {/* Account — delete account (LGPD). Only for logged-in users. */}
        {supabaseConfigured && session && (
          <div style={{ marginTop: '10px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {t('settings.account')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              {t('settings.deleteAccountDesc')}
            </p>

            {!confirmingDelete ? (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<Trash2 size={15} />}
                onClick={() => { setDeleteError(null); setConfirmingDelete(true); }}
                style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
              >
                {t('settings.deleteAccount')}
              </Button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: 'var(--error)', margin: 0, fontWeight: 600 }}>
                  {t('settings.deleteAccountConfirm')}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="md" style={{ flex: 1 }} disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    style={{ flex: 1 }}
                    disabled={deleting}
                    leftIcon={deleting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? t('settings.deleting') : t('settings.deleteAccountBtn')}
                  </Button>
                </div>
                {deleteError && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>{deleteError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
