import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type StatCardProps = {
  label: string
  value: ReactNode
  icon: LucideIcon
  trend?: string
  accent?: 'purple' | 'cyan' | 'emerald' | 'amber'
  loading?: boolean
  to?: string
}

const accentMap = {
  purple: {
    icon: 'bg-violet-100 text-violet-600',
    glow: 'group-hover:shadow-violet-200/60',
    bar: 'from-violet-500 to-purple-400',
  },
  cyan: {
    icon: 'bg-cyan-100 text-cyan-600',
    glow: 'group-hover:shadow-cyan-200/60',
    bar: 'from-cyan-500 to-teal-400',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600',
    glow: 'group-hover:shadow-emerald-200/60',
    bar: 'from-emerald-500 to-green-400',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-600',
    glow: 'group-hover:shadow-amber-200/60',
    bar: 'from-amber-500 to-orange-400',
  },
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  accent = 'purple',
  loading,
  to,
}: StatCardProps) => {
  const styles = accentMap[accent]

  const className = [
    'group relative block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5',
    'shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
    to ? 'cursor-pointer hover:border-violet-200' : '',
    styles.glow,
  ].join(' ')

  const inner = (
    <>
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.bar} opacity-80`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {label}
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">{value}</p>
          )}
          {trend ? (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{trend}</p>
          ) : null}
        </div>
        <div
          className={[
            'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            styles.icon,
          ].join(' ')}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className} aria-label={`${label} — ${trend ?? 'view details'}`}>
        {inner}
      </Link>
    )
  }

  return <article className={className}>{inner}</article>
}
