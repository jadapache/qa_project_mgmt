import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from 'lucide-react'
import { api, type GroundedResult, type KnowledgeDocument } from '../../api/client'
import type { FuncionalFeatureConfig } from '../../constants/funcionalFeatures'
import { FUNCIONAL_SOURCE_OPTIONS } from '../../constants/funcionalFeatures'
import { useToast } from '../../context/ToastContext'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface GroundedChatWorkspaceProps {
  config: FuncionalFeatureConfig
  eyebrow?: string
}

export const GroundedChatWorkspace = ({
  config,
  eyebrow = 'FUNCIONAL TOOLS',
}: GroundedChatWorkspaceProps) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // State
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sources, setSources] = useState<string[]>(config.defaultSources || ['knowledge'])
  const [documentContent, setDocumentContent] = useState<string>(config.defaultTemplate || '')

  // UI Panels state - Right panel is ONLY visible after first AI generation / submit
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const documentIds = uploaded.map((d) => d.id)

  const handlePickFiles = async (picked: FileList | null) => {
    if (!picked?.length) return
    const fileList = Array.from(picked)
    setUploading(true)
    setError(null)
    try {
      const res = await api.uploadDocumentsBatch(fileList, config.uploadTags)
      setUploaded((prev) => [...prev, ...res.documents])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (res.errors.length) {
        toast.error(`Error al cargar archivos: ${res.errors.join('; ')}`)
      } else {
        toast.success(`${res.documents.length} archivo(s) cargado(s) al contexto`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los documentos'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveUploaded = async (id: string) => {
    try {
      await api.deleteDocument(id)
      setUploaded((prev) => prev.filter((d) => d.id !== id))
      toast.success('Documento removido del contexto')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar documento'
      toast.error(msg)
    }
  }

  const toggleSource = (srcId: string) => {
    setSources((prev) =>
      prev.includes(srcId) ? prev.filter((s) => s !== srcId) : [...prev, srcId],
    )
  }

  const handleGenerate = async (customQuery?: string) => {
    const queryText = customQuery || draft.trim() || config.defaultQuery
    if (!queryText) return

    setIsGenerating(true)
    setIsPanelOpen(true) // Display right panel ONLY when AI generation is triggered
    setError(null)

    const userMsgId = crypto.randomUUID()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: queryText, timestamp: now },
    ]
    setMessages(updatedMessages)
    setDraft('')

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    const chatContext = updatedMessages
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n')

    try {
      const result: GroundedResult = await config.runApi({
        query: queryText,
        document_ids: documentIds,
        chat_context: chatContext,
        sources,
      })

      if (result.answer) {
        setDocumentContent(result.answer)
        const assistantMsgId = crypto.randomUUID()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: 'He procesado tu solicitud e integrado los cambios en el documento.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        toast.success('¡Documento generado exitosamente!')
      } else if (result.refused) {
        const msg = result.reason || 'No se pudo generar el documento con el contexto actual.'
        setError(msg)
        toast.error(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim() && !documentIds.length) return
    handleGenerate()
  }

  const handleCopyContent = () => {
    if (!documentContent) return
    navigator.clipboard.writeText(documentContent)
    setCopied(true)
    toast.success('Contenido copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportDocx = async () => {
    if (!documentContent.trim()) {
      toast.error('El documento está vacío')
      return
    }
    setExporting(true)
    try {
      const title = config.docxTitle || config.title
      const blob = await api.exportMejorasDocx(documentContent, title)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = `${config.exportFilenamePrefix || 'Documento'}_${new Date().toISOString().slice(0, 10)}.docx`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Documento guardado en .docx')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al exportar archivo .docx'
      toast.error(msg)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header matching QaFeaturePage / Image 1 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">{config.title}</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{config.subtitle}</p>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="flex gap-6 items-start">
        {/* Left Side: AI Chat UI (Image 2 style) */}
        <div
          className={`flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ${
            isPanelOpen ? 'w-full lg:w-1/2 min-h-[580px]' : 'w-full max-w-4xl mx-auto min-h-[580px]'
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.md,.txt,.json"
            className="hidden"
            onChange={(e) => handlePickFiles(e.target.files)}
          />

          {/* Chat Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[520px]">
            {messages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <p className="text-sm font-medium text-slate-600">
                  Escribe tu consulta o requerimiento para comenzar a construir el documento.
                </p>
                <p className="text-xs text-slate-400">
                  Puedes adjuntar archivos de contexto usando el botón (+) o activar las fuentes en la parte inferior.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1 ${
                      m.role === 'user'
                        ? 'bg-[#002777] text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 font-medium">
                      <span>{m.role === 'user' ? 'Tú' : 'Asistente IA'}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {error && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="underline font-semibold">
                Cerrar
              </button>
            </div>
          )}

          {/* Chat Input Pill Bar (Exact styling matching Image 2) */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form onSubmit={handleSubmitForm} className="relative">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-blue-100 transition space-y-3">
                {/* Textarea Input */}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitForm(e)
                    }
                  }}
                  placeholder={config.placeholder || 'Escribe tu consulta...'}
                  rows={2}
                  className="w-full bg-transparent px-2 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400"
                />

                {/* Bottom Row inside Pill Bar: + Button, Badges, Send Arrow */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                  {/* Left Controls: (+) Attachment & Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* (+) Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0"
                      title="Adjuntar archivo de contexto (+)"
                    >
                      {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </button>

                    {/* Uploaded Documents Badges */}
                    {uploaded.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1 bg-blue-50 text-[#002777] border border-blue-200/70 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
                      >
                        <FileText className="h-3 w-3 text-[#002777]" />
                        <span className="truncate max-w-[120px]">{doc.filename}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploaded(doc.id)}
                          className="hover:text-red-600 transition ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}

                    {/* Context Source Badges (Toggleable) */}
                    {FUNCIONAL_SOURCE_OPTIONS.map((opt) => {
                      const active = sources.includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleSource(opt.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition shrink-0 ${
                            active
                              ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                          }`}
                        >
                          <BookOpen className="h-3 w-3 text-slate-500" />
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Right Side: Circular Black/Dark Send Arrow Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || (!draft.trim() && !documentIds.length)}
                    className="h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-[#002777] disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center justify-center transition shrink-0 shadow-sm"
                    title="Enviar petición"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Meetily-Style Generated Document Panel (ONLY shown after generation) */}
        {isPanelOpen && (
          <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm min-h-[580px] overflow-hidden animate-fadeIn">
            {/* Top Toolbar (Meetily style) */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#002777]" />
                  Documento Generado
                </span>
                {isGenerating && (
                  <span className="text-xs text-blue-700 animate-pulse font-medium">Generando...</span>
                )}
              </div>

              {/* Action Buttons (Meetily image 2 style) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 border-slate-200 text-slate-700 hover:bg-white"
                  title="Regenerar documento"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#002777]" />
                  <span>Regenerar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 border-slate-200 text-slate-700 hover:bg-white"
                  title="Copiar contenido"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={exporting || !documentContent.trim()}
                  className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1 shadow-sm"
                  title="Guardar archivo .docx"
                >
                  {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Guardar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition ml-1"
                  title="Cerrar panel del documento"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Content Canvas (Direct Live Editing) */}
            <div className="flex-1 p-5 overflow-y-auto bg-white">
              {isGenerating ? (
                /* Skeleton Loader */
                <div className="space-y-4 animate-pulse p-4">
                  <div className="h-6 bg-slate-200 rounded-lg w-2/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="space-y-2 pt-4">
                    <div className="h-3.5 bg-slate-100 rounded w-full" />
                    <div className="h-3.5 bg-slate-100 rounded w-5/6" />
                    <div className="h-3.5 bg-slate-100 rounded w-4/5" />
                  </div>
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                    <div className="h-20 bg-slate-100 rounded-xl w-full" />
                  </div>
                </div>
              ) : (
                /* Live Editable Textarea */
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="El documento generado aparecerá aquí..."
                  className="w-full h-full min-h-[480px] p-2 bg-transparent font-sans text-xs text-slate-800 leading-relaxed outline-none resize-y"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
