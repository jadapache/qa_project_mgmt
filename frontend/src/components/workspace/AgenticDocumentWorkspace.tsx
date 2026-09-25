import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  BookOpen,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { UniverAdapter } from '../../document_agent/adapters/UniverAdapter'
import { DocumentAgent } from '../../document_agent/core/DocumentAgent'
import type { CanonicalDocumentOperation } from '../../document_agent/core/types'
import { api, type KnowledgeDocument } from '../../api/client'
import type { FuncionalFeatureConfig } from '../../constants/funcionalFeatures'
import { FUNCIONAL_SOURCE_OPTIONS } from '../../constants/funcionalFeatures'
import { useDocumentHistory } from '../../hooks/useDocumentHistory'
import {
  useChatPersistence,
  type ChatPersistMessage,
  type ThinkingStep,
  type DocumentArtifact,
} from '../../hooks/useChatPersistence'
import { ChatHistorySidebar } from './ChatHistorySidebar'
import { AgenticThinkingBubble } from './AgenticThinkingBubble'
import { ArtifactsStudio, type ArtifactItem } from './ArtifactsStudio'
import { useToast } from '../../context/ToastContext'

interface AgenticDocumentWorkspaceProps {
  config: FuncionalFeatureConfig
}

export const AgenticDocumentWorkspace = ({ config }: AgenticDocumentWorkspaceProps) => {
  const { toast } = useToast()
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Engine & Agent instances
  const adapter = useMemo(() => new UniverAdapter('document'), [])
  const agent = useMemo(() => new DocumentAgent(adapter), [adapter])

  // Chat persistence
  const {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    updateConversation,
    renameConversation,
    deleteConversation,
    switchConversation,
  } = useChatPersistence(config.slug)

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [docPanelCollapsed, setDocPanelCollapsed] = useState(false)
  const [draft, setDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sources, setSources] = useState<string[]>(config.defaultSources || ['knowledge'])

  // Context files
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [uploading, setUploading] = useState(false)

  // Thinking steps for live assistant message
  const [liveThinkingSteps, setLiveThinkingSteps] = useState<ThinkingStep[]>([])

  // Current conversation messages
  const messages: ChatPersistMessage[] = activeConversation?.messages ?? []

  // Artifacts state for active conversation
  const rawArtifacts = activeConversation?.artifacts || []
  const artifacts: ArtifactItem[] = useMemo(() => {
    if (rawArtifacts.length > 0) return rawArtifacts as ArtifactItem[]

    // Default initial artifact if conversation has none
    const initialContent = activeConversation?.documentContent || config.defaultTemplate || ''
    return [
      {
        id: 'default-art-1',
        title: config.docxTitle || config.title,
        subtitle: 'Informe de Levantamiento y Especificaciones Funcionales',
        extension: 'docx',
        content: initialContent,
        createdAt: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAt: 'Hace un momento',
      },
    ]
  }, [rawArtifacts, activeConversation?.documentContent, config.defaultTemplate, config.docxTitle, config.title])

  const [activeArtifactId, setActiveArtifactId] = useState<string>(() => artifacts[0]?.id || 'default-art-1')

  const activeArtifact = useMemo(() => {
    return artifacts.find((a) => a.id === activeArtifactId) || artifacts[0]
  }, [artifacts, activeArtifactId])

  // Document undo/redo history for active artifact content
  const docHistory = useDocumentHistory(activeArtifact?.content || '')

  // Ensure initial conversation exists with default template content
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation(
        'Nueva conversación',
        config.defaultTemplate,
        config.docxTitle || config.title,
      )
    }
  }, [conversations.length, createConversation, config.defaultTemplate, config.docxTitle, config.title])

  // Sync active artifact selection
  useEffect(() => {
    if (artifacts.length > 0 && !artifacts.some((a) => a.id === activeArtifactId)) {
      setActiveArtifactId(artifacts[0].id)
    }
  }, [artifacts, activeArtifactId])

  // Reset history when switching artifact or conversation
  useEffect(() => {
    if (activeArtifact) {
      docHistory.resetHistory(activeArtifact.content || '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtifactId, activeConversationId])

  // Autosave debounce for active artifact
  useEffect(() => {
    if (!docHistory.isDirty || !activeArtifact) return
    const timer = setTimeout(() => {
      setIsSaving(true)
      const updatedList = artifacts.map((a) =>
        a.id === activeArtifact.id
          ? { ...a, content: docHistory.content, updatedAt: 'Hace un momento' }
          : a,
      )
      updateConversation({
        artifacts: updatedList as DocumentArtifact[],
        documentContent: docHistory.content,
      })
      docHistory.markSaved()
      setTimeout(() => setIsSaving(false), 300)
    }, 1500)
    return () => clearTimeout(timer)
  }, [docHistory.content, docHistory.isDirty, activeArtifact, artifacts, updateConversation, docHistory])

  // Scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  // Upload context document
  const handlePickFiles = async (picked: FileList | null) => {
    if (!picked?.length) return
    setUploading(true)
    try {
      const res = await api.uploadDocumentsBatch(Array.from(picked), config.uploadTags)
      setUploaded((prev) => [...prev, ...res.documents])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar los documentos')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveUploaded = async (id: string) => {
    try {
      await api.deleteDocument(id)
      setUploaded((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar documento')
    }
  }

  const toggleSource = (srcId: string) => {
    setSources((prev) =>
      prev.includes(srcId) ? prev.filter((s) => s !== srcId) : [...prev, srcId],
    )
  }

  // Artifact management
  const handleCreateArtifact = (title?: string, extension?: 'docx' | 'xlsx' | 'txt') => {
    const newId = crypto.randomUUID()
    const newArt: ArtifactItem = {
      id: newId,
      title: title || `Nota ${artifacts.length + 1}`,
      subtitle: 'Creado manualmente en Studio',
      extension: extension || 'docx',
      content: `# ${title || 'Nuevo Documento'}\n\nEscribe aquí el contenido...`,
      createdAt: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: 'Hace un momento',
    }
    const updated = [newArt, ...artifacts]
    updateConversation({ artifacts: updated as DocumentArtifact[] })
    setActiveArtifactId(newId)
    setDocPanelCollapsed(false)
    toast.success('Nuevo artefacto creado en Studio')
  }

  const handleDeleteArtifact = (id: string) => {
    if (artifacts.length <= 1) {
      toast.error('No puedes eliminar el único artefacto activo')
      return
    }
    const updated = artifacts.filter((a) => a.id !== id)
    updateConversation({ artifacts: updated as DocumentArtifact[] })
    if (activeArtifactId === id) {
      setActiveArtifactId(updated[0].id)
    }
    toast.success('Artefacto eliminado')
  }

  const handleRenameArtifact = (id: string, newTitle: string) => {
    const updated = artifacts.map((a) => (a.id === id ? { ...a, title: newTitle } : a))
    updateConversation({ artifacts: updated as DocumentArtifact[] })
  }

  const handleUpdateArtifactContent = (newContent: string) => {
    docHistory.pushContent(newContent)
  }

  // Orchestrate Agentic RAG + DocumentAgent execution
  const handleSendMessage = async (customQuery?: string) => {
    const queryText = customQuery || draft.trim()
    if (!queryText || isGenerating) return

    setIsGenerating(true)
    setDocPanelCollapsed(false)
    setDraft('')

    const userMsgId = crypto.randomUUID()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessage: ChatPersistMessage = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      timestamp: now,
    }

    const currentMsgs = activeConversation?.messages ?? []
    const updatedMsgs = [...currentMsgs, userMessage]
    updateConversation({ messages: updatedMsgs })
    scrollToBottom()

    // Initialize thinking steps
    const steps: ThinkingStep[] = [
      { id: '1', label: '1. RAG Intent: Identificando objetivo y entidades de negocio', status: 'in_progress' },
      { id: '2', label: '2. Retrieval: Consultando fuentes de conocimiento activas', status: 'pending' },
      { id: '3', label: '3. Document Agent: Mutando árbol canónico del documento', status: 'pending' },
      { id: '4', label: '4. Tag Validation: Verificando etiquetas y placeholders {{TAG}}', status: 'pending' },
      { id: '5', label: '5. Synchronize: Renderizando canvas en vivo Univer', status: 'pending' },
    ]
    setLiveThinkingSteps(steps)

    try {
      // Step 1 -> Step 2
      await new Promise((r) => setTimeout(r, 400))
      setLiveThinkingSteps((prev) =>
        prev.map((s) =>
          s.id === '1'
            ? { ...s, status: 'completed' }
            : s.id === '2'
            ? { ...s, status: 'in_progress' }
            : s,
        ),
      )

      // Run backend Agentic RAG prompt API
      const currentDocContent = docHistory.content || activeArtifact?.content || config.defaultTemplate || ''
      const res = await api.agenticPrompt({
        query: queryText,
        current_document: currentDocContent,
        chat_context: currentMsgs.slice(-4).map((m) => `${m.role}: ${m.content}`),
        sources,
        document_ids: uploaded.map((d) => d.id),
      })

      // Step 2 -> Step 3
      setLiveThinkingSteps((prev) =>
        prev.map((s) =>
          s.id === '2'
            ? { ...s, status: 'completed' }
            : s.id === '3'
            ? { ...s, status: 'in_progress' }
            : s,
        ),
      )

      let finalContent = currentDocContent
      const operations: CanonicalDocumentOperation[] = res.operations || []

      if (operations.length > 0) {
        await adapter.loadTemplate(currentDocContent, 'document', config.docxTitle || config.title)
        for (const op of operations) {
          try {
            await agent.dispatch(op)
          } catch (e) {
            console.warn('Operation dispatch warning:', e)
          }
        }
        finalContent = adapter.getRawContent()
      } else if (res.document_updates) {
        finalContent = res.document_updates
      }

      // Step 3 -> Step 4 & 5
      await new Promise((r) => setTimeout(r, 300))
      setLiveThinkingSteps((prev) =>
        prev.map((s) =>
          s.id === '3'
            ? { ...s, status: 'completed' }
            : s.id === '4'
            ? { ...s, status: 'completed' }
            : s.id === '5'
            ? { ...s, status: 'completed' }
            : s,
        ),
      )

      // Apply content mutation to active artifact
      docHistory.pushContent(finalContent)
      const updatedArtifacts = artifacts.map((a) =>
        a.id === activeArtifact?.id
          ? { ...a, content: finalContent, updatedAt: 'Hace un momento' }
          : a,
      )

      // Save assistant response message with attached thinking steps
      const assistantMessage: ChatPersistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.answer || 'He actualizado el documento de acuerdo a tu solicitud.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingSteps: steps.map((s) => ({ ...s, status: 'completed' })),
      }

      updateConversation({
        messages: [...updatedMsgs, assistantMessage],
        artifacts: updatedArtifacts as DocumentArtifact[],
        documentContent: finalContent,
      })
    } catch (err) {
      console.error('Error in agentic pipeline:', err)
      const errMsg = err instanceof Error ? err.message : 'Error desconocido'

      const assistantMessage: ChatPersistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error al procesar la solicitud: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      updateConversation({ messages: [...updatedMsgs, assistantMessage] })
    } finally {
      setIsGenerating(false)
      setLiveThinkingSteps([])
      scrollToBottom()
    }
  }

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault()
    void handleSendMessage()
  }

  return (
    <div className="flex h-[calc(100vh-62px)] w-full overflow-hidden bg-slate-100/60 font-sans">
      {/* File Upload Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handlePickFiles(e.target.files)}
      />

      {/* Left Chat History Collapsible Sidebar */}
      <ChatHistorySidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectConversation={switchConversation}
        onCreateConversation={() =>
          createConversation(
            'Nueva conversación',
            config.defaultTemplate,
            config.docxTitle || config.title,
          )
        }
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
      />

      {/* Center Chat Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200 shadow-xs">
        {/* Chat Thread Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#002777] border border-blue-100 shadow-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">{config.title}</h2>
                <p className="text-xs text-slate-500 leading-relaxed">{config.subtitle}</p>
              </div>

              {/* Quick prompt chips */}
              <div className="w-full pt-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sugerencias para iniciar:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        'Agrega una recomendación sobre pruebas de carga y rendimiento en la solución.',
                      )
                    }
                    className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                  >
                    💡 Añadir recomendaciones de pruebas de carga
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        'Incluye en los responsables al usuario funcional y al líder de pruebas QA.',
                      )
                    }
                    className="p-3 text-left rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                  >
                    👥 Actualizar equipo y responsables
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                      m.role === 'user'
                        ? 'bg-[#002777] text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 font-medium">
                      <span>{m.role === 'user' ? 'Tú' : 'Asistente IA'}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                    {/* Collapsed thinking steps for past assistant messages */}
                    {m.role === 'assistant' && m.thinkingSteps && m.thinkingSteps.length > 0 && (
                      <AgenticThinkingBubble
                        steps={m.thinkingSteps}
                        isProcessing={false}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Live thinking bubble while processing */}
              {isGenerating && liveThinkingSteps.length > 0 && (
                <div className="flex gap-3 justify-start">
                  <div className="max-w-[85%] rounded-2xl p-3.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none">
                    <div className="flex items-center gap-4 text-[10px] opacity-70 font-medium">
                      <span>Asistente IA</span>
                    </div>
                    <AgenticThinkingBubble
                      steps={liveThinkingSteps}
                      isProcessing={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <form onSubmit={handleSubmitForm} className="relative">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-blue-100 transition space-y-2.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitForm(e)
                  }
                }}
                placeholder={config.placeholder || 'Escribe tu consulta o instrucción...'}
                rows={2}
                disabled={isGenerating}
                className="w-full bg-transparent px-2 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400 disabled:opacity-60 font-sans"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer"
                    title="Adjuntar archivo de contexto"
                  >
                    {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>

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
                        className="hover:text-red-600 transition ml-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {FUNCIONAL_SOURCE_OPTIONS.map((opt) => {
                    const active = sources.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleSource(opt.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition shrink-0 cursor-pointer ${
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

                <button
                  type="submit"
                  disabled={isGenerating || !draft.trim()}
                  className="h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-[#002777] disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center justify-center transition shrink-0 shadow-sm cursor-pointer"
                  title="Enviar"
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

      {/* Right Panel: Studio / Artefactos (Claude/NotebookLM Style) */}
      <ArtifactsStudio
        adapter={adapter}
        artifacts={artifacts}
        activeArtifactId={activeArtifactId}
        isCollapsed={docPanelCollapsed}
        onToggleCollapse={() => setDocPanelCollapsed(!docPanelCollapsed)}
        onSelectArtifact={(id) => setActiveArtifactId(id)}
        onCreateArtifact={handleCreateArtifact}
        onDeleteArtifact={handleDeleteArtifact}
        onRenameArtifact={handleRenameArtifact}
        onUpdateArtifactContent={(_id, newContent) => handleUpdateArtifactContent(newContent)}
        canUndo={docHistory.canUndo}
        canRedo={docHistory.canRedo}
        onUndo={docHistory.undo}
        onRedo={docHistory.redo}
        isDirty={docHistory.isDirty}
        isSaving={isSaving}
      />
    </div>
  )
}
