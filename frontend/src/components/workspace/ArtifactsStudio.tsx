import { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  FileCode2,
  Sparkles,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  Undo2,
  Redo2,
  Download,
  Loader2,
  Circle,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Edit3,
  FileCheck,
} from 'lucide-react'
import type { UniverAdapter } from '../../document_agent/adapters/UniverAdapter'
import { UniverContainer } from '../document_workspace/UniverContainer'
import { useToast } from '../../context/ToastContext'

export interface ArtifactItem {
  id: string
  title: string
  subtitle?: string
  extension: 'docx' | 'xlsx' | 'txt'
  content: string
  createdAt: string
  updatedAt: string
}

interface ArtifactsStudioProps {
  adapter: UniverAdapter
  artifacts: ArtifactItem[]
  activeArtifactId: string | null
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSelectArtifact: (id: string) => void
  onCreateArtifact: (title?: string, extension?: 'docx' | 'xlsx' | 'txt') => void
  onDeleteArtifact: (id: string) => void
  onRenameArtifact: (id: string, newTitle: string) => void
  onUpdateArtifactContent: (id: string, newContent: string) => void

  // Undo/Redo from parent
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void

  // Save state
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
}

/**
 * Studio / Artefactos Panel (Claude / Gemini / NotebookLM style).
 * Displays a list of generated artifacts, notes, and documents in Studio mode,
 * and slides seamlessly into the Univer editor mode when an artifact is opened.
 */
