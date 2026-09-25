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
} from '../../hooks/useChatPersistence'
import { ChatHistorySidebar } from './ChatHistorySidebar'
import { AgenticThinkingBubble } from './AgenticThinkingBubble'
import { DocumentPanel } from './DocumentPanel'
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

  // Document undo/redo history
  const docHistory = useDocumentHistory(activeConversation?.documentContent || '')

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [docPanelCollapsed, setDocPanelCollapsed] = useState(true)
  const [draft, setDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sources, setSources] = useState<string[]>(config.defaultSources || ['knowledge'])

  // Uploaded context documents
  const [uploaded, setUploaded] = useState<KnowledgeDocument[]>([])
  const [uploading, setUploading] = useState(false)

  // Thinking steps for the current in-progress message
  const [liveThinkingSteps, setLiveThinkingSteps] = useState<ThinkingStep[]>([])

  // Get current messages from active conversation
  const messages: ChatPersistMessage[] = activeConversation?.messages ?? []

  // Create initial conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation('Nueva conversación')
    }
  }, [conversations.length, createConversation])

  // Reset document history when switching conversations
  useEffect(() => {
    if (activeConversation) {
      docHistory.resetHistory(activeConversation.documentContent || '')
      if (activeConversation.documentContent) {
        setDocPanelCollapsed(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId])

  // Load adapter when document content changes externally
  useEffect(() => {
    if (docHistory.content) {
      void adapter.loadTemplate(docHistory.content, 'document', config.title)
    }
  }, [docHistory.content, adapter, config.title])

  // Autosave debounce
  useEffect(() => {
    if (!docHistory.isDirty) return
    const timer = setTimeout(() => {
      setIsSaving(true)
      updateConversation({ documentContent: docHistory.content })
      docHistory.markSaved()
      setTimeout(() => setIsSaving(false), 400)
    }, 3000)
    return () => clearTimeout(timer)
  }, [docHistory.content, docHistory.isDirty, updateConversation, docHistory])

  // Scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  // File upload
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

  /**
   * Main message handler: orchestrates the Agentic RAG + DocumentAgent cycle.
   * Thinking steps are shown inline in the assistant bubble (Claude-style).
   */
  const handleSendMessage = async (customQuery?: string) => {
    const queryText = customQuery || draft.trim()
    if (!queryText || isGenerating) return

    setIsGenerating(true)
    setDocPanelCollapsed(false)
    setDraft('')

    const userMsgId = crypto.randomUUID()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // Add user message
    const userMsg: ChatPersistMessage = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      timestamp: now,
    }
    const updatedMessages = [...messages, userMsg]
    updateConversation({ messages: updatedMessages })
    scrollToBottom()

    // Build thinking steps
    const steps: ThinkingStep[] = [
      { id: 'inspect', label: 'INSPECT', status: 'in_progress', details: 'Leyendo estado canónico...' },
      { id: 'rag', label: 'RAG & PLAN', status: 'pending', details: 'Consultando intención...' },
      { id: 'validate', label: 'VALIDATE', status: 'pending', details: 'Verificando targets...' },
      { id: 'execute', label: 'EXECUTE', status: 'pending', details: 'Ejecutando operaciones...' },
      { id: 'verify', label: 'VERIFY', status: 'pending', details: 'Auditoría post-mutación...' },
    ]
    setLiveThinkingSteps([...steps])

    let assistantMessage = ''
    let finalSteps: ThinkingStep[] = steps

    try {
      // 1. INSPECT
      const stateBefore = await agent.inspect()
      steps[0].status = 'completed'
      steps[0].details = `${stateBefore.sections.length} secciones identificadas`
      steps[1].status = 'in_progress'
      setLiveThinkingSteps([...steps])

      // 2. RAG & PLAN — call backend
      const chatContext = updatedMessages
        .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
        .join('\n')

      const response = await fetch('/api/doc-agent/agentic-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          documentState: stateBefore,
          document_state: stateBefore,
          attachedAssetIds: [],
          attached_asset_ids: [],
          chat_context: chatContext,
          document_ids: uploaded.map((d) => d.id),
          sources,
        }),
      })

      if (!response.ok) {
        let errorDetails = response.statusText
        try {
          const errJson = await response.json()
          errorDetails = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail || errJson)
        } catch { /* ignore */ }
        throw new Error(`Error del orquestador (${response.status}): ${errorDetails}`)
      }

      const agentData = await response.json()
      const intent = agentData.intentDetected ?? agentData.intent_detected ?? 'Operación procesada'
      const plannedOps: CanonicalDocumentOperation[] =
        agentData.plannedOperations ?? agentData.planned_operations ?? []
      const requiresMutation =
        agentData.requiresDocumentMutation ?? agentData.requires_document_mutation ?? (plannedOps.length > 0)
      assistantMessage =
        agentData.assistantMessage ?? agentData.assistant_message ?? 'Operación procesada con éxito.'

      steps[1].status = 'completed'
      steps[1].details = `Intención: "${intent}" (${plannedOps.length} ops)`
      steps[2].status = 'in_progress'
      setLiveThinkingSteps([...steps])

      if (!requiresMutation || plannedOps.length === 0) {
        steps[2].status = 'completed'
        steps[2].details = 'Sin mutación requerida'
        steps[3].status = 'completed'
        steps[3].details = 'Omitido'
        steps[4].status = 'completed'
        steps[4].details = 'Verificado'
        setLiveThinkingSteps([...steps])
        finalSteps = [...steps]
      } else {
        // 3. VALIDATE
        for (const op of plannedOps) {
          const val = await agent.validate(op, stateBefore)
          if (!val.valid) throw new Error(`Validación fallida: ${val.reason}`)
        }
        steps[2].status = 'completed'
        steps[2].details = 'Targets y políticas validadas'
        steps[3].status = 'in_progress'
        setLiveThinkingSteps([...steps])

        // 4. EXECUTE
        for (const op of plannedOps) {
          await agent.dispatch(op)
        }
        steps[3].status = 'completed'
        steps[3].details = `${plannedOps.length} operaciones ejecutadas`
        steps[4].status = 'in_progress'
        setLiveThinkingSteps([...steps])

        // 5. VERIFY
        const stateAfter = await agent.inspect()
        const newContent = adapter.getRawContent()
        docHistory.pushContent(newContent)

        steps[4].status = 'completed'
        steps[4].details = `Verificado: ${stateAfter.sections.length} secciones`
        setLiveThinkingSteps([...steps])
        finalSteps = [...steps]
      }
    } catch (err) {
      console.error(err)
      const errorMsg = err instanceof Error ? err.message : 'Error al procesar la instrucción'
      assistantMessage = `Error: ${errorMsg}`
      const currentIdx = steps.findIndex((s) => s.status === 'in_progress')
      if (currentIdx !== -1) {
        steps[currentIdx].status = 'failed'
        steps[currentIdx].details = errorMsg
      }
      // Mark remaining as failed
      for (const step of steps) {
        if (step.status === 'pending') step.status = 'failed'
      }
      setLiveThinkingSteps([...steps])
      finalSteps = [...steps]
    } finally {
      setIsGenerating(false)

      // Persist assistant message with thinking steps
      const assistantMsg: ChatPersistMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingSteps: finalSteps,
      }

      updateConversation({
        messages: [...updatedMessages, assistantMsg],
        documentContent: docHistory.content,
      })
      setLiveThinkingSteps([])
      scrollToBottom()
    }
  }

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault()
    void handleSendMessage()
  }

  const handleManualSave = () => {
    setIsSaving(true)
    updateConversation({ documentContent: docHistory.content })
    docHistory.markSaved()
    setTimeout(() => setIsSaving(false), 400)
  }

  const handleContentChange = (newContent: string) => {
    docHistory.pushContent(newContent)
  }

  const handleNewConversation = () => {
    createConversation()
    docHistory.resetHistory('')
    setDocPanelCollapsed(true)
  }

  const handleSwitchConversation = (id: string) => {
    switchConversation(id)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.md,.txt,.json"
        className="hidden"
        onChange={(e) => handlePickFiles(e.target.files)}
      />

      {/* Left Sidebar: Chat History */}
      <ChatHistorySidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectConversation={handleSwitchConversation}
        onCreateConversation={handleNewConversation}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Center: Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#002777] text-white rounded-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">{config.title}</h1>
                <p className="text-[11px] text-slate-500">{config.subtitle}</p>
              </div>
            </div>
            {activeConversation && (
              <span className="text-[11px] text-slate-400 font-medium">
                {activeConversation.name}
              </span>
            )}
          </div>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {messages.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <Sparkles className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Escribe tu consulta para comenzar a construir el documento.
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Adjunta archivos de contexto con (+), activa fuentes de conocimiento, y el agente generará y mantendrá tu documento en tiempo real.
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
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
              {/* Textarea */}
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
                disabled={isGenerating}
                className="w-full bg-transparent px-2 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400 disabled:opacity-60"
              />

              {/* Bottom row: attachments, sources, send */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* (+) Attachment */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer"
                    title="Adjuntar archivo de contexto"
                  >
                    {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>

                  {/* Uploaded docs badges */}
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

                  {/* Context source badges */}
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

                {/* Send button */}
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

      {/* Right Panel: Document */}
      <DocumentPanel
        adapter={adapter}
        title={config.docxTitle || config.title}
        content={docHistory.content}
        isCollapsed={docPanelCollapsed}
        onToggleCollapse={() => setDocPanelCollapsed(!docPanelCollapsed)}
        onContentChange={handleContentChange}
        canUndo={docHistory.canUndo}
        canRedo={docHistory.canRedo}
        onUndo={docHistory.undo}
        onRedo={docHistory.redo}
        isDirty={docHistory.isDirty}
        isSaving={isSaving}
        onSave={handleManualSave}
      />
    </div>
  )
}
