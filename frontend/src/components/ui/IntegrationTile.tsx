import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type IntegrationTileProps = {
  name: string
  connected: boolean
  detail: string
  icon: LucideIcon
  iconBg: string
  manageHref?: string
}

export const IntegrationTile = ({
  name,
  connected,
  detail,
  icon: Icon,
  iconBg,
  manageHref = '/integrations',
}: IntegrationTileProps) => {
  return (
    <article
      className={[
        'group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        connected ? 'border-emerald-200 hover:shadow-emerald-100/50' : 'border-[var(--color-border)] hover:border-violet-200 hover:shadow-violet-100/40',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
            iconBg,
          ].join(' ')}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--color-ink)]">{name}</h3>
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                connected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
              ].join(' ')}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  connected ? 'bg-emerald-500 animate-pulse-soft' : 'bg-gray-400',
                ].join(' ')}
                aria-hidden
              />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="mt-1.5 truncate text-sm text-[var(--color-ink-muted)]">{detail}</p>
          <Link
            to={manageHref}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-600 transition hover:text-violet-700"
          >
            Configure
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  )
}
