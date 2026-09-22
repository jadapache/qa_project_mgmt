import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { GitHostingReposPanel } from '../components/GitHostingReposPanel'
import { JiraIssuesPreview } from '../components/JiraIssuesPreview'
import { JiraOAuthSetup } from '../components/JiraOAuthSetup'
import { JiraProjectsPanel } from '../components/JiraProjectsPanel'
import { OAuthSetup } from '../components/OAuthSetup'
import type { AuthMethod, IntegrationInfo } from '../types'

export const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [oauthKey, setOauthKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await api.getIntegrations()
      setIntegrations(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const handleCallback = (key: 'jira' | 'github' | 'gitlab', label: string) => {
      const status = searchParams.get(key)
      const rawMessage = searchParams.get('message')
      if (status === 'connected') {
        setMessage(`${label} connected successfully. Live data synced.`)
        setSearchParams({}, { replace: true })
        void load()
      } else if (status === 'error') {
        const decoded = rawMessage ? decodeURIComponent(rawMessage) : `${label} OAuth failed.`
        if (key === 'jira') {
          setError(
            `${decoded} If Atlassian showed "Something went wrong" on Accept, enable every scope in the checklist above, use the app owner's Atlassian account, then retry — or connect with Personal Access Token instead.`,
          )
        } else {
          setError(decoded)
        }
        setSearchParams({}, { replace: true })
      }
    }
    handleCallback('jira', 'Jira')
    handleCallback('github', 'GitHub')
    handleCallback('gitlab', 'GitLab')
  }, [searchParams, setSearchParams, load])

  const handlePatConnected = async (id: string, label: string) => {
    try {
      await api.syncIntegration(id)
      setMessage(`${label} connected. Live data synced.`)
    } catch {
      setMessage(`${label} connected. Select repos/projects to sync data.`)
    }
    await load()
  }

  const jira = useMemo(() => integrations.find((item) => item.id === 'jira'), [integrations])
  const github = useMemo(() => integrations.find((item) => item.id === 'github'), [integrations])
  const gitlab = useMemo(() => integrations.find((item) => item.id === 'gitlab'), [integrations])

  const handleOAuthConnect = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      const result = await api.startOAuth(id)
      window.location.href = result.authorization_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start OAuth')
      setBusyId(null)
    }
  }

  const handleDisconnect = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      await api.disconnectIntegration(id)
      setMessage(`${id} disconnected. Local credentials removed.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleTest = async (id: string) => {
    setBusyId(id)
    setError(null)
    setMessage(null)
    try {
      const result = await api.testIntegration(id)
      if (result.ok) {
        setMessage(result.message)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Integrations</h1>
        <p className="page-subtitle">
          Connect accounts independently. Features only care that a valid connection exists.
        </p>
      </header>

      {message ? <p className="alert-success" role="status">{message}</p> : null}
      {error ? <p className="alert-error" role="alert">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading integrations…</p>
      ) : (
        <div className="space-y-6">
          {jira ? (
            <JiraOAuthSetup
              key={oauthKey}
              onSaved={() => {
                setOauthKey((k) => k + 1)
                void load()
                setMessage('Jira OAuth credentials saved. You can now connect with OAuth.')
              }}
            />
          ) : null}
          {github && !github.oauth_configured ? (
            <OAuthSetup
              key={`github-${oauthKey}`}
              provider="github"
              title="GitHub OAuth"
              docsUrl="https://github.com/settings/developers"
              docsLabel="github.com/settings/developers"
              defaultRedirect="http://127.0.0.1:8000/api/integrations/github/callback"
              onSaved={() => {
                setOauthKey((k) => k + 1)
                void load()
                setMessage('GitHub OAuth credentials saved. You can now connect with OAuth.')
              }}
            />
          ) : null}
          {gitlab && !gitlab.oauth_configured ? (
            <OAuthSetup
              key={`gitlab-${oauthKey}`}
              provider="gitlab"
              title="GitLab OAuth"
              docsUrl="https://gitlab.com/-/user_settings/applications"
              docsLabel="gitlab.com user applications"
              defaultRedirect="http://127.0.0.1:8000/api/integrations/gitlab/callback"
              showBaseUrl
              onSaved={() => {
                setOauthKey((k) => k + 1)
                void load()
                setMessage('GitLab OAuth credentials saved. You can now connect with OAuth.')
              }}
            />
          ) : null}
          {jira ? (
            <IntegrationCard
              integration={jira}
              busy={busyId === 'jira'}
              onOAuth={() => void handleOAuthConnect('jira')}
              onDisconnect={() => void handleDisconnect('jira')}
              onTest={() => void handleTest('jira')}
              onPatConnected={() => handlePatConnected('jira', 'Jira')}
              onError={setError}
            />
          ) : null}
          {github ? (
            <IntegrationCard
              integration={github}
              busy={busyId === 'github'}
              onOAuth={() => void handleOAuthConnect('github')}
              onDisconnect={() => void handleDisconnect('github')}
              onTest={() => void handleTest('github')}
              onPatConnected={() => handlePatConnected('github', 'GitHub')}
              onError={setError}
            />
          ) : null}
          {gitlab ? (
            <IntegrationCard
              integration={gitlab}
              busy={busyId === 'gitlab'}
              onOAuth={() => void handleOAuthConnect('gitlab')}
              onDisconnect={() => void handleDisconnect('gitlab')}
              onTest={() => void handleTest('gitlab')}
              onPatConnected={() => handlePatConnected('gitlab', 'GitLab')}
              onError={setError}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

type IntegrationCardProps = {
  integration: IntegrationInfo
  busy: boolean
  onOAuth: () => void
  onDisconnect: () => void
  onTest: () => void
  onPatConnected: () => Promise<void>
  onError: (message: string) => void
}

const IntegrationCard = ({
  integration,
  busy,
  onOAuth,
  onDisconnect,
  onTest,
  onPatConnected,
  onError,
}: IntegrationCardProps) => {
  const connected = integration.status === 'connected'
  const [authMethod, setAuthMethod] = useState<AuthMethod>(integration.id === 'jira' ? 'pat' : 'oauth')
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePatSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await api.connectWithPat(integration.id, {
        token,
        email: email || undefined,
        base_url: baseUrl || undefined,
      })
      setShowConnectForm(false)
      setToken('')
      await onPatConnected()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'PAT connection failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{integration.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{integration.description}</p>
        </div>
        <StatusPill connected={connected} />
      </div>

      {connected ? (
        <div className="mt-5 space-y-2 text-sm">
          {integration.workspace_label ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Workspace: </span>
              {integration.workspace_label}
            </p>
          ) : null}
          {integration.account_label ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Account: </span>
              {integration.account_label}
            </p>
          ) : null}
          {integration.details?.auth_method ? (
            <p>
              <span className="text-[var(--color-ink-muted)]">Auth: </span>
              {String(integration.details.auth_method).toUpperCase()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {connected ? (
          <>
            <button
              type="button"
              onClick={onTest}
              disabled={busy}
              className="btn-primary disabled:opacity-50"
              aria-label={`Test ${integration.name} connection`}
            >
              Test connection
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className="rounded-md border border-[var(--color-bad)] px-4 py-2 text-sm font-medium text-[var(--color-bad)] hover:bg-[rgba(155,44,44,0.06)] disabled:opacity-50"
              aria-label={`Disconnect ${integration.name}`}
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => setShowConnectForm(true)}
              disabled={busy}
              className="btn-secondary disabled:opacity-50"
              aria-label={`Change ${integration.name} account`}
            >
              Change account
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowConnectForm(true)}
            className="btn-primary"
            aria-label={`Connect ${integration.name}`}
          >
            Connect {integration.name}
          </button>
        )}
      </div>

      {connected && integration.id === 'jira' ? (
        <>
          <JiraProjectsPanel
            siteUrl={integration.workspace_label}
            onSaved={() => void onPatConnected()}
            onError={onError}
          />
          <JiraIssuesPreview onError={onError} />
        </>
      ) : null}
      {connected && integration.id === 'github' ? (
        <GitHostingReposPanel
          integrationId="github"
          heading="Repositories"
          description="Only selected repos are accessible to features. Nothing is auto-selected."
          onSaved={() => void onPatConnected()}
          onError={onError}
        />
      ) : null}
      {connected && integration.id === 'gitlab' ? (
        <GitHostingReposPanel
          integrationId="gitlab"
          heading="Projects"
          description="Only selected GitLab projects are accessible to features. Nothing is auto-selected."
          onSaved={() => void onPatConnected()}
          onError={onError}
        />
      ) : null}

      {showConnectForm ? (
        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Authentication</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${integration.id}-auth`}
                checked={authMethod === 'oauth'}
                onChange={() => setAuthMethod('oauth')}
              />
              OAuth
              {integration.id === 'jira' && !integration.oauth_configured ? (
                <span className="text-xs text-[var(--color-warn)]">(save OAuth credentials above first)</span>
              ) : null}
              {(integration.id === 'github' || integration.id === 'gitlab') && !integration.oauth_configured ? (
                <span className="text-xs text-[var(--color-warn)]">(save OAuth credentials above first)</span>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${integration.id}-auth`}
                checked={authMethod === 'pat'}
                onChange={() => setAuthMethod('pat')}
              />
              Personal Access Token
            </label>
          </fieldset>

          {authMethod === 'oauth' ? (
            <div className="mt-4 space-y-3">
              {integration.id === 'jira' ? (
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Use the same Atlassian account that owns your OAuth app. If Accept fails, follow the scope checklist
                  at the top of this page or switch to Personal Access Token.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOAuth}
                disabled={busy || !integration.oauth_configured}
                className="btn-primary disabled:opacity-50"
              >
                Continue with OAuth
              </button>
              <button
                type="button"
                onClick={() => setShowConnectForm(false)}
                className="rounded-md px-4 py-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              </div>
            </div>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={(event) => void handlePatSubmit(event)}>
              {integration.id === 'jira' ? (
                <>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Recommended for local dev. Create a token at{' '}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-primary)] underline"
                    >
                      id.atlassian.com → Security → API tokens
                    </a>
                    .
                  </p>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--color-ink-muted)]">Atlassian email</span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="input-field"
                      aria-label="Atlassian email"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--color-ink-muted)]">
                      Site URL (https://your-domain.atlassian.net)
                    </span>
                    <input
                      required
                      type="url"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      className="input-field"
                      aria-label="Jira site URL"
                    />
                  </label>
                </>
              ) : null}
              {integration.id === 'gitlab' ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--color-ink-muted)]">
                    GitLab URL (optional — defaults to https://gitlab.com)
                  </span>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    placeholder="https://gitlab.com"
                    className="input-field"
                    aria-label="GitLab instance URL"
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--color-ink-muted)]">Personal Access Token</span>
                <input
                  required
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
                  aria-label={`${integration.name} personal access token`}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Connecting…' : 'Save connection'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnectForm(false)}
                  className="rounded-md px-4 py-2 text-sm text-[var(--color-ink-muted)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </article>
  )
}

const StatusPill = ({ connected }: { connected: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
      connected
        ? 'bg-[rgba(31,122,77,0.12)] text-[var(--color-ok)]'
        : 'bg-[rgba(15,28,26,0.06)] text-[var(--color-ink-muted)]',
    ].join(' ')}
  >
    <span
      className={['h-2 w-2 rounded-full', connected ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-ink-muted)]'].join(' ')}
      aria-hidden
    />
    {connected ? 'Connected' : 'Not connected'}
  </span>
)
