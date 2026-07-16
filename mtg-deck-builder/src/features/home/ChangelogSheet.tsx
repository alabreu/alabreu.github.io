import { BottomSheet } from '../../design-system/components/BottomSheet';
import { useLanguage, useT } from '../../lib/i18n';
import { CHANGELOG, entryText } from '../../lib/changelog';

interface ChangelogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Number of top (newest) entries to flag with a "new" badge — captured when
   *  the sheet opened, before the entries were marked as seen. */
  newCount: number;
}

function formatDate(iso: string, lang: 'pt' | 'en'): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ChangelogSheet({ isOpen, onClose, newCount }: ChangelogSheetProps) {
  const { lang } = useLanguage();
  const t = useT();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('home.changelogTitle')} maxHeight="88dvh">
      <div style={{ padding: '4px 20px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {CHANGELOG.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('home.changelogEmpty')}</p>
        )}
        {CHANGELOG.map((entry, i) => {
          const { title, items } = entryText(entry, lang);
          const isNew = i < newCount;
          return (
            <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                {isNew && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--accent)',
                      backgroundColor: 'var(--accent-subtle)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 7px',
                    }}
                  >
                    {t('home.changelogNewBadge')}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(entry.date, lang)}</span>
              <ul style={{ margin: '2px 0 0', paddingLeft: '18px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {items.map((it, j) => (
                  <li key={j} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
