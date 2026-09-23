import { BrowserRouter, Link, Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AskProductPage } from './pages/conocimiento/AskProductPage'
import { DashboardPage } from './pages/DashboardPage'
import { KnowledgePage } from './pages/conocimiento/KnowledgePage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/pm/PlaceholderPage'
import { ProfilePage } from './pages/configuraciones/ProfilePage'
import { SettingsPage } from './pages/configuraciones/SettingsPage'
import { ChangeImpactPage } from './pages/pm/ChangeImpactPage'
import { PrdCheckerPage } from './pages/pm/PrdCheckerPage'
import { StandupPage } from './pages/pm/StandupPage'
import { QaFeaturePage } from './pages/qa/QaFeaturePage'
import { toolsGroupLabel } from './constants/app'
import { QA_FEATURES } from './constants/qaFeatures'

import { LevantamientoPage } from './pages/funcional/LevantamientoPage'
import { MejorasPage } from './pages/funcional/MejorasPage'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/common/Toast'

type OutletContext = {
  displayName: string
}

const PmOverviewPage = () => {
  const { displayName } = useOutletContext<OutletContext>()
  return (
    <PlaceholderPage
      eyebrow={toolsGroupLabel(displayName)}
      title="Product workflows"
      description="Standup, verificador de PRD e impacto de cambios: sube archivos, chatea para dar contexto y recibe respuestas fundamentadas."
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
        Sube especificaciones y documentos de prueba, chatea para obtener contexto y extrae datos en tiempo real de Jira, GitHub o GitLab; todo ello respaldado por citas.
      </p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {QA_FEATURES.map((feature) => {
        const Icon = feature.icon
        return (
          <Link
            key={feature.slug}
            to={`/qa/${feature.slug}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all hover:border-[#004497]/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#002777] transition-transform group-hover:scale-105">
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
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="pm" element={<PmOverviewPage />} />
                <Route path="pm/standup" element={<StandupPage />} />
                <Route path="pm/prd-checker" element={<PrdCheckerPage />} />
                <Route path="pm/change-impact" element={<ChangeImpactPage />} />
                <Route path="funcional" element={<Navigate to="/funcional/mejoras" replace />} />
                <Route path="funcional/levantamiento" element={<LevantamientoPage />} />
                <Route path="funcional/mejoras" element={<MejorasPage />} />
                <Route
                  path="qa"
                  element={<QaOverviewPage />}
                />
                <Route path="qa/:slug" element={<QaFeaturePage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="knowledge/ask" element={<AskProductPage />} />
                <Route path="integrations" element={<Navigate to="/settings?tab=integrations" replace />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
