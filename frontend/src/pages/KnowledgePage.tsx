import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { api, type KnowledgeDocument } from '../api/client'

const ACCEPTED_TYPES = '.pdf,.docx,.md,.txt,.json,.html,.htm'

export const KnowledgePage = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [tags, setTags] = useState('prd')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState({ knowledge: true, jira: false, github: false })
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(true)

  const load = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const data = await api.listDocuments()
      setDocuments(data.documents)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
  }, [load])

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      setError('Choose a file first, then click Upload & ingest.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const uploaded = await api.uploadDocument(selectedFile, tags)
      setSelectedFile(null)
      event.currentTarget.reset()
      await load()
      setMessage(`"${uploaded.document.filename}" ingested with ${uploaded.document.chunk_count} chunks.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (doc: KnowledgeDocument) => {
    const confirmed = window.confirm(`Remove "${doc.filename}" from the grounding library?`)
    if (!confirmed) {
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await api.deleteDocument(doc.id)
      await load()
      setMessage(`Removed "${doc.filename}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRetrieve = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const active = Object.entries(sources)
        .filter(([, on]) => on)
        .map(([key]) => key)
      const data = await api.retrieve(query, active)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieve failed')
    } finally {
      setBusy(false)
    }
  }

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">Knowledge</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Grounding library</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Upload PRDs and docs. They are chunked and stored locally for BM25 retrieval in PM and QA features.
        </p>
      </header>

      {message ? <p className="alert-success" role="status">{message}</p> : null}
      {error ? <p className="alert-error" role="alert">{error}</p> : null}

      <form onSubmit={(event) => void handleUpload(event)} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white/60 p-5">
        <h2 className="text-lg font-semibold">Upload document</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Supported: PDF, Word, Markdown, text, JSON, HTML. Select a file, then click Upload &amp; ingest.
        </p>
        <input
          name="file"
          type="file"
          accept={ACCEPTED_TYPES}
          aria-label="Upload document"
          className="block w-full text-sm"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        {selectedFile ? (
          <p className="text-sm">
            Selected: <span className="font-medium">{selectedFile.name}</span> ({Math.round(selectedFile.size / 1024)} KB)
          </p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--color-ink-muted)]">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="input-field"
            aria-label="Document tags"
          />
        </label>
        <button type="submit" disabled={busy || !selectedFile} className="btn-primary disabled:opacity-50">
          {busy ? 'Uploading…' : 'Upload & ingest'}
        </button>
      </form>

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Stored documents ({documents.length})</h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loadingDocs || busy}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loadingDocs ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            No documents stored yet. Upload a file above — it will appear here and be available for context retrieval.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.filename}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {doc.chunk_count} chunks · {doc.tags.join(', ') || 'untagged'} · uploaded {formatDate(doc.uploaded_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="text-sm text-[var(--color-bad)] disabled:opacity-50"
                  onClick={() => void handleDelete(doc)}
                  aria-label={`Delete ${doc.filename}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(event) => void handleRetrieve(event)} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white/60 p-5">
        <h2 className="text-lg font-semibold">Test retrieval</h2>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">Sources</legend>
          {(['knowledge', 'jira', 'github'] as const).map((key) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={sources[key]}
                onChange={(event) => setSources((prev) => ({ ...prev, [key]: event.target.checked }))}
              />
              {key}
            </label>
          ))}
        </fieldset>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What should retrieval find?"
          className="input-field"
          aria-label="Retrieval query"
          required
        />
        <button type="submit" disabled={busy} className="btn-primary">
          Retrieve
        </button>
      </form>

      {result ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Chunks</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Used: {((result.used_sources as string[]) || []).join(', ') || 'none'} · Missing:{' '}
            {((result.missing_sources as string[]) || []).join(', ') || 'none'}
          </p>
          <div className="space-y-3">
            {((result.chunks as Array<Record<string, unknown>>) || []).map((chunk, index) => (
              <article key={String(chunk.id)} className="rounded-lg border border-[var(--color-border)] bg-white/70 p-4 text-sm">
                <p className="font-medium">
                  [{index + 1}] {String(chunk.title)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  {String(chunk.source_type)} · {String(chunk.source_label)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--color-ink-muted)]">{String(chunk.text).slice(0, 500)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
