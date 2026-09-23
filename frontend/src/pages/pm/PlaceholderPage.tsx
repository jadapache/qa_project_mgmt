type PlaceholderPageProps = {
  title: string
  eyebrow: string
  description: string
  upcoming: string[]
}

export const PlaceholderPage = ({ title, eyebrow, description, upcoming }: PlaceholderPageProps) => {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </header>
      <section className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Planned in this group
        </h2>
        <ul className="mt-4 space-y-3">
          {upcoming.map((item) => (
            <li key={item} className="border-l-2 border-[var(--color-primary)] pl-4 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
