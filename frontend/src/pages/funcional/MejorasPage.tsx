import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import {
  Download,
  FileCode,
  FileEdit,
  FileText,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { api, type GroundedResult, type KnowledgeDocument } from '../../api/client'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_DOC_TEMPLATE = `## **FORMATO DOCUMENTACIÓN DE MEJORAS**

**_Objetivo del Formato:_** _Registrar de manera estructurada las necesidades funcionales, oportunidades de mejora y nuevos requerimientos identificados por los usuarios funcionales del proyecto, con el fin de facilitar su análisis, evaluación, priorización y definición por parte del equipo del proyecto para su posible incorporación en el nuevo Sistema de Información_ 

**_Código Requerimiento:_** M-01

| Fecha: ${new Date().toLocaleDateString('es-ES')} | Módulo/Funcionalidad: |
| -------------------------------------- | ------------------------ |
| Sede(s): HIC / ICV / IMAP              | Área(s):                 |

# Necesidad identificada

**Describe ¿Cómo funciona actualmente?** (incluye pantallas) 
*Describe detalladamente el funcionamiento actual, las pantallas involucradas y las limitaciones identificadas.*

**Impacto para el negocio (en tiempo, costos, reprocesos, etc)** 
*Detalla el impacto operacional, cuantitativo o cualitativo para la organización.*

**¿Cómo le gustaría que funcionara en el nuevo sistema?** 
*Describe el requerimiento funcional deseado, flujo esperado y comportamiento esperado.*

**Prioridad**
[Alta / Media / Baja]

**Observaciones complementarias o recomendaciones a tener en cuenta**
*Casos de borde, restricciones o consideraciones especiales.*

**Observaciones del Equipo del Proyecto**
*Evaluación técnica y observaciones por parte del equipo de desarrollo y QA.*

# Firma Participantes o Aprobadores

| **Nombre** | **Cargo** | **Sede** | **Rol** | **Aprobación** |
| ---------- | --------- | -------- | ------- | -------------- |
|            |           |          |         |                |

_Formato Elaborado por: Ing María Eugenia Gutiérrez - Jefe Corporativo de Proyectos de Software_
`

export const MejorasPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sources, setSources] = useState<string[]>(['jira', 'github', 'gitlab', 'knowledge'])
  const [documentContent, setDocumentContent] = useState<string>(DEFAULT_DOC_TEMPLATE)
  const [editorMode, setEditorMode] = useState<'preview' | 'edit'>('preview')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const documentIds = uploaded.map((d) => d.id)

  const handlePickFiles = (picked: FileList | null) => {
    if (!picked?.length) return
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      const next = [...prev]
      for (const file of Array.from(picked)) {
        if (!names.has(file.name)) next.push(file)
      }
      return next
    })
  }

  const handleRemovePending = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const handleRemoveUploaded = async (id: string) => {
    try {
      await api.deleteDocument(id)
      setUploaded((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar documento')
    }
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const res = await api.uploadDocumentsBatch(files, 'mejoras_doc')
      setUploaded((prev) => [...prev, ...res.documents])
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (res.errors.length) {
        setError(`Ocurrieron errores al cargar algunos archivos: ${res.errors.join('; ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los documentos')
    } finally {
      setUploading(false)
    }
  }

  const toggleSource = (src: string) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    )
  }

  const handleGenerate = async (customInstruction?: string) => {
    const queryText = customInstruction || draft || 'Genera el Documento de Mejora detallado basado en la información recopilada.'
    setBusy(true)
    setError(null)
    setSuccessMsg(null)

    const chatContext = messages
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n')

    try {
      const result: GroundedResult = await api.runMejoras({
        query: queryText,
        document_ids: documentIds,
        chat_context: chatContext,
        sources,
      })

      if (result.answer) {
        setDocumentContent(result.answer)
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'user', content: queryText },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'He actualizado el Documento de Mejora con la evidencia recopilada.',
          },
        ])
        setDraft('')
        setSuccessMsg('¡Documento de Mejora actualizado con éxito!')
      } else if (result.refused) {
        setError(result.reason || 'No se pudo generar el documento con la evidencia actual.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el documento')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    handleGenerate(draft.trim())
  }

  const handleDownloadDocx = async () => {
    if (!documentContent.trim()) {
      setError('El documento está vacío.')
      return
    }
    setExporting(true)
    setError(null)
    try {
      const blob = await api.exportMejorasDocx(documentContent, 'Documento de Mejora y Requerimientos Funcionales')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Documento_de_Mejora_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el archivo .docx')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
            Módulo Funcional
          </p>
          <h1 className="page-title mt-1">Generador de Documento de Mejoras</h1>
          <p className="page-subtitle">
            Crea y mantiene un Documento de Mejora corporativo en vivo, alimentado por Q&A de usuarios, especificaciones e integraciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={exporting || !documentContent.trim()}
            className="btn btn-primary flex items-center gap-2 shadow-md shadow-violet-200"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Exportar a .docx</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-xs underline font-medium">
            Descartar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Chat & Context | Right Document Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left Column: Context & Chat (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* File Upload & Knowledge Sources */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-violet-600" />
              1. Documentos y Evidencias de Contexto
            </h2>

            <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.md,.txt,.json"
                className="hidden"
                onChange={(e) => handlePickFiles(e.target.files)}
              />
              <p className="text-xs text-[var(--color-ink-muted)]">
                Adjunta minutas de reunión, Q&A con usuarios finales o especificaciones
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                Seleccionar Archivos
              </button>
            </div>

            {/* Pending files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--color-ink-muted)]">Archivos listos para cargar:</p>
                {files.map((file) => (
                  <div key={file.name} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-xs">
                    <span className="truncate font-medium text-slate-700">{file.name}</span>
                    <button type="button" onClick={() => handleRemovePending(file.name)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full btn btn-secondary text-xs py-1.5 flex justify-center items-center gap-2"
                >
                  {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Cargar Archivos al Contexto
                </button>
              </div>
            )}

            {/* Uploaded files list */}
            {uploaded.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--color-ink-muted)]">Evidencias Cargadas ({uploaded.length}):</p>
                {uploaded.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs border border-violet-100">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                      <span className="truncate font-medium text-violet-900">{doc.filename}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveUploaded(doc.id)} className="text-violet-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Source check boxes */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-ink-muted)] mb-2">Fuentes Conectadas:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'jira', label: 'Jira' },
                  { id: 'github', label: 'GitHub' },
                  { id: 'gitlab', label: 'GitLab' },
                  { id: 'knowledge', label: 'Biblioteca' },
                ].map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-xs text-[var(--color-ink)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sources.includes(s.id)}
                      onChange={() => toggleSource(s.id)}
                      className="rounded text-violet-600 focus:ring-violet-500"
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Chat Stream & Inputs */}
          <section className="card p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center justify-between">
              <span>2. Interacción y Refinamiento</span>
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={busy}
                className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy ? 'Generando...' : 'Generar / Actualizar con AI'}
              </button>
            </h2>

            {/* Chat History */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 ? (
                <p className="text-xs italic text-[var(--color-ink-muted)] text-center py-4">
                  Sin interacciones previas. Escribe preguntas o indicaciones para complementar el documento.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-xs ${
                      m.role === 'user'
                        ? 'bg-violet-600 text-white ml-6'
                        : 'bg-slate-100 text-slate-800 mr-6 border border-slate-200'
                    }`}
                  >
                    <p className="font-semibold text-[10px] opacity-80 mb-0.5">
                      {m.role === 'user' ? 'TÚ' : 'ASISTENTE FUNCIONAL'}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitForm} className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ej: Añade criterios de aceptación para el módulo de notificaciones o especifica que el reporte debe filtrarse por fecha..."
                rows={3}
                className="w-full rounded-xl border border-[var(--color-border)] p-3 text-xs text-[var(--color-ink)] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  Shift+Enter para salto de línea
                </span>
                <button
                  type="submit"
                  disabled={busy || (!draft.trim() && !documentIds.length)}
                  className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Enviar e Integrar</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Side-by-side Document Editor/Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-0 overflow-hidden border border-violet-200/80 shadow-xl shadow-violet-100/40">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-bold text-[var(--color-ink)]">
                  Vista Previa / Editor del Documento
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                      editorMode === 'preview'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Vista Previa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                      editorMode === 'edit'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    Editar Markdown
                  </button>
                </div>
              </div>
            </div>

            {/* Document Body Area */}
            <div className="p-6 bg-white min-h-[500px]">
              {editorMode === 'edit' ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Edita libremente el Markdown del Documento de Mejora. Los cambios se reflejarán directamente al exportar a .docx.
                  </p>
                  <textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    rows={22}
                    className="w-full rounded-xl border border-slate-300 p-4 font-mono text-xs text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none leading-relaxed"
                  />
                </div>
              ) : (
                <div className="prose prose-slate max-w-none prose-headings:text-violet-950 prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-li:text-xs text-xs">
                  {/* Styled Rendered Markdown Preview */}
                  <div className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed space-y-3">
                    {documentContent.split('\n').map((line, idx) => {
                      const trimmed = line.trim()
                      if (trimmed.startsWith('# ')) {
                        return (
                          <h1 key={idx} className="text-xl font-bold text-violet-900 border-b border-violet-100 pb-2 mt-4">
                            {trimmed.slice(2)}
                          </h1>
                        )
                      }
                      if (trimmed.startsWith('## ')) {
                        return (
                          <h2 key={idx} className="text-base font-bold text-violet-800 mt-4 mb-1">
                            {trimmed.slice(3)}
                          </h2>
                        )
                      }
                      if (trimmed.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-sm font-semibold text-slate-900 mt-3 mb-1">
                            {trimmed.slice(4)}
                          </h3>
                        )
                      }
                      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                        return (
                          <li key={idx} className="ml-4 list-disc text-slate-700 my-0.5">
                            {trimmed.slice(2)}
                          </li>
                        )
                      }
                      if (!trimmed) {
                        return <div key={idx} className="h-1" />
                      }
                      return (
                        <p key={idx} className="text-slate-700 my-1">
                          {trimmed}
                        </p>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
