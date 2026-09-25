import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  FileCode,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { api, type CorporateTemplate, type TemplateDetail } from '../../api/client'
import { useToast } from '../../context/ToastContext'

type TabSidebar = 'fields' | 'details'

export const TemplatesPanel = () => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const [templates, setTemplates] = useState<CorporateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // New template form state
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newModule, setNewModule] = useState('funcional')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Edit metadata modal state
  const [editingTemplate, setEditingTemplate] = useState<CorporateTemplate | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editModule, setEditModule] = useState('')

  // WPForms Style Builder State
  const [previewTemplate, setPreviewTemplate] = useState<CorporateTemplate | null>(null)
  const [previewDetail, setPreviewDetail] = useState<TemplateDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>('')
  const [showAddCustomTag, setShowAddCustomTag] = useState<boolean>(false)
  const [sidebarTab, setSidebarTab] = useState<TabSidebar>('fields')
  const [viewMode, setViewMode] = useState<'preview' | 'editor'>('preview')
  const [savingContent, setSavingContent] = useState<boolean>(false)
  const [filterQuery, setFilterQuery] = useState<string>('')

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getTemplates()
      setTemplates(res.templates || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  // Load template content when selected for WPForms builder
  useEffect(() => {
    if (!previewTemplate) {
      setPreviewDetail(null)
      setEditedContent('')
      setCustomTags([])
      return
    }

    const fetchDetail = async () => {
      setLoadingDetail(true)
      try {
        const detail = await api.getTemplateContent(previewTemplate.id)
        setPreviewDetail(detail)
        setEditedContent(detail.content || '')

        const defaultTags = (detail.system_tags || []).map((t) => t.tag)
        const extra = (detail.template.tags || []).filter((t) => !defaultTags.includes(t))
        setCustomTags(extra)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cargar contenido de la plantilla')
      } finally {
        setLoadingDetail(false)
      }
    }

    void fetchDetail()
  }, [previewTemplate, toast])

  const handleFilePicked = (picked: FileList | null) => {
    if (!picked?.length) return
    const file = picked[0]
    setNewFile(file)
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!newFile) {
      toast.error('Por favor selecciona un archivo (.doc, .docx, .xlsx)')
      return
    }
    setUploading(true)
    try {
      const res = await api.uploadTemplate(newFile, newTitle, newModule)
      setTemplates((prev) => [...prev, res.template])
      toast.success(`Plantilla "${res.template.title}" cargada exitosamente`)
      setNewFile(null)
      setNewTitle('')
      setShowUploadModal(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la plantilla')
    } finally {
      setUploading(false)
    }
  }

  const handleStartEdit = (template: CorporateTemplate) => {
    setEditingTemplate(template)
    setEditTitle(template.title)
    setEditModule(template.module)
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate) return
    try {
      const res = await api.updateTemplate(editingTemplate.id, {
        title: editTitle,
        module: editModule,
      })
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? res.template : t)),
      )
      toast.success('Metadatos de la plantilla actualizados correctamente')
      setEditingTemplate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar plantilla')
    }
  }

  const handleSaveBuilder = async () => {
    if (!previewTemplate) return
    setSavingContent(true)
    try {
      const systemTags = (previewDetail?.system_tags || []).map((t) => t.tag)
      const allTags = Array.from(new Set([...systemTags, ...customTags]))

      const res = await api.updateTemplate(previewTemplate.id, {
        content: editedContent,
        tags: allTags,
      })
      setTemplates((prev) =>
        prev.map((t) => (t.id === previewTemplate.id ? res.template : t)),
      )
      toast.success('¡Plantilla y placeholders guardados exitosamente!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantilla')
    } finally {
      setSavingContent(false)
    }
  }

  const handleDelete = async (template: CorporateTemplate) => {
    if (!window.confirm(`¿Estás seguro de eliminar la plantilla "${template.title}"?`)) return
    try {
      await api.deleteTemplate(template.id)
      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      toast.success('Plantilla eliminada correctamente')
      if (previewTemplate?.id === template.id) {
        setPreviewTemplate(null)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar plantilla')
    }
  }

  const insertTagAtCursor = (tagName: string) => {
    const formattedTag = `{{${tagName.replace(/[{}]/g, '').toUpperCase()}}}`
    const textarea = editorRef.current

    if (textarea && viewMode === 'editor') {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const textBefore = editedContent.substring(0, start)
      const textAfter = editedContent.substring(end)
      const newText = `${textBefore}${formattedTag}${textAfter}`
      setEditedContent(newText)

      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + formattedTag.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 50)
    } else {
      // Append tag to document text when in visual document mode
      setEditedContent((prev) => (prev.trim() ? `${prev}\n${formattedTag}` : formattedTag))
    }

    toast.success(`Placeholder ${formattedTag} insertado en la plantilla`)
  }

  const handleAddCustomTag = (e: FormEvent) => {
    e.preventDefault()
    const clean = newCustomTagInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '')
    if (!clean) {
      toast.error('Nombre de etiqueta no válido')
      return
    }
    if (customTags.includes(clean)) {
      toast.error('Esta etiqueta ya existe')
      return
    }
    setCustomTags((prev) => [...prev, clean])
    setNewCustomTagInput('')
    setShowAddCustomTag(false)
    insertTagAtCursor(clean)
  }

  const handleRemoveCustomTag = (tagToRemove: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tagToRemove))
    toast.info(`Etiqueta "${tagToRemove}" removida de la lista`)
  }

  const handleDragStart = (e: React.DragEvent, tagName: string) => {
    const tagFormatted = `{{${tagName.replace(/[{}]/g, '').toUpperCase()}}}`
    e.dataTransfer.setData('text/plain', tagFormatted)
  }

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedText = e.dataTransfer.getData('text/plain')
    if (droppedText) {
      insertTagAtCursor(droppedText)
    }
  }

  const handleDragOverCanvas = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const copyTagToClipboard = (tag: string) => {
    const tagFormatted = `{{${tag.replace(/[{}]/g, '').toUpperCase()}}}`
    void navigator.clipboard.writeText(tagFormatted)
    toast.success(`Etiqueta "${tagFormatted}" copiada al portapapeles`)
  }

  const getFileIcon = (fileType: string) => {
    const ext = fileType.toLowerCase()
    if (ext.includes('xls')) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
    if (ext.includes('doc')) return <FileText className="h-5 w-5 text-[#004497]" />
    return <FileCode className="h-5 w-5 text-slate-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const systemFields = previewDetail?.system_tags || []
  const filteredSystemFields = systemFields.filter(
    (f) =>
      f.tag.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.label.toLowerCase().includes(filterQuery.toLowerCase()),
  )

  const aiFields = filteredSystemFields.filter((f) => f.type !== 'function')
  const functionFields = filteredSystemFields.filter((f) => f.type === 'function')

  return (
    <div className="space-y-6">
      {/* Main List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Plantillas Corporativas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra las plantillas oficiales (.doc, .docx, .xlsx) y diseña sus placeholders en el constructor visual.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/settings?tab=univer_poc"
            className="text-xs py-2 px-3.5 flex items-center gap-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold rounded-xl cursor-pointer shadow-xs transition-colors"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Probar PoC Univer</span>
          </a>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Cargar Nueva Plantilla</span>
          </button>
        </div>
      </div>

      {/* Templates List Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-[#002777]" />
          <span>Cargando plantillas corporativas...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center space-y-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#002777] flex items-center justify-center mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No hay plantillas cargadas aún</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Sube tus archivos corporativos en formato .doc, .docx o .xlsx para estructurar los campos y requerimientos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn btn-secondary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 mt-2 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Subir Primera Plantilla</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      {getFileIcon(tpl.file_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{tpl.title}</h3>
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">{tpl.filename}</p>
                    </div>
                  </div>

                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#002777] shrink-0">
                    .{tpl.file_type}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>Módulo: <strong className="capitalize text-slate-700">{tpl.module}</strong></span>
                  <span>•</span>
                  <span>{formatFileSize(tpl.file_size)}</span>
                </div>

                {/* Tag Chips */}
                {tpl.tags && tpl.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tpl.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 font-mono"
                      >
                        {`{{${t}}}`}
                      </span>
                    ))}
                    {tpl.tags.length > 4 ? (
                      <span className="text-[10px] text-slate-400 font-medium self-center">
                        +{tpl.tags.length - 4} más
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">{tpl.created_at?.slice(0, 10)}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#002777] text-xs font-semibold transition cursor-pointer"
                    title="Diseñar plantilla y editar placeholders (Estilo WPForms)"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Diseñar Plantilla</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                    title="Editar título o módulo"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Drawer: Upload New Template */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Cargar Nueva Plantilla</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx,.xlsx,.md,.txt"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files)}
                />
                <Upload className="h-8 w-8 text-[#002777] mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {newFile ? newFile.name : 'Haz clic para elegir plantilla (.doc, .docx, .xlsx)'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 btn btn-secondary text-xs py-1 px-3 cursor-pointer"
                >
                  Seleccionar Archivo
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Título de la Plantilla</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Formato Corporativo de Mejoras v2"
                  className="input-field text-xs text-slate-800 w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Módulo Asociado</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  className="input-field text-xs text-slate-800 w-full"
                >
                  <option value="funcional">Funcional</option>
                  <option value="qa">QA & Pruebas</option>
                  <option value="pm">Project Management</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !newFile}
                  className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Subir Plantilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Editar Información de la Plantilla</h3>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Título de la Plantilla</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field text-xs text-slate-800 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Módulo Asociado</label>
                <select
                  value={editModule}
                  onChange={(e) => setEditModule(e.target.value)}
                  className="input-field text-xs text-slate-800 w-full"
                >
                  <option value="funcional">Funcional</option>
                  <option value="qa">QA & Pruebas</option>
                  <option value="pm">Project Management</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="btn btn-secondary text-xs py-1.5 px-3.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="btn btn-primary text-xs py-1.5 px-4 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WPFORMS-STYLE FULLSCREEN TEMPLATE & PLACEHOLDER BUILDER MODAL             */}
      {/* ========================================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col overflow-hidden animate-fadeIn">
          {/* 1. TOP BUILDER BAR (PROPORTIONAL COMPACT LAYOUT) */}
          <header className="bg-[#002777] text-white px-5 py-2.5 flex items-center justify-between border-b border-blue-900 shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>

              <div className="h-4 w-[1px] bg-blue-700" />

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide">{previewTemplate.title}</h3>
                  <span className="uppercase text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600/80 text-white">
                    .{previewTemplate.file_type}
                  </span>
                </div>
                <p className="text-[10px] text-blue-200">
                  Archivo: <span className="font-mono text-white">{previewTemplate.filename}</span> • Módulo: <span className="capitalize text-white font-semibold">{previewTemplate.module}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher */}
              <div className="flex rounded-lg bg-blue-950/80 p-0.5 border border-blue-700/60 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    viewMode === 'preview' ? 'bg-white text-[#002777] shadow-xs font-bold' : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Vista Documento (Edición Directa)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    viewMode === 'editor' ? 'bg-white text-[#002777] shadow-xs font-bold' : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Texto Markdown
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveBuilder}
                disabled={savingContent}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {savingContent ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Guardar Plantilla</span>
              </button>
            </div>
          </header>

          {/* 2. MAIN BUILDER BODY (2 PANELS) */}
          <div className="flex-1 flex overflow-hidden bg-slate-100">
            {/* LEFT SIDEBAR PANEL (WPFORMS FIELD BUILDER) */}
            <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
              {/* Sidebar Header Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50/80 p-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab('fields')}
                  className={`flex-1 py-1.5 text-[11px] font-bold text-center rounded-md transition cursor-pointer ${
                    sidebarTab === 'fields'
                      ? 'bg-white text-[#002777] shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Campos & Placeholders
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('details')}
                  className={`flex-1 py-1.5 text-[11px] font-bold text-center rounded-md transition cursor-pointer ${
                    sidebarTab === 'details'
                      ? 'bg-white text-[#002777] shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Opciones del Documento
                </button>
              </div>

              {/* TAB 1: FIELDS & PLACEHOLDERS LIST (WPFORMS STYLE) */}
              {sidebarTab === 'fields' && (
                <div className="flex-1 flex flex-col p-3.5 overflow-y-auto space-y-3">
                  {/* Top Add Custom Placeholder Action */}
                  <div>
                    {showAddCustomTag ? (
                      <form onSubmit={handleAddCustomTag} className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 space-y-2 animate-fadeIn">
                        <label className="text-[11px] font-bold text-[#002777] block">Nombre del nuevo Placeholder</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newCustomTagInput}
                            onChange={(e) => setNewCustomTagInput(e.target.value)}
                            placeholder="EJ: CODIGO_REQUERIMIENTO"
                            className="input-field text-xs uppercase font-mono w-full bg-white py-1 px-2.5"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="btn btn-primary text-xs py-1 px-2.5 shrink-0 cursor-pointer"
                          >
                            Agregar
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Se agregará en formato <span className="font-mono text-blue-700 font-bold">{`{{TAG}}`}</span>
                        </p>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddCustomTag(true)}
                        className="w-full py-1.5 px-3 rounded-lg border border-dashed border-[#002777] bg-blue-50/50 hover:bg-blue-100/70 text-[#002777] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer font-sans"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Añadir Nuevo Placeholder</span>
                      </button>
                    )}
                  </div>

                  {/* Filter / Search Bar (Clean Spacing, No Icon Overlap) */}
                  <div>
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Buscar placeholder..."
                      className="input-field text-xs w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#002777]"
                    />
                  </div>

                  {/* 1. FUNCTION TAGS SECTION (CORPORATE DARK BLUE PALETTE) */}
                  {functionFields.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#002777] uppercase tracking-wide flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5 text-[#002777]" />
                          <span>Etiquetas de Función ({functionFields.length})</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Se evalúan automáticamente al generar/exportar Word/PDF.
                      </p>

                      <div className="grid gap-1.5">
                        {functionFields.map((f) => (
                          <div
                            key={f.tag}
                            draggable
                            onDragStart={(e) => handleDragStart(e, f.tag)}
                            className="group flex items-center justify-between p-2 bg-slate-50 border border-blue-200/80 rounded-lg shadow-2xs hover:border-[#002777] transition cursor-grab active:cursor-grabbing select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#002777] shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-[#002777] block truncate">{f.label}</span>
                                <span className="text-[10px] font-mono text-[#004497] font-semibold">{`{{${f.tag}}}`}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => insertTagAtCursor(f.tag)}
                                className="px-2 py-0.5 rounded bg-[#002777] hover:bg-[#004497] text-white text-[10px] font-bold transition cursor-pointer"
                              >
                                + Insertar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* 2. AI CONTENT FIELDS SECTION */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>Campos de Contenido IA ({aiFields.length})</span>
                      </span>
                    </div>

                    <div className="grid gap-1.5">
                      {aiFields.map((f) => (
                        <div
                          key={f.tag}
                          draggable
                          onDragStart={(e) => handleDragStart(e, f.tag)}
                          className="group flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-blue-400 hover:shadow-xs transition cursor-grab active:cursor-grabbing select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 block truncate">{f.label}</span>
                              <span className="text-[10px] font-mono text-[#002777] font-semibold">{`{{${f.tag}}}`}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => insertTagAtCursor(f.tag)}
                              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#002777] text-[10px] font-bold transition cursor-pointer"
                              title="Insertar en la plantilla"
                            >
                              + Insertar
                            </button>
                            <button
                              type="button"
                              onClick={() => copyTagToClipboard(f.tag)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Copiar etiqueta"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. CUSTOM FIELDS SECTION */}
                  {customTags.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide block">
                        Campos Personalizados ({customTags.length})
                      </span>

                      <div className="grid gap-1.5">
                        {customTags.map((ct) => (
                          <div
                            key={ct}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ct)}
                            className="group flex items-center justify-between p-2 bg-blue-50/40 border border-blue-200 rounded-lg shadow-2xs hover:border-blue-400 transition cursor-grab active:cursor-grabbing select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="h-3.5 w-3.5 text-blue-300 group-hover:text-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-blue-900 block truncate font-mono">{`{{${ct}}}`}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => insertTagAtCursor(ct)}
                                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition cursor-pointer"
                              >
                                + Insertar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomTag(ct)}
                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Eliminar este placeholder"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 2: DOCUMENT DETAILS */}
              {sidebarTab === 'details' && (
                <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Propiedades del Documento</h4>
                    <p className="text-[11px] text-slate-500">Información del archivo original extraído.</p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Título:</span>
                        <span className="font-bold text-slate-800">{previewTemplate.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Módulo:</span>
                        <span className="font-bold text-[#002777] capitalize">{previewTemplate.module}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Formato:</span>
                        <span className="font-mono text-slate-900">.{previewTemplate.file_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tamaño:</span>
                        <span>{formatFileSize(previewTemplate.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-[#002777] space-y-1 text-xs">
                    <h5 className="font-bold text-[#002777] flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#002777]" />
                      <span>Etiquetas de Función Automáticas:</span>
                    </h5>
                    <p className="text-[11px] leading-relaxed text-slate-700">
                      Etiquetas como <code className="font-mono bg-blue-100 px-1 rounded text-[#002777]">{'{{PAGINA}}'}</code> o <code className="font-mono bg-blue-100 px-1 rounded text-[#002777]">{'{{FECHA_HOY}}'}</code> son calculadas dinámicamente al exportar a Word/PDF por el motor del sistema sin consumir llamadas a la IA.
                    </p>
                  </div>
                </div>
              )}
            </aside>

            {/* RIGHT DOCUMENT CANVAS (A4 PAPER DOCUMENT VIEWPORT WITH DIRECT INLINE EDITING) */}
            <main
              onDragOver={handleDragOverCanvas}
              onDrop={handleDropOnCanvas}
              className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-200/70 flex justify-center items-start"
            >
              {loadingDetail ? (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#002777]" />
                  <span className="text-sm font-semibold">Procesando estructura del documento y tablas...</span>
                </div>
              ) : (
                /* A4 PAPER CANVAS CONTAINER WITH INLINE EDITING */
                <div className="w-full max-w-3xl bg-white shadow-2xl rounded-sm border border-slate-300 min-h-[850px] p-8 md:p-14 flex flex-col justify-between relative transition-all font-sans">
                  {/* Paper Document Header Bar */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#002777]">FORMATO OFICIAL DE DOCUMENTACIÓN</p>
                      <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-serif mt-1">
                        {previewTemplate.title}
                      </h1>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Módulo: {previewTemplate.module.toUpperCase()}
                    </span>
                  </div>

                  {/* DOCUMENT CANVAS CONTENT (DIRECT INLINE EDITING OR MARKDOWN EDITOR) */}
                  {viewMode === 'editor' ? (
                    <div className="flex-1 flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                        <span>Editor de plantilla (Modo Código Markdown)</span>
                        <span className="font-mono text-[11px]">Haz clic en cualquier placeholder de la izquierda para insertarlo</span>
                      </div>

                      <textarea
                        ref={editorRef}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full flex-1 min-h-[600px] p-4 font-mono text-xs text-slate-900 bg-slate-50/50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#002777] focus:outline-none leading-relaxed resize-none font-medium shadow-inner"
                        placeholder="Edita la plantilla e inserta placeholders {{FECHA}}, {{AREA}}, {{NECESIDAD}}, etc..."
                      />
                    </div>
                  ) : (
                    /* DIRECT VISUAL DOCUMENT CANVAS — Editable Inline (No separate preview) */
                    <div className="flex-1 space-y-5 pt-2 font-sans">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#002777] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
                          <span>
                            <strong>Edición Directa en Documento:</strong> Edita el contenido directamente sobre el canvas renderizado, o haz clic en <strong>+ Insertar</strong> en el panel izquierdo para agregar placeholders.
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewMode('editor')}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Modo Código Markdown</span>
                        </button>
                      </div>

                      {/* Header Content Table Section */}
                      {previewDetail?.header_content ? (
                        <div className="border-b-2 border-slate-200 pb-3 mb-4 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#002777] uppercase tracking-wider">
                            <span>ENCABEZADO DE DOCUMENTO CORPORATIVO</span>
                            <span className="font-mono font-semibold text-slate-400">Word / PDF Header Table</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
                            {parseMarkdownBlock(previewDetail.header_content, systemFields)}
                          </div>
                        </div>
                      ) : null}

                      {/* Direct Inline Canvas — rendered and editable in one single surface */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#002777] uppercase tracking-wider block">
                          CONTENIDO DEL DOCUMENTO (EDICIÓN DIRECTA)
                        </label>

                        <div
                          ref={editorRef as any}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const el = e.target as HTMLElement
                            setEditedContent(el.innerText)
                          }}
                          onDragOver={handleDragOverCanvas}
                          onDrop={handleDropOnCanvas}
                          className="w-full min-h-[450px] p-5 text-xs md:text-sm font-sans leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002777] focus:border-transparent focus:outline-none transition shadow-xs cursor-text"
                        >
                          {parseMarkdownBlock(editedContent, systemFields)}
                        </div>
                      </div>

                      {/* Footer Content Table Section */}
                      {previewDetail?.footer_content ? (
                        <div className="border-t-2 border-slate-200 pt-3 mt-6 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#002777] uppercase tracking-wider">
                            <span>PIE DE PÁGINA CORPORATIVO</span>
                            <span className="font-mono font-semibold text-slate-400">Word / PDF Footer</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs text-xs text-slate-600">
                            {parseMarkdownBlock(previewDetail.footer_content, systemFields)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Paper Footer */}
                  <div className="border-t border-slate-200 pt-4 mt-8 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                    <span>DOCUMENTO CORPORATIVO • {previewTemplate.filename}</span>
                    <span>PÁGINA 1 DE 1</span>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Parses Markdown block content (lines, pipe tables, headers, and text with tag pills).
 */
function parseMarkdownBlock(content: string, systemFields: any[]) {
  if (!content.trim()) {
    return <p className="text-sm text-slate-400 italic">El documento no contiene texto visible. Haz clic para comenzar a escribir.</p>
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let inTable = false
  let tableRows: string[][] = []

  const flushTable = (keyIndex: number) => {
    if (tableRows.length === 0) return
    const headerRow = tableRows[0]
    const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => /^[\s\:\-]*$/.test(cell)))

    elements.push(
      <div key={`table-${keyIndex}`} className="my-3 overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white">
        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead>
            <tr className="bg-[#002777]/10 border-b border-slate-300 text-[#002777] font-bold">
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-3 py-2 border-r border-slate-200 last:border-r-0">
                  {renderTextWithTags(cell, systemFields)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 border-t border-r border-slate-200 last:border-r-0 text-slate-700 font-medium">
                    {renderTextWithTags(cell, systemFields)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )

    tableRows = []
    inTable = false
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim())
      tableRows.push(cells)
    } else {
      if (inTable) {
        flushTable(idx)
      }

      if (!trimmed) {
        elements.push(<div key={idx} className="h-1.5" />)
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={idx} className="text-lg font-bold text-[#002777] border-b border-slate-200 pb-1 mt-4">
            {trimmed.replace('# ', '')}
          </h2>,
        )
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="text-base font-bold text-slate-900 mt-3">
            {trimmed.replace('## ', '')}
          </h3>,
        )
      } else {
        elements.push(
          <div key={idx} className="text-xs leading-relaxed font-sans text-slate-700">
            {renderTextWithTags(line, systemFields)}
          </div>,
        )
      }
    }
  })

  if (inTable) {
    flushTable(lines.length)
  }

  return <div className="space-y-2 font-sans">{elements}</div>
}

function renderTextWithTags(text: string, systemFields: any[]) {
  const parts = text.split(/(\{\{[A-Za-z0-9_\-\.]+\}\})/)
  return parts.map((part, pIdx) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const tagClean = part.replace(/[{}]/g, '')
      const sysTag = systemFields.find((s) => s.tag === tagClean)
      const labelName = sysTag ? sysTag.label : tagClean

      return (
        <span
          key={pIdx}
          contentEditable={false}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold shadow-2xs font-mono my-0.5 select-none bg-blue-50 border border-blue-200 text-[#002777]"
          title={`Placeholder: ${part}`}
        >
          <Tag className="h-3 w-3 text-blue-600" />
          <span>{part}</span>
          <span className="text-[10px] font-normal font-sans text-slate-600">({labelName})</span>
        </span>
      )
    }
    return <span key={pIdx}>{part}</span>
  })
}
