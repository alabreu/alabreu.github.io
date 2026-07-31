import type { Icon } from '@phosphor-icons/react'
import {
  CaretRight,
  ChatCircleDots,
  Megaphone,
  SignIn,
  Translate,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { getUnreadCount } from '@core/changelog'
import type { MessageKey } from '@core/i18n'
import { VersionLabel } from '@ui/components/VersionLabel'
import { useAuth } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'

interface MenuSheetProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  icon: Icon
  labelKey: MessageKey
  to: string
}

// Adicione aqui os itens específicos do seu app (configurações, importar, etc.).
const ITEMS: MenuItem[] = [
  { icon: ChatCircleDots, labelKey: 'menu.feedback', to: '/feedback' },
  { icon: Translate, labelKey: 'menu.language', to: '/idioma' },
  { icon: Megaphone, labelKey: 'menu.news', to: '/novidades' },
  { icon: SignIn, labelKey: 'menu.login', to: '/login' },
]

/**
 * Bottom sheet aberto pelo botão do topo direito. Lista as ações de nível de
 * app (feedback, idioma, novidades, login) + a versão para debug. O item de
 * novidades ganha um contador quando há entradas de changelog não lidas.
 */
export function MenuSheet({ open, onClose }: MenuSheetProps) {
  const navigate = useNavigate()
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const newsUnread = getUnreadCount()

  function go(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-surface p-4 pb-8 shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />

        <nav className="flex flex-col">
          {ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => go(item.to)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-ink/5"
            >
              <item.icon size={22} />
              <span className="min-w-0 truncate font-medium">
                {item.to === '/login' && user
                  ? (user.name ?? user.email)
                  : t(item.labelKey)}
              </span>
              {item.to === '/idioma' ? (
                <span className="ml-auto text-xs font-semibold uppercase text-muted">
                  {locale}
                </span>
              ) : item.to === '/novidades' && newsUnread > 0 ? (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                  {newsUnread}
                </span>
              ) : (
                <CaretRight size={18} className="ml-auto text-muted" />
              )}
            </button>
          ))}
        </nav>

        <VersionLabel className="mt-4 block w-full select-none text-center text-[11px] text-muted/70" />
      </div>
    </div>
  )
}
