import { BrowserRouter, Link, Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AskProductPage } from './pages/AskProductPage'
import { DashboardPage } from './pages/DashboardPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChangeImpactPage } from './pages/ChangeImpactPage'
import { PrdCheckerPage } from './pages/PrdCheckerPage'
import { StandupPage } from './pages/StandupPage'
import { QaFeaturePage } from './pages/qa/QaFeaturePage'
import { toolsGroupLabel } from './constants/app'
import { QA_FEATURES } from './constants/qaFeatures'

type OutletContext = {
  displayName: string
}

const PmOverviewPage = () => {
  const { displayName } = useOutletContext<OutletContext>()
  return (
    <PlaceholderPage
      eyebrow={toolsGroupLabel(displayName)}
      title="Product workflows"
      description="Standup, PRD Checker, and Change Impact — upload files, chat for context, get grounded answers."
      upcoming={['Standup (ready)', 'PRD Checker (ready)', 'Change Impact (ready)']}
    />
  )
}

const QaOverviewPage = () => (
  <div className="space-y-8">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">QA Tools</p>
      <h1 className="page-title">Quality workflows</h1>
      <p className="page-subtitle max-w-3xl">
        Upload specs and test docs, chat for context, and pull live data from Jira, GitHub, or GitLab — all grounded with citations.
      </p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {QA_FEATURES.map((feature) => {
        const Icon = feature.icon
        return (
          <Link
            key={feature.slug}
            to={`/qa/${feature.slug}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-transform group-hover:scale-105">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mt-4 font-semibold text-[var(--color-ink)]">{feature.title}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{feature.description}</p>
          </Link>
        )
      })}
    </div>
  </div>
)

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pm" element={<PmOverviewPage />} />
          <Route path="pm/standup" element={<StandupPage />} />
          <Route path="pm/prd-checker" element={<PrdCheckerPage />} />
          <Route path="pm/change-impact" element={<ChangeImpactPage />} />
          <Route
            path="qa"
            element={<QaOverviewPage />}
          />
          <Route path="qa/:slug" element={<QaFeaturePage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="knowledge/ask" element={<AskProductPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
