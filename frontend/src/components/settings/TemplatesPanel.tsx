import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Edit3,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, type CorporateTemplate, type TemplateDetail } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export const TemplatesPanel = () => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templates, setTemplates] = useState<CorporateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // New template form state
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newModule, setNewModule] = useState('funcional')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Edit modal state
  const [editingTemplate, setEditingTemplate] = useState<CorporateTemplate | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editModule, setEditModule] = useState('')

  // Preview / Detail state
  const [previewTemplate, setPreviewTemplate] = useState<CorporateTemplate | null>(null)
  const [previewDetail, setPreviewDetail] = useState<TemplateDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [isEditingContent, setIsEditingContent] = useState<boolean>(false)
  const [savingContent, setSavingContent] = useState<boolean>(false)

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

  // Fetch document content detail when previewTemplate changes
  useEffect(() => {
    if (!previewTemplate) {
      setPreviewDetail(null)
      setEditedContent('')
      setIsEditingContent(false)
      return
    }

    const fetchDetail = async () => {
      setLoadingDetail(true)
      try {
        const detail = await api.getTemplateContent(previewTemplate.id)
        setPreviewDetail(detail)
        setEditedContent(detail.content)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al obtener el contenido de la plantilla')
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
      toast.success('Plantilla actualizada correctamente')
      setEditingTemplate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar plantilla')
    }
  }

  const handleSaveContentEdit = async () => {
    if (!previewTemplate) return
    setSavingContent(true)
    try {
      const res = await api.updateTemplate(previewTemplate.id, {
        content: editedContent,
      })
      setTemplates((prev) =>
        prev.map((t) => (t.id === previewTemplate.id ? res.template : t)),
      )
      if (previewDetail) {
        setPreviewDetail({ ...previewDetail, content: editedContent })
      }
      setIsEditingContent(false)
      toast.success('Contenido de la plantilla guardado exitosamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el contenido')
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

  const copyTagToClipboard = (tag: string) => {
    const tagFormatted = `{{${tag.replace(/[{}]/g, '')}}}`
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Plantillas Corporativas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra las plantillas oficiales (.doc, .docx, .xlsx) y sus etiquetas para la generación de documentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Cargar Nueva Plantilla</span>
        </button>
      </div>

      {/* Templates List */}
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
              Sube tus archivos corporativos en formato .doc, .docx o .xlsx para centralizar el formato de los requerimientos.
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

                {/* Tag Badges Preview */}
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#002777] hover:bg-blue-50 transition cursor-pointer"
                    title="Visualizar contenido y etiquetas del documento"
                  >
                    <Eye className="h-4 w-4" />
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
              {/* File Dropzone */}
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

              {/* Title input */}
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

              {/* Module selector */}
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

      {/* Document Content & Tag Visualizer Drawer / Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                  {getFileIcon(previewTemplate.file_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{previewTemplate.title}</h3>
                    <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-[#002777]">
                      .{previewTemplate.file_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Archivo: <span className="font-mono text-slate-700">{previewTemplate.filename}</span> • Módulo: <span className="capitalize font-semibold text-slate-700">{previewTemplate.module}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-[#002777]" />
                <span className="text-xs font-semibold">Cargando y procesando el contenido del documento...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Visualizador de Etiquetas / Dynamic Tags Bar */}
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#002777]" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Etiquetas de Generación (Tags)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Haz clic en cualquier etiqueta para copiarla al documento
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Estas etiquetas indican los puntos dinámicos del documento donde la IA insertará la información recopilada:
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(previewDetail?.system_tags || []).map((st) => (
                      <button
                        key={st.tag}
                        type="button"
                        onClick={() => copyTagToClipboard(st.tag)}
                        className="group inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer"
                        title={`${st.label}: ${st.description}`}
                      >
                        <span className="font-mono text-[#002777] font-bold">{`{{${st.tag}}}`}</span>
                        <span className="text-slate-500 text-[11px] font-normal hidden sm:inline">({st.label})</span>
                        <Copy className="h-3 w-3 text-slate-400 group-hover:text-blue-600 transition" />
                      </button>
                    ))}
                  </div>

                  {previewDetail?.detected_tags && previewDetail.detected_tags.length > 0 ? (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">Etiquetas detectadas en el texto:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewDetail.detected_tags.map((dt) => (
                          <span
                            key={dt}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold"
                          >
                            {`{{${dt}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Content Viewer / Editor Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#002777]" />
                      <span>Visualización del Contenido del Documento</span>
                    </h4>

                    <div className="flex items-center gap-2">
                      {['md', 'txt', 'json', 'html', 'xml'].includes(previewTemplate.file_type.toLowerCase()) ? (
                        isEditingContent ? (
                          <button
                            type="button"
                            onClick={handleSaveContentEdit}
                            disabled={savingContent}
                            className="btn btn-primary text-xs py-1 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {savingContent ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            <span>Guardar Cambios</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsEditingContent(true)}
                            className="btn btn-secondary text-xs py-1 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Editar Texto</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          (Vista de lectura para .{previewTemplate.file_type})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Text Box */}
                  {isEditingContent ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setDraftContent(e.target.value, setEditedContent)}
                      className="w-full h-80 p-4 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y leading-relaxed"
                      placeholder="Ingresa el contenido estructurado del documento con sus etiquetas {{FECHA}}, {{AREA}}, etc..."
                    />
                  ) : (
                    <div className="w-full max-h-96 overflow-y-auto p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner">
                      {editedContent || previewDetail?.content || 'No hay contenido de texto extraído para esta plantilla.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50/80">
              <span className="text-xs text-slate-500">
                Tamaño: {formatFileSize(previewTemplate.file_size)} • Fecha: {previewTemplate.created_at}
              </span>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="btn btn-primary text-xs py-1.5 px-4 cursor-pointer"
              >
                Cerrar Visualización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function setDraftContent(value: string, setter: (v: string) => void) {
  setter(value)
}
