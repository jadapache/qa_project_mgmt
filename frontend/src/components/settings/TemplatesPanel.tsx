import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Edit3,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, type CorporateTemplate } from '../../api/client'
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

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<CorporateTemplate | null>(null)

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
            Administra las plantillas oficiales (.doc, .docx, .xlsx) para la generación de documentos del sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Cargar Nueva Plantilla</span>
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Cargando plantillas...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center space-y-3 bg-white border border-slate-200 rounded-2xl">
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
            className="btn btn-secondary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 mt-2"
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
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">{tpl.created_at?.slice(0, 10)}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#002777] hover:bg-blue-50 transition"
                    title="Visualizar información de la plantilla"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                    title="Editar título o módulo"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                  className="mt-3 btn btn-secondary text-xs py-1 px-3"
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
                  className="btn btn-secondary text-xs py-1.5 px-3.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !newFile}
                  className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                  className="btn btn-secondary text-xs py-1.5 px-3.5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="btn btn-primary text-xs py-1.5 px-4"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                {getFileIcon(previewTemplate.file_type)}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewTemplate.title}</h3>
                  <p className="text-xs text-slate-400">{previewTemplate.filename}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 py-2">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Módulo Asignado:</span>
                <span className="font-bold text-[#002777] capitalize">{previewTemplate.module}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Tipo de Archivo:</span>
                <span className="font-mono text-slate-900">.{previewTemplate.file_type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Tamaño del Archivo:</span>
                <span>{formatFileSize(previewTemplate.file_size)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Fecha de Carga:</span>
                <span>{previewTemplate.created_at}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="btn btn-primary text-xs py-1.5 px-4"
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
