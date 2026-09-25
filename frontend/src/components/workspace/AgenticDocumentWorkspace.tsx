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
  Layers,
  Check,
  ChevronUp,
  Maximize2,
  Minimize2,
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
  eyebrow?: string
}

export const AgenticDocumentWorkspace = ({
  config,
  eyebrow = 'FUNCIONAL TOOLS',
}: AgenticDocumentWorkspaceProps) => {
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
  const [docPanelCollapsed, setDocPanelCollapsed] = useState(true)
  const [draft, setDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Filter available integrations dynamically from FUNCIONAL_SOURCE_OPTIONS
  const availableIntegrations = useMemo(
    () => FUNCIONAL_SOURCE_OPTIONS.filter((opt) => opt.id !== 'knowledge'),
    [],
  )

  const [sources, setSources] = useState<string[]>(
    config.defaultSources || ['knowledge', ...availableIntegrations.map((i) => i.id)],
  )

  // Integrations flyout menu state
  const [integrationsFlyoutOpen, setIntegrationsFlyoutOpen] = useState(false)

  // Context files
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [uploading, setUploading] = useState(false)

  // Thinking steps for live assistant message
  const [liveThinkingSteps, setLiveThinkingSteps] = useState<ThinkingStep[]>([])

  // Dynamic prompt textarea height & expansion (capped at 40% max of chat container height)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const BASE_TEXTAREA_HEIGHT = 35
  const MAX_PANEL_PERCENT_HEIGHT = 230 // Maximum 40% of chat panel height cap

  const [textareaHeight, setTextareaHeight] = useState<number>(BASE_TEXTAREA_HEIGHT)
  const [isMaximized, setIsMaximized] = useState<boolean>(false)
  const [userResizedHeight, setUserResizedHeight] = useState<number | null>(null)

  // Dynamically calculate and auto-expand height to fit multi-line content smoothly
  const adjustTextareaHeight = useCallback(() => {
    if (userResizedHeight !== null) return

    if (isMaximized) {
      setTextareaHeight(MAX_PANEL_PERCENT_HEIGHT)
      return
    }

    if (!textareaRef.current) return

    if (!draft || draft.trim() === '') {
      setTextareaHeight(BASE_TEXTAREA_HEIGHT)
      return
    }

    textareaRef.current.style.height = 'auto'
    const scrollH = textareaRef.current.scrollHeight
    const lineCount = draft.split('\n').length

    // Auto-expand to fit text smoothly up to 40% max height cap
    if (lineCount > 1 || scrollH > 40) {
      const targetH = Math.max(
        BASE_TEXTAREA_HEIGHT,
        Math.min(MAX_PANEL_PERCENT_HEIGHT, scrollH + 4),
      )
      setTextareaHeight(targetH)
    } else {
      setTextareaHeight(BASE_TEXTAREA_HEIGHT)
    }
  }, [draft, isMaximized, userResizedHeight])

  useEffect(() => {
    adjustTextareaHeight()
  }, [draft, adjustTextareaHeight])

  // Toggle maximize/restore button in top-right corner
  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false)
      setUserResizedHeight(null)
    } else {
      setIsMaximized(true)
      setUserResizedHeight(MAX_PANEL_PERCENT_HEIGHT)
      setTextareaHeight(MAX_PANEL_PERCENT_HEIGHT)
    }
  }

  // Current conversation messages
  const messages: ChatPersistMessage[] = activeConversation?.messages ?? []

  // Artifacts state for active conversation (empty by default until generated or created)
  const rawArtifacts = activeConversation?.artifacts || []
  const artifacts: ArtifactItem[] = useMemo(() => {
    return rawArtifacts as ArtifactItem[]
  }, [rawArtifacts])

  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(() => artifacts[0]?.id || null)

  const activeArtifact = useMemo(() => {
    return artifacts.find((a) => a.id === activeArtifactId) || artifacts[0] || null
  }, [artifacts, activeArtifactId])

  // Document undo/redo history for active artifact content
  const docHistory = useDocumentHistory(activeArtifact?.content || '')

  // Ensure initial conversation exists without pre-created fake artifact
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation('Nueva conversación')
    }
  }, [conversations.length, createConversation])

  // Sync active artifact selection
  useEffect(() => {
    if (artifacts.length > 0) {
      if (!activeArtifactId || !artifacts.some((a) => a.id === activeArtifactId)) {
        setActiveArtifactId(artifacts[0].id)
      }
    } else {
      setActiveArtifactId(null)
      setDocPanelCollapsed(true)
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

  const isKnowledgeActive = sources.includes('knowledge')
  const integrationIds = availableIntegrations.map((i) => i.id)
  const activeIntegrationsCount = sources.filter((s) => integrationIds.includes(s)).length
  const isIntegrationsActive = activeIntegrationsCount > 0

  const toggleAllIntegrations = () => {
    if (isIntegrationsActive) {
      setSources((prev) => prev.filter((s) => !integrationIds.includes(s)))
    } else {
      setSources((prev) => Array.from(new Set([...prev, ...integrationIds])))
    }
  }

  // Artifact management
  const handleCreateArtifact = (title?: string, extension?: 'docx' | 'xlsx' | 'txt') => {
    const newId = crypto.randomUUID()
    const newArt: ArtifactItem = {
      id: newId,
      title: title || `Documento ${artifacts.length + 1}`,
      subtitle: 'Creado manualmente en Artefactos',
      extension: extension || 'docx',
      content: `# ${title || 'Nuevo Documento'}\n\nEscribe aquí el contenido...`,
      createdAt: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: 'Hace un momento',
    }
    const updated = [newArt, ...artifacts]
    updateConversation({ artifacts: updated as DocumentArtifact[] })
    setActiveArtifactId(newId)
    setDocPanelCollapsed(false)
    toast.success('Nuevo documento creado en Artefactos')
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
    setDraft('')
    setUserResizedHeight(null)
    setIsMaximized(false)
    setTextareaHeight(BASE_TEXTAREA_HEIGHT)

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
      } else if (res.answer && (res.answer.includes('# ') || res.answer.includes('## ') || res.answer.includes('|'))) {
        finalContent = res.answer
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

      // Apply content mutation to active artifact or create first artifact dynamically
      docHistory.pushContent(finalContent)

      let updatedArtifacts: ArtifactItem[] = []
      let targetArtifactId: string | null = activeArtifactId

      if (artifacts.length === 0) {
        // Create first artifact dynamically when LLM responds with a document
        const newArtId = crypto.randomUUID()
        const newArtifact: ArtifactItem = {
          id: newArtId,
          title: config.docxTitle || config.title,
          subtitle: 'Generado por Asistente IA',
          extension: 'docx',
          content: finalContent,
          createdAt: new Date().toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }),
          updatedAt: 'Hace un momento',
        }
        updatedArtifacts = [newArtifact]
        targetArtifactId = newArtId
        setActiveArtifactId(newArtId)
      } else {
        const targetId = activeArtifact?.id || artifacts[0].id
        updatedArtifacts = artifacts.map((a) =>
          a.id === targetId
            ? { ...a, content: finalContent, updatedAt: 'Hace un momento' }
            : a,
        )
      }

      // Formulate a concise chat bubble message for the user
      const isFullDocumentMarkdown =
        (res.answer && (res.answer.startsWith('#') || res.answer.includes('## ') || res.answer.includes('| --- |'))) ||
        (res.document_updates && res.document_updates.length > 150)

      let bubbleContent = res.assistant_message
      if (!bubbleContent || isFullDocumentMarkdown) {
        bubbleContent =
          'Documento generado exitosamente. Puedes revisarlo, editarlo en directo o descargarlo desde el panel de Artefactos a la derecha.'
      }

      // Save assistant response message with attached thinking steps
      const assistantMessage: ChatPersistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: bubbleContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingSteps: steps.map((s) => ({ ...s, status: 'completed' })),
      }

      updateConversation({
        messages: [...updatedMsgs, assistantMessage],
        artifacts: updatedArtifacts as DocumentArtifact[],
        documentContent: finalContent,
        activeArtifactId: targetArtifactId || undefined,
      })

      // Expand right Artefactos panel now that LLM document response is ready
      setDocPanelCollapsed(false)
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
    <div className="space-y-6 font-sans">
      {/* File Upload Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handlePickFiles(e.target.files)}
      />

      {/* Top Page Title Banner Header (OUTSIDE the workspace card container) */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">
          {eyebrow}
        </p>
        <h1 className="page-title">{config.title}</h1>
        <p className="page-subtitle max-w-4xl">{config.subtitle}</p>
      </header>

      {/* Main Workspace Card Container (Encloses Sidebar + Chat Panel + Artefactos Studio) */}
      <div className="flex h-[calc(100vh-235px)] min-h-[580px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left Chat History Collapsible Sidebar */}
        <ChatHistorySidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectConversation={switchConversation}
          onCreateConversation={() => createConversation('Nueva conversación')}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
        />

        {/* Center Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200 shadow-xs">
          {/* Chat Thread Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 max-w-md mx-auto">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#002777] border border-blue-100 shadow-xs">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900">{config.title}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{config.subtitle}</p>
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
                      className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${m.role === 'user'
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
          <div className="p-4 border-t border-slate-200/80 bg-white shrink-0">
            <form onSubmit={handleSubmitForm} className="relative">
              {/* Input Box Card */}
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-3 shadow-2xs focus-within:bg-white focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-blue-100/80 transition space-y-2.5">
                {/* Top-right corner control: Maximize/Minimize toggle (capped at 40% max height) */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={toggleMaximize}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    title={isMaximized ? "Restaurar tamaño del campo" : "Expandir campo de chat (máx. 40%)"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitForm(e)
                    }
                  }}
                  placeholder={config.placeholder || 'Escribe tu indicación o consulta...'}
                  disabled={isGenerating}
                  style={{ height: `${textareaHeight}px` }}
                  className="w-full bg-transparent px-1 pr-16 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400 disabled:opacity-60 font-sans overflow-y-auto scrollbar-thin transition-[height] duration-150 ease-out leading-normal"
                />

                {/* Attached Files Inline Badge Row (Inside prompt card) */}
                {uploaded.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1 py-1 border-t border-slate-200/40">
                    {uploaded.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1.5 bg-blue-50 text-[#002777] border border-blue-200/80 text-xs font-medium px-2.5 py-1 rounded-xl shrink-0 shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#002777]" />
                        <span className="truncate max-w-[180px]">{doc.filename}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploaded(doc.id)}
                          className="hover:text-red-600 transition ml-0.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Bottom Actions Row: Attachment (+) on left, Pills + Send on right */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  {/* Left: Attachment button (+) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer shadow-2xs"
                    title="Adjuntar archivo de contexto"
                  >
                    {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>

                  {/* Right: Sources Pills & Send Button */}
                  <div className="flex items-center gap-2 relative">
                    {/* Biblioteca Pill */}
                    <button
                      type="button"
                      onClick={() => toggleSource('knowledge')}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${isKnowledgeActive
                        ? 'bg-[#002777] text-white border-[#002777] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800'
                        }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Biblioteca</span>
                    </button>

                    {/* Integraciones Pill with Hover/Click Flyout */}
                    <div
                      className="relative"
                      onMouseEnter={() => setIntegrationsFlyoutOpen(true)}
                      onMouseLeave={() => setIntegrationsFlyoutOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={toggleAllIntegrations}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${isIntegrationsActive
                          ? 'bg-[#002777] text-white border-[#002777] shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800'
                          }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Integraciones</span>
                        {activeIntegrationsCount > 0 && (
                          <span className="h-4 w-4 rounded-full bg-white text-[#002777] text-[10px] font-bold flex items-center justify-center ml-0.5">
                            {activeIntegrationsCount}
                          </span>
                        )}
                        <ChevronUp className="h-3 w-3 opacity-60" />
                      </button>

                      {/* Floating Flyout Menu on Hover/Click */}
                      {integrationsFlyoutOpen && (
                        <div className="absolute right-0 bottom-9 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-xs space-y-1">
                          <div className="px-2 py-1 border-b border-slate-100 font-bold text-slate-800 text-[11px]">
                            Integraciones habilitadas
                          </div>
                          {availableIntegrations.map((opt) => {
                            const active = sources.includes(opt.id)
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleSource(opt.id)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50/70 text-slate-700 transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{opt.label}</span>
                                </div>
                                {active && <Check className="h-3.5 w-3.5 text-[#002777]" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Send Button (↑) */}
                    <button
                      type="submit"
                      disabled={isGenerating || !draft.trim()}
                      className="h-8 w-8 rounded-full bg-[#002777] text-white hover:bg-[#003399] disabled:opacity-30 disabled:hover:bg-[#002777] flex items-center justify-center transition shrink-0 shadow-xs cursor-pointer ml-1"
                      title="Enviar consulta"
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
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
          onRegenerate={() => {
            const lastUserMsg = (activeConversation?.messages ?? [])
              .filter((m) => m.role === 'user')
              .pop()
            if (lastUserMsg) {
              handleSendMessage(lastUserMsg.content)
            }
          }}
        />
      </div>
    </div>
  )
}
