import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { FileText, Paperclip, Send, Trash2, Upload, X } from 'lucide-react'
import { api, type GroundedResult, type KnowledgeDocument } from '../api/client'
import { GroundedResultView } from './StandupPage'

const SOURCE_OPTIONS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'knowledge', label: 'Product docs / PRDs' },
]

const ACCEPT = '.pdf,.docx,.md,.txt,.json'

export const AskProductPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(['knowledge', 'jira', 'github'])
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [result, setResult] = useState<GroundedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  const documentIds = uploaded.map((doc) => doc.id)

  const handlePickFiles = (picked: FileList | null) => {
    if (!picked?.length) return
    setFiles((prev) => {
      const names = new Set(prev.map((file) => file.name))
      const next = [...prev]
      for (const file of Array.from(picked)) {
        if (!names.has(file.name)) next.push(file)
      }
      return next
    })
  }

  const handleUpload = async () => {
    if (!files.length) {
      setError('Select one or more files first.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const response = await api.uploadDocumentsBatch(files, 'ask_product,product')
      setUploaded((prev) => [...prev, ...response.documents])
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (response.errors.length) {
        setError(`Some files failed: ${response.errors.join('; ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveUploaded = async (id: string) => {
    try {
      await api.deleteDocument(id)
      setUploaded((prev) => prev.filter((doc) => doc.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove file')
    }
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!selected.length) {
      setError('Select at least one source.')
      return
    }
    if (!query.trim() && !documentIds.length) {
      setError('Type a question and/or upload files.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.askProduct({
        query: query.trim() || 'Answer using the uploaded documents and connected sources.',
        sources: selected,
        document_ids: documentIds,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed')
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">Knowledge</p>
        <h1 className="page-title">Ask My Product</h1>
        <p className="page-subtitle max-w-3xl">
          Upload multiple docs, toggle live sources, and ask questions — answers cite evidence or refuse clearly.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-bad)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-violet-600" aria-hidden />
            <h2 className="text-lg font-semibold">Upload files (optional)</h2>
          </div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 transition-colors hover:border-violet-400 hover:bg-violet-50/70"
            tabIndex={0}
            aria-label="Choose files to upload"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
            }}
          >
            <Upload className="mb-2 h-7 w-7 text-violet-500" aria-hidden />
            <span className="text-sm font-medium text-violet-700">Drop files or click to browse</span>
            <span className="mt-1 text-xs text-[var(--color-ink-muted)]">Multiple files supported</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => handlePickFiles(event.target.files)}
            />
          </label>

          {files.length ? (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    {file.name}
                  </span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((prev) => prev.filter((f) => f.name !== file.name))}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {files.length ? (
            <button type="button" onClick={() => void handleUpload()} disabled={uploading} className="btn-primary w-full disabled:opacity-50">
              {uploading ? 'Uploading…' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
            </button>
          ) : null}

          {uploaded.length ? (
            <ul className="space-y-2 border-t border-[var(--color-border)] pt-3">
              {uploaded.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm">
                  <span className="truncate">{doc.filename}</span>
                  <button type="button" aria-label={`Remove ${doc.filename}`} onClick={() => void handleRemoveUploaded(doc.id)}>
                    <Trash2 className="h-4 w-4 text-[var(--color-ink-muted)] hover:text-[var(--color-bad)]" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <form onSubmit={(event) => void handleSubmit(event)} className="card space-y-4">
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="mb-2 w-full text-sm font-semibold">Sources for this question</legend>
            {SOURCE_OPTIONS.map((option) => (
              <label key={option.id} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={(event) => {
                    setSelected((prev) =>
                      event.target.checked ? [...prev, option.id] : prev.filter((item) => item !== option.id),
                    )
                  }}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            className="input-field w-full resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2"
            placeholder="Why can't a receptionist edit the primary doctor?"
            aria-label="Product question"
          />

          <button type="submit" disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" aria-hidden />
            {busy ? 'Searching…' : 'Ask'}
          </button>
        </form>
      </div>

      {result ? <GroundedResultView result={result} /> : null}
    </div>
  )
}
