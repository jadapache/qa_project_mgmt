import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type QuickActionCardProps = {
  to: string
  title: string
  description: string
  icon: LucideIcon
  badge?: string
  gradient?: string
}

export const QuickActionCard = ({
  to,
  title,
  description,
  icon: Icon,
  badge,
  gradient = 'from-violet-600 to-indigo-600',
}: QuickActionCardProps) => {
  return (
    <Link
      to={to}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50"
      aria-label={title}
    >
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        {badge ? (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--color-ink)] transition-colors group-hover:text-violet-700">
        {title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
        Open
        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}
