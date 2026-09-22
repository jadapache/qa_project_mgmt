import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type ScopeGuideItem = {
  scope: string
  label: string
  where: string
  required: boolean
}

type JiraOAuthSetupProps = {
  onSaved: () => void
}

export const JiraOAuthSetup = ({ onSaved }: JiraOAuthSetupProps) => {
  const [status, setStatus] = useState<{
    configured: boolean
    client_id_set: boolean
    client_secret_set: boolean
    redirect_uri: string
    scopes?: string[]
    scope_guide?: ScopeGuideItem[]
  } | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('http://127.0.0.1:8000/api/integrations/jira/callback')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    void api.getJiraOAuth().then((data) => {
      setStatus(data)
      setRedirectUri(data.redirect_uri)
    })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.saveJiraOAuth({
        client_id: clientId,
        client_secret: clientSecret || undefined,
        redirect_uri: redirectUri,
      })
      const updated = await api.getJiraOAuth()
      setStatus(updated)
      setClientSecret('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OAuth config')
    } finally {
      setBusy(false)
    }
  }

  const activeScopes = status?.scopes ?? ['read:jira-work', 'offline_access']
  const scopeGuide = status?.scope_guide ?? []

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Atlassian Developer Console checklist</h3>
          <button
            type="button"
            onClick={() => setShowGuide((value) => !value)}
            className="text-xs text-[var(--color-primary)] underline"
          >
            {showGuide ? 'Hide' : 'Show'} setup steps
          </button>
        </div>
        {showGuide ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--color-ink-muted)]">
            <li>
              Open{' '}
              <a
                href="https://developer.atlassian.com/console/myapps/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-primary)] underline"
              >
                developer.atlassian.com/console/myapps
              </a>{' '}
              and select your OAuth 2.0 app (e.g. PMcopilot).
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">Authorization</strong> → OAuth 2.0 (3LO) → set callback URL
              exactly to:{' '}
              <code className="rounded bg-[var(--color-surface)] px-1 text-xs">{redirectUri}</code>
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">Permissions</strong> → add <em>Jira API</em> (and{' '}
              <em>Jira Software API</em> if you need sprints/boards) → click <em>Configure</em> and enable every scope
              below that this app requests.
            </li>
            <li>
              Development-mode apps can only be authorized by the <strong className="text-[var(--color-ink)]">same
              Atlassian account</strong> that owns the app. Sign in with that account before clicking Accept.
            </li>
            <li>
              If Accept shows &quot;Something went wrong&quot;, a scope is usually missing in Permissions — match the
              list below, save, wait ~1 minute, then retry OAuth.
            </li>
          </ol>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                <th className="py-2 pr-3 font-medium">Scope</th>
                <th className="py-2 pr-3 font-medium">Enable in console</th>
                <th className="py-2 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody>
              {scopeGuide.map((item) => {
                const requested = activeScopes.includes(item.scope)
                return (
                  <tr key={item.scope} className="border-b border-[var(--color-border)]/60">
                    <td className="py-2 pr-3 align-top">
                      <code>{item.scope}</code>
                      <div className="text-[var(--color-ink-muted)]">{item.label}</div>
                    </td>
                    <td className="py-2 pr-3 align-top text-[var(--color-ink-muted)]">{item.where}</td>
                    <td className="py-2 align-top">
                      {requested ? (
                        <span className="text-[var(--color-primary)]">Yes</span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)]">Optional</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Tip: For local dev, <strong className="text-[var(--color-ink)]">Personal Access Token</strong> on the Jira
          card is faster — no Atlassian app setup required.
        </p>
      </div>

      {status?.configured ? (
        <div className="rounded-lg border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)]/40 p-4 text-sm">
          <p className="font-medium text-[var(--color-primary)]">Jira OAuth configured</p>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Redirect URI: <code className="text-xs">{status.redirect_uri}</code>
          </p>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Scopes: <code className="text-xs">{activeScopes.join(' ')}</code>
          </p>
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
        >
          <div>
            <h3 className="text-sm font-semibold">Jira OAuth credentials</h3>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Paste Client ID and Secret from your app&apos;s Settings tab in the Atlassian Developer Console.
            </p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--color-ink-muted)]">Client ID</span>
            <input
              required
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="input-field"
              aria-label="Jira OAuth client ID"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--color-ink-muted)]">Client Secret</span>
            <input
              required={!status?.client_secret_set}
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              className="input-field"
              placeholder={status?.client_secret_set ? '•••• saved — leave blank to keep' : ''}
              aria-label="Jira OAuth client secret"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--color-ink-muted)]">Redirect URI (must match Atlassian app)</span>
            <input
              required
              value={redirectUri}
              onChange={(event) => setRedirectUri(event.target.value)}
              className="input-field"
              aria-label="Jira OAuth redirect URI"
            />
          </label>
          {error ? <p className="alert-error">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save OAuth credentials'}
          </button>
        </form>
      )}
    </div>
  )
}
