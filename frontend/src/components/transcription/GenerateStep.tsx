import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  List,
  Sparkles,
  Download,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { api, type TranscriptionResult } from '../../api/client'

export interface GenerateStepProps {
  result: TranscriptionResult | null
  onBack: () => void
}

export const GenerateStep = ({ result, onBack }: GenerateStepProps) => {
  const navigate = useNavigate()
  const [generatingType, setGeneratingType] = useState<'inventario' | 'levantamiento' | null>(null)
  const [generatedDoc, setGeneratedDoc] = useState<{
    type: 'inventario' | 'levantamiento'
    content: string
    title: string
  } | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const meetingTitle = result?.metadata?.title || 'Reunión de Levantamiento'

  const handleGenerateLive = async (type: 'inventario' | 'levantamiento') => {
    try {
      setGeneratingType(type)
      const query =
        type === 'inventario'
          ? `Genera el documento de Inventario de Requerimientos y Contexto del Proyecto basado en la sesión: ${meetingTitle}.`
          : `Genera el documento de Levantamiento Detallado de Requerimientos Funcionales, Historias de Usuario y Casos de Uso basado en la sesión: ${meetingTitle}.`

      const docIds = result?.document_id ? [result.document_id] : []

      const res = await (type === 'inventario'
        ? api.inventarioDoc({ query, document_ids: docIds })
        : api.levantamientoDoc({ query, document_ids: docIds }))

      const resObj = res as any
      const text = resObj.answer || resObj.answer_clean || resObj.markdown || resObj.reason || 'Documento generado con éxito.'
      setGeneratedDoc({
        type,
        content: text,
        title: `${type === 'inventario' ? 'Inventario' : 'Levantamiento'} - ${meetingTitle}`,
      })
    } finally {
      setGeneratingType(null)
    }
  }

  const handleDownloadDoc = async () => {
    if (!generatedDoc) return
    try {
      setIsExporting(true)
      const isInventario = generatedDoc.type === 'inventario'
      const blob = isInventario
        ? await api.exportInventarioXlsx(generatedDoc.content, generatedDoc.title)
        : await api.exportLevantamientoDocx(generatedDoc.content, generatedDoc.title)

      const ext = isInventario ? 'xlsx' : 'docx'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${generatedDoc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } finally {
      setIsExporting(false)
    }
  }

  const handleOpenInWorkspace = (type: 'inventario' | 'levantamiento') => {
    navigate(`/funcional/${type}`)
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Generar Documentación Funcional
        </h2>
        <p className="text-sm text-slate-600 mt-1.5">
          Selecciona el tipo de documento a generar a partir del contexto y la transcripción de la reunión
        </p>
      </div>

      {/* Document Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Inventario Card */}
        <div className="card p-6 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-lg transition rounded-2xl flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#002777] shadow-inner ring-1 ring-blue-100">
                <FileText className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#002777] text-xs font-bold border border-blue-100">
                Paso 1 Recomendado
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Inventario de Requerimientos
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Documento de visión inicial y contexto global. Consolida antecedentes, stakeholders, objetivos SMART, alcance preliminar y catálogo de requerimientos de alto nivel.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#004497]" />
                Información general y antecedentes
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#004497]" />
                Matriz de stakeholders identificados
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#004497]" />
                Catálogo inicial de requerimientos (INV-001)
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#004497]" />
                Matriz de riesgos y supuestos iniciales
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => handleGenerateLive('inventario')}
              disabled={generatingType !== null}
              className="w-full btn-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md shadow-blue-900/10"
            >
              {generatingType === 'inventario' ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Generando Inventario...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generar Inventario con IA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOpenInWorkspace('inventario')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-[#002777] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <span>Abrir en Espacio de Trabajo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Levantamiento Card */}
        <div className="card p-6 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition rounded-2xl flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-100">
                <List className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
                Paso 2 Detallado
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Levantamiento de Requerimientos
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Especificación funcional profunda. Detalla requerimientos funcionales con criterios de aceptación verificables, Historias de Usuario, Casos de Uso y Matriz de Trazabilidad.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Requerimientos funcionales con criterios de aceptación
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Historias de usuario (Como... Quiero... Para...)
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Casos de uso completos con flujos alternativos
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Reglas de negocio y matriz de trazabilidad
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => handleGenerateLive('levantamiento')}
              disabled={generatingType !== null}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-900/10"
            >
              {generatingType === 'levantamiento' ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Generando Levantamiento...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generar Levantamiento con IA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOpenInWorkspace('levantamiento')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <span>Abrir en Espacio de Trabajo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Generated Document Preview Panel */}
      {generatedDoc && (
        <div className="card p-6 bg-white border border-blue-200 rounded-2xl shadow-md space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-block mb-1">
                ✓ Documento Generado Exitosamente
              </span>
              <h3 className="text-base font-bold text-slate-900">{generatedDoc.title}</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadDoc}
                disabled={isExporting}
                className="px-4 py-2 bg-[#002777] hover:bg-[#004497] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting
                  ? 'Descargando...'
                  : generatedDoc.type === 'inventario'
                  ? 'Descargar en Excel (.xlsx)'
                  : 'Descargar en Word (.docx)'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenInWorkspace(generatedDoc.type)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#002777] rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200"
              >
                <span>Editar en Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed custom-scrollbar border border-slate-200">
            {generatedDoc.content}
          </div>
        </div>
      )}

      {/* Footer Back */}
      <div className="flex justify-start pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Resumen
        </button>
      </div>
    </div>
  )
}
