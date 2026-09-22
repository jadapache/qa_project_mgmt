import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  FileSearch,
  GitBranch,
  GitCompareArrows,
  Kanban,
  LayoutGrid,
  MessageSquare,
  Plug,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import { IntegrationTile } from '../components/ui/IntegrationTile'
import { QuickActionCard } from '../components/ui/QuickActionCard'
import { StatCard } from '../components/ui/StatCard'
import type { IntegrationInfo } from '../types'

type OutletContext = {
  displayName: string
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export const DashboardPage = () => {
  const { displayName } = useOutletContext<OutletContext>()
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([])
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const load = async () => {
      try {
        await api.health()
        setBackendOk(true)
        const [items, ai] = await Promise.all([api.getIntegrations(), api.getAiSettings()])
        setIntegrations(items)
        setAiConfigured(Boolean(ai.provider))
      } catch {
        setBackendOk(false)
        setAiConfigured(false)
      }
    }
    void load()
  }, [])

  const jira = integrations.find((item) => item.id === 'jira')
  const github = integrations.find((item) => item.id === 'github')
  const gitlab = integrations.find((item) => item.id === 'gitlab')
  const connectedCount = integrations.filter((item) => item.status === 'connected').length
  const totalIntegrations = integrations.length

  const readiness = useMemo(() => {
    let score = 20
    if (backendOk) score += 25
    if (jira?.status === 'connected') score += 25
    if (github?.status === 'connected') score += 20
    if (aiConfigured) score += 10
    return Math.min(score, 100)
  }, [backendOk, jira, github, aiConfigured])

  return (
    <div className={`space-y-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl shadow-violet-200/40 md:p-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-float" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl animate-float-delayed" aria-hidden />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden />
              {displayName} / QA AI Command Center
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              {getGreeting()}, {displayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-violet-100 md:text-base">
              Grounded workflows pull live context from Jira, GitHub, and your docs — then answer with citations, not guesses.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:items-end">
            <div className="flex items-center gap-2 text-sm text-violet-100">
              <Bot className="h-4 w-4" aria-hidden />
              System readiness
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{readiness}%</span>
              <span className="mb-1 text-xs text-violet-200">ready</span>
            </div>
            <div className="h-2 w-full min-w-[180px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300 transition-all duration-1000 ease-out"
                style={{ width: `${readiness}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="System metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Backend"
          value={backendOk === null ? '…' : backendOk ? 'Online' : 'Offline'}
          icon={Activity}
          accent={backendOk ? 'emerald' : 'amber'}
          trend={backendOk ? 'API responding' : 'Start the FastAPI server'}
          loading={backendOk === null}
        />
        <StatCard
          label="Integrations"
          value={totalIntegrations ? `${connectedCount} / ${totalIntegrations}` : `${connectedCount}`}
          icon={Plug}
          accent="cyan"
          trend={connectedCount === totalIntegrations && totalIntegrations > 0 ? 'All sources linked' : 'Connect Jira, GitHub & GitLab'}
          to="/integrations"
        />
        <StatCard
          label="AI Provider"
          value={aiConfigured === null ? '…' : aiConfigured ? 'Configured' : 'Setup needed'}
          icon={Brain}
          accent={aiConfigured ? 'purple' : 'amber'}
          trend={aiConfigured ? 'Ready for grounded runs' : 'Add key in Settings'}
          loading={aiConfigured === null}
          to="/settings"
        />
        <StatCard
          label="Grounding"
          value="BM25"
          icon={Zap}
          accent="purple"
          trend="Live + document context"
          to="/knowledge"
        />
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Quick actions</h2>
          <span className="text-xs text-[var(--color-ink-muted)]">One-click workflows</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            to="/pm/standup"
            title="Generate Standup"
            description="Yesterday, today, blocked — from Jira + GitHub only."
            icon={Sun}
            badge="Live"
            gradient="from-violet-600 to-purple-600"
          />
          <QuickActionCard
            to="/pm/prd-checker"
            title="PRD Checker"
            description="Upload multiple PRDs, chat for focus, get a scored review."
            icon={FileSearch}
            badge="New"
            gradient="from-purple-600 to-fuchsia-600"
          />
          <QuickActionCard
            to="/pm/change-impact"
            title="Change Impact"
            description="Map tickets, PRs, and docs affected by a change."
            icon={GitCompareArrows}
            badge="New"
            gradient="from-indigo-600 to-violet-600"
          />
          <QuickActionCard
            to="/knowledge/ask"
            title="Ask My Product"
            description="Query connected sources with citations per answer."
            icon={MessageSquare}
            badge="AI"
            gradient="from-cyan-600 to-teal-600"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            to="/knowledge"
            title="Upload Knowledge"
            description="Ingest PRDs, specs, and docs for retrieval."
            icon={LayoutGrid}
            gradient="from-teal-600 to-emerald-600"
          />
          <QuickActionCard
            to="/integrations"
            title="Connect Sources"
            description="Jira OAuth, GitHub PAT, GitLab PAT."
            icon={GitBranch}
            gradient="from-fuchsia-600 to-pink-600"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Integrations */}
        <section aria-label="Integrations" className="space-y-4 xl:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Live connections</h2>
          <IntegrationTile
            name="Jira"
            connected={jira?.status === 'connected'}
            detail={
              jira?.status === 'connected'
                ? `${jira.workspace_label ?? 'Workspace'} · ${jira.account_label ?? ''}`
                : 'OAuth or PAT — issues & sprints'
            }
            icon={Kanban}
            iconBg="bg-blue-100 text-blue-600"
          />
          <IntegrationTile
            name="GitHub"
            connected={github?.status === 'connected'}
            detail={
              github?.status === 'connected'
                ? `Connected as ${github.account_label}`
                : 'PAT + selected repositories'
            }
            icon={GitBranch}
            iconBg="bg-gray-900 text-white"
          />
          <IntegrationTile
            name="GitLab"
            connected={gitlab?.status === 'connected'}
            detail={
              gitlab?.status === 'connected'
                ? `Connected as ${gitlab.account_label}`
                : 'PAT + selected projects'
            }
            icon={GitBranch}
            iconBg="bg-orange-500 text-white"
          />
        </section>

        {/* AI contract + activity */}
        <section className="xl:col-span-3">
          <div className="h-full rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--color-ink)]">Grounding contract</h2>
                <p className="text-xs text-[var(--color-ink-muted)]">Every AI feature follows the same rules</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3">
              {[
                { step: '1', text: 'Declare allowed sources per feature' },
                { step: '2', text: 'Assemble context from live APIs + uploaded docs' },
                { step: '3', text: 'Refuse when data is missing — no generic guesses' },
                { step: '4', text: 'Show citations for every grounded answer' },
              ].map((item) => (
                <li
                  key={item.step}
                  className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-violet-100 hover:bg-violet-50/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                    {item.step}
                  </span>
                  <span className="text-sm text-[var(--color-ink-muted)]">{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-5">
              <Link to="/pm/standup" className="btn-primary gap-2">
                <Sun className="h-4 w-4" aria-hidden />
                Try Standup
              </Link>
              <Link to="/settings" className="btn-secondary gap-2">
                Configure AI
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
