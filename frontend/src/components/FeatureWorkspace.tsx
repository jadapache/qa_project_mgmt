import type { FormEvent, KeyboardEvent } from 'react'
import { useRef, useState } from 'react'
import { FileText, Paperclip, Send, Trash2, Upload, X } from 'lucide-react'
import { api, type GroundedResult, type KnowledgeDocument } from '../api/client'
import { GroundedResultView } from '../pages/StandupPage'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type SourceOption = {
  id: string
  label: string
}

type FeatureWorkspaceProps = {
  eyebrow: string
  title: string
  description: string
  uploadTags: string
  placeholder: string
  defaultQuery: string
  showSourceToggles?: boolean
  sourceOptions?: SourceOption[]
  defaultSources?: string[]
  onRun: (payload: {
    query: string
    documentIds: string[]
    chatContext: string
    sources: string[]
  }) => Promise<GroundedResult>
}

const ACCEPT = '.pdf,.docx,.md,.txt,.json'

export const FeatureWorkspace = ({
  eyebrow,
  title,
  description,
  uploadTags,
  placeholder,
  defaultQuery,
  showSourceToggles = false,
  sourceOptions = [],
  defaultSources = [],
  onRun,
}: FeatureWorkspaceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [selectedSources, setSelectedSources] = useState<string[]>(defaultSources)
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

  const handleRemovePending = (name: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== name))
  }

  const handleRemoveUploaded = async (id: string) => {
    setError(null)
    try {
      await api.deleteDocument(id)
      setUploaded((prev) => prev.filter((doc) => doc.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove file')
    }
  }

  const handleUpload = async () => {
    if (!files.length) {
      setError('Select one or more files to upload.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const response = await api.uploadDocumentsBatch(files, uploadTags)
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

  const buildChatContext = (extra?: string) => {
    const lines = messages.map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    if (extra?.trim()) lines.push(`User: ${extra.trim()}`)
    return lines.join('\n')
  }

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text && !documentIds.length) {
      setError('Upload files and/or type instructions in the chat.')
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || defaultQuery,
    }
    const nextMessages = text ? [...messages, userMessage] : messages
    if (text) setMessages(nextMessages)
    setDraft('')
    setBusy(true)
    setError(null)
    setResult(null)

    try {
      const data = await onRun({
        query: text || defaultQuery,
        documentIds,
        chatContext: buildChatContext(),
        sources: selectedSources,
      })
      setResult(data)
      if (data.answer) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: data.answer ?? '' },
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
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
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle max-w-3xl">{description}</p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-bad)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Files panel */}
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-violet-600" aria-hidden />
            <h2 className="text-lg font-semibold">Upload files</h2>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Select multiple PRDs, specs, or change docs at once. PDF, DOCX, MD, TXT supported.
          </p>

          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-4 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50/70"
            tabIndex={0}
            aria-label="Choose files to upload"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-violet-500" aria-hidden />
            <span className="text-sm font-medium text-violet-700">Drop files or click to browse</span>
            <span className="mt-1 text-xs text-[var(--color-ink-muted)]">Multiple files allowed</span>
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
                <li
                  key={file.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-bad)]"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => handleRemovePending(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {files.length ? (
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
            </button>
          ) : null}

          {uploaded.length ? (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Ready ({uploaded.length})
              </p>
              <ul className="space-y-2">
                {uploaded.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{doc.filename}</span>
                    <button
                      type="button"
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-bad)]"
                      aria-label={`Remove ${doc.filename}`}
                      onClick={() => void handleRemoveUploaded(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Chat panel */}
        <section className="card flex min-h-[420px] flex-col">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-violet-600" aria-hidden />
            <h2 className="text-lg font-semibold">Context chat</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Add instructions, constraints, or questions. Press Enter to send, Shift+Enter for a new line.
          </p>

          {showSourceToggles && sourceOptions.length ? (
            <fieldset className="mt-4 flex flex-wrap gap-3 text-sm">
              <legend className="mb-1 w-full text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Live sources
              </legend>
              {sourceOptions.map((option) => (
                <label key={option.id} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(option.id)}
                    onChange={(event) => {
                      setSelectedSources((prev) =>
                        event.target.checked
                          ? [...prev, option.id]
                          : prev.filter((item) => item !== option.id),
                      )
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                Example: &ldquo;{placeholder}&rdquo;
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={[
                    'max-w-[95%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'ml-auto bg-violet-600 text-white'
                      : 'mr-auto border border-[var(--color-border)] bg-white text-[var(--color-ink)]',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
              ))
            )}
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 flex gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={placeholder}
              className="input-field min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2"
              aria-label="Chat message"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex shrink-0 items-center gap-2 self-end px-4 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden />
              {busy ? '…' : 'Send'}
            </button>
          </form>
        </section>
      </div>

      {result ? <GroundedResultView result={result} /> : null}
    </div>
  )
}
