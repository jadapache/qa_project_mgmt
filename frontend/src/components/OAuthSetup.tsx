import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type OAuthStatus = {
  configured: boolean
  client_id_set: boolean
  client_secret_set: boolean
  redirect_uri: string
  base_url?: string
}

type OAuthSetupProps = {
  provider: 'github' | 'gitlab'
  title: string
  docsUrl: string
  docsLabel: string
  defaultRedirect: string
  showBaseUrl?: boolean
  defaultBaseUrl?: string
  onSaved: () => void
}

export const OAuthSetup = ({
  provider,
  title,
  docsUrl,
  docsLabel,
  defaultRedirect,
  showBaseUrl = false,
  defaultBaseUrl = 'https://gitlab.com',
  onSaved,
}: OAuthSetupProps) => {
  const [status, setStatus] = useState<OAuthStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState(defaultRedirect)
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const data =
      provider === 'github'
        ? await api.getGitHubOAuth()
        : await api.getGitLabOAuth()
    setStatus(data)
    setRedirectUri(data.redirect_uri || defaultRedirect)
    if ('base_url' in data && typeof data.base_url === 'string') setBaseUrl(data.base_url)
  }

  useEffect(() => {
    void load()
  }, [provider])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (provider === 'github') {
        await api.saveGitHubOAuth({
          client_id: clientId,
          client_secret: clientSecret || undefined,
          redirect_uri: redirectUri,
        })
      } else {
        await api.saveGitLabOAuth({
          client_id: clientId,
          client_secret: clientSecret || undefined,
          redirect_uri: redirectUri,
          base_url: baseUrl || undefined,
        })
      }
      await load()
      setClientSecret('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save OAuth config')
    } finally {
      setBusy(false)
    }
  }

  if (status?.configured) {
    return (
      <div className="rounded-lg border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)]/40 p-4 text-sm">
        <p className="font-medium text-[var(--color-primary)]">{title} configured</p>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          Redirect URI: <code className="text-xs">{status.redirect_uri}</code>
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
    >
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Create an OAuth app at{' '}
          <a href={docsUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">
            {docsLabel}
          </a>
          . Set the callback URL to the redirect URI below.
        </p>
      </div>
      {showBaseUrl ? (
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">GitLab instance URL</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="input-field"
            aria-label="GitLab instance URL"
          />
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-ink-muted)]">Client ID / Application ID</span>
        <input
          required
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="input-field"
          aria-label={`${title} client ID`}
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
          aria-label={`${title} client secret`}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-ink-muted)]">Redirect URI</span>
        <input
          required
          value={redirectUri}
          onChange={(event) => setRedirectUri(event.target.value)}
          className="input-field"
          aria-label={`${title} redirect URI`}
        />
      </label>
      {error ? <p className="alert-error">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Saving…' : 'Save OAuth credentials'}
      </button>
    </form>
  )
}
