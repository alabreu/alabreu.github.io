import { APP_NAME } from '@core/config'

/** Rótulo sutil com a versão do app, para debug (rodapé do menu). */
export function VersionLabel({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        'mx-auto block w-full select-none text-center text-[11px] text-muted/70'
      }
    >
      {APP_NAME} · v{__APP_VERSION__}
    </span>
  )
}
