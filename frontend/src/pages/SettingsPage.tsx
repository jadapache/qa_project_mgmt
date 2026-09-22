import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, type AISettings } from '../api/client'
import { DEFAULT_DISPLAY_NAME } from '../constants/app'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

export const SettingsPage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const [name, setName] = useState(displayName)
  const [ai, setAi] = useState<AISettings | null>(null)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434')
  const [standupRubric, setStandupRubric] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  useEffect(() => {
    const load = async () => {
      const settings = await api.getAiSettings()
      setAi(settings)
      setProvider(settings.provider)
      setModel(settings.model)
      setOllamaUrl(settings.ollama_base_url || 'http://127.0.0.1:11434')
      const rubric = await api.getRubric('standup')
      setStandupRubric(((rubric.criteria as string[]) || []).join('\n'))
    }
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
  }, [])

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const updated = await api.updateSettings({ display_name: name.trim() || DEFAULT_DISPLAY_NAME })
    setDisplayName(updated.display_name ?? name)
    setMessage('Profile saved.')
  }

  const handleAi = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload: Record<string, string> = {
      provider,
      model,
      ollama_base_url: ollamaUrl,
    }
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    if (claudeKey.trim()) payload.claude_api_key = claudeKey.trim()
    const updated = await api.updateAiSettings(payload)
    setAi(updated)
    setOpenaiKey('')
    setClaudeKey('')
    setMessage('AI provider saved locally.')
  }

  const handleRubric = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const criteria = standupRubric
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    await api.updateRubric('standup', criteria)
    setMessage('Standup rubric updated (version bumped).')
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">System</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Settings</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Preferences, AI provider, and editable rubrics — stored locally, not hardcoded forever.
        </p>
      </header>

      {message ? <p className="text-sm text-[var(--color-ok)]" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-[var(--color-bad)]" role="alert">{error}</p> : null}

      <form onSubmit={(event) => void handleProfile(event)} className="max-w-lg space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Used in greetings, navigation labels (e.g. {DEFAULT_DISPLAY_NAME} Tools), and your avatar.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Display name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white">
          Save profile
        </button>
      </form>

      <form onSubmit={(event) => void handleAi(event)} className="max-w-lg space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <h2 className="text-lg font-semibold">AI Provider</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Current: {ai?.provider || 'none'}
          {ai?.openai_api_key_set ? ' · OpenAI key set' : ''}
          {ai?.claude_api_key_set ? ' · Claude key set' : ''}
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Provider</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          >
            <option value="">Select…</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="ollama">Ollama (local)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Model</span>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-4o-mini / claude-3-5-haiku-latest / llama3.2"
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">OpenAI API key</span>
          <input
            type="password"
            value={openaiKey}
            onChange={(event) => setOpenaiKey(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
            placeholder={ai?.openai_api_key_set ? '•••• saved' : ''}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Claude API key</span>
          <input
            type="password"
            value={claudeKey}
            onChange={(event) => setClaudeKey(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
            placeholder={ai?.claude_api_key_set ? '•••• saved' : ''}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Ollama base URL</span>
          <input
            value={ollamaUrl}
            onChange={(event) => setOllamaUrl(event.target.value)}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white">
          Save AI settings
        </button>
      </form>

      <form onSubmit={(event) => void handleRubric(event)} className="max-w-lg space-y-4 rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <h2 className="text-lg font-semibold">Standup rubric</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">One criterion per line. Editing bumps the version.</p>
        <textarea
          value={standupRubric}
          onChange={(event) => setStandupRubric(event.target.value)}
          rows={8}
          className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-[var(--color-ink)] px-4 py-2 text-sm font-medium">
          Save rubric
        </button>
      </form>
    </div>
  )
}