export const ArtifactsStudio = ({
  adapter,
  artifacts,
  activeArtifactId,
  isCollapsed,
  onToggleCollapse,
  onSelectArtifact,
  onCreateArtifact,
  onDeleteArtifact,
  onRenameArtifact,
  onUpdateArtifactContent,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  isSaving,
}: ArtifactsStudioProps) => {
  const { toast } = useToast()

  // View state: 'list' (Studio list) or 'editor' (Active artifact editor)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list')
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || artifacts[0] || null

  // Switch to editor when an artifact is selected or created
  useEffect(() => {
    if (activeArtifactId && artifacts.length > 0) {
      setViewMode('editor')
    }
  }, [activeArtifactId, artifacts.length])

  // Keyboard shortcuts for Undo/Redo in editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          onRedo()
        } else {
          e.preventDefault()
          onUndo()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onUndo, onRedo])

  // Export/Download handler considering document extension
  const handleExport = useCallback(
    async (targetFormat?: 'docx' | 'xlsx' | 'txt' | 'json') => {
      if (!activeArtifact) return
      const format = targetFormat || activeArtifact.extension
      const title = activeArtifact.title
      const content = activeArtifact.content

      try {
        if (format === 'txt') {
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title.replace(/\s+/g, '_')}.txt`
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Documento descargado como .txt`)
          return
        }

        if (format === 'json') {
          const blob = new Blob([content], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title.replace(/\s+/g, '_')}.json`
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Documento descargado como .json`)
          return
        }

        const endpoint = format === 'docx' ? '/api/doc-agent/export-docx' : '/api/doc-agent/export-xlsx'
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        })

        if (!response.ok) throw new Error(`Error al exportar ${format}`)

        const arrayBuffer = await response.arrayBuffer()
        const mimeType =
          format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        const blob = new Blob([arrayBuffer], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Documento descargado como .${format}`)
      } catch (err) {
        console.error(err)
        toast.error('Error al exportar el documento.')
      } finally {
        setDownloadDropdownOpen(false)
      }
    },
    [activeArtifact, toast],
  )

  const handleStartRename = (art: ArtifactItem) => {
    setRenamingId(art.id)
    setRenameValue(art.title)
    setMenuOpenId(null)
  }

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameArtifact(id, renameValue.trim())
    }
    setRenamingId(null)
  }

  // Collapsed Sidebar mode
  if (isCollapsed) {
    return (
      <div className="w-11 bg-slate-900 border-l border-slate-800 flex flex-col items-center py-4 gap-4 shrink-0 shadow-lg z-20">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Abrir Studio / Artefactos"
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
        {isDirty && <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />}
        <div className="mt-auto flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onCreateArtifact()}
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer"
            title="Nuevo Artefacto"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-[360px] max-w-[55%] bg-slate-950 border-l border-slate-800/80 flex flex-col overflow-hidden text-slate-100 shadow-2xl">
      {/* View Mode: Studio List */}
      {viewMode === 'list' || !activeArtifact ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Studio Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Studio</h2>
                <p className="text-[11px] text-slate-400">
                  {artifacts.length} {artifacts.length === 1 ? 'artefacto generado' : 'artefactos generados'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCreateArtifact('Nueva nota', 'docx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold shadow-md transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nueva nota</span>
              </button>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Colapsar Studio"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Studio Cards List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {artifacts.length === 0 ? (
              <div className="text-center py-16 px-4 text-slate-500 space-y-3">
                <Sparkles className="h-10 w-10 mx-auto opacity-30 text-blue-400" />
                <p className="text-sm font-medium text-slate-400">No hay artefactos en esta sesión</p>
                <p className="text-xs max-w-xs mx-auto text-slate-500">
                  Pídele al agente que genere un documento de mejoras, especificación o tabla para guardarlo aquí.
                </p>
                <button
                  type="button"
                  onClick={() => onCreateArtifact()}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear primer documento
                </button>
              </div>
            ) : (
              artifacts.map((art) => {
                const isActive = art.id === activeArtifact?.id
                const IconComponent =
                  art.extension === 'xlsx'
                    ? FileSpreadsheet
                    : art.extension === 'txt'
                    ? FileCode2
                    : FileText

                return (
                  <div
                    key={art.id}
                    onClick={() => {
                      onSelectArtifact(art.id)
                      setViewMode('editor')
                    }}
                    className={[
                      'group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer',
                      isActive
                        ? 'bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-900/10 ring-1 ring-blue-500/30'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700/80',
                    ].join(' ')}
                  >
                    {/* Icon badge */}
                    <div
                      className={[
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                        art.extension === 'xlsx'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      ].join(' ')}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      {renamingId === art.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleSaveRename(art.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(art.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-800 border border-blue-500 text-white text-sm font-semibold rounded px-2 py-0.5 w-full focus:outline-none"
                        />
                      ) : (
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                          {art.title}
                        </h3>
                      )}
                      <p className="text-xs text-slate-400 mt-1 truncate leading-relaxed">
                        {art.subtitle || (art.content ? art.content.slice(0, 75).replace(/[\#\*]/g, '') : 'Sin contenido')}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-medium">
                        <span className="uppercase font-bold tracking-wider text-slate-400">
                          .{art.extension}
                        </span>
                        <span>•</span>
                        <span>{art.updatedAt || 'Hace un momento'}</span>
                      </div>
                    </div>

                    {/* 3 dots menu */}
                    <div className="absolute top-3.5 right-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === art.id ? null : art.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpenId === art.id && (
                        <div className="absolute right-0 top-7 w-40 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1.5 z-30 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectArtifact(art.id)
                              setViewMode('editor')
                              setMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <FileCheck className="h-3.5 w-3.5 text-blue-400" />
                            <span>Abrir Editor</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartRename(art)}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Renombrar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleExport(art.extension)
                              setMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-400" />
                            <span>Descargar .{art.extension}</span>
                          </button>

                          <div className="border-t border-slate-800 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              onDeleteArtifact(art.id)
                              setMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* View Mode: Editor / Detail View */
        <div className="flex-1 flex flex-col overflow-hidden bg-white text-slate-900">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 rounded-lg transition cursor-pointer"
                title="Volver a la lista de artefactos"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Studio</span>
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <div className="min-w-0">
                <input
                  type="text"
                  value={activeArtifact.title}
                  onChange={(e) => onRenameArtifact(activeArtifact.id, e.target.value)}
                  className="bg-transparent font-bold text-sm text-white focus:outline-none focus:bg-slate-800 rounded px-1.5 py-0.5 truncate max-w-[240px]"
                />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                .{activeArtifact.extension}
              </span>
            </div>

            {/* Editor Actions: Undo, Redo, Save Status, Download */}
            <div className="flex items-center gap-2">
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="Deshacer (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="Rehacer (Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Autosave Status */}
              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700">
                {isSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    <span className="text-blue-300 font-medium">Guardando...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
                    <span className="text-amber-300 font-medium">Sin guardar</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Guardado</span>
                  </>
                )}
              </div>

              {/* Smart Download Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </button>

                {downloadDropdownOpen && (
                  <div className="absolute right-0 top-9 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1.5 z-40 text-xs text-slate-200">
                    <button
                      type="button"
                      onClick={() => handleExport('docx')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        Documento Word (.docx)
                      </span>
                      {activeArtifact.extension === 'docx' && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('xlsx')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                        Hoja Excel (.xlsx)
                      </span>
                      {activeArtifact.extension === 'xlsx' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <FileCode2 className="h-3.5 w-3.5 text-slate-400" />
                        Texto Plano (.txt)
                      </span>
                      {activeArtifact.extension === 'txt' && <CheckCircle2 className="h-3 w-3 text-slate-400" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Colapsar Studio"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor Body: Univer Container */}
          <div className="flex-1 overflow-hidden bg-slate-100 p-2">
            <UniverContainer
              adapter={adapter}
              kind={activeArtifact.extension === 'xlsx' ? 'spreadsheet' : 'document'}
              title={activeArtifact.title}
              content={activeArtifact.content}
              images={[]}
              onInspect={() => {}}
              onExport={(fmt) => handleExport(fmt)}
              onReloadFixture={() => {}}
              onContentChange={(newContent) => {
                onUpdateArtifactContent(activeArtifact.id, newContent)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
