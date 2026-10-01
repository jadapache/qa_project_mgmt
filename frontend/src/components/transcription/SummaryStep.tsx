import { useState } from 'react'
import {
  Users,
  FileText,
  CheckCircle2,
  Lightbulb,
  CheckSquare,
  BookmarkCheck,
  Edit3,
  Save,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import type { TranscriptionSummary } from '../../api/client'

export interface SummaryStepProps {
  summary: TranscriptionSummary | null
  savedToKnowledge?: boolean
  onUpdateSummary: (summary: TranscriptionSummary) => Promise<any>
  onSaveToKnowledge: (tags: string[]) => Promise<any>
  onBack: () => void
  onNext: () => void
}

export const SummaryStep = ({
  summary,
  savedToKnowledge = false,
  onUpdateSummary,
  onSaveToKnowledge,
  onBack,
  onNext,
}: SummaryStepProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState<TranscriptionSummary>(
    summary || {
      participants: ['Participante 1', 'Participante 2'],
      topics: ['Definición de requerimientos'],
      decisions: ['Acuerdos del proyecto'],
      requirements: ['Requerimiento inicial'],
      action_items: ['Continuar con levantamiento'],
    }
  )
  const [saveToKb, setSaveToKb] = useState(true)
  const [customTagsInput, setCustomTagsInput] = useState('reunion, minuta, funcional')
  const [isSavingKb, setIsSavingKb] = useState(false)
  const [isSaved, setIsSaved] = useState(savedToKnowledge)

  const handleSaveEdit = async () => {
    await onUpdateSummary(editedSummary)
    setIsEditing(false)
  }

  const handleSaveToKbAction = async () => {
    if (!saveToKb || isSaved) return
    try {
      setIsSavingKb(true)
      const tags = customTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await onSaveToKnowledge(tags)
      setIsSaved(true)
    } finally {
      setIsSavingKb(false)
    }
  }

  const handleProceed = async () => {
    if (saveToKb && !isSaved) {
      await handleSaveToKbAction()
    }
    onNext()
  }

  const addItem = (field: keyof TranscriptionSummary) => {
    setEditedSummary((prev) => ({
      ...prev,
      [field]: [...prev[field], 'Nuevo elemento'],
    }))
  }

  const updateItem = (field: keyof TranscriptionSummary, index: number, value: string) => {
    setEditedSummary((prev) => {
      const copy = [...prev[field]]
      copy[index] = value
      return { ...prev, [field]: copy }
    })
  }

  const removeItem = (field: keyof TranscriptionSummary, index: number) => {
    setEditedSummary((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Resumen Ejecutivo Estructurado
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Revisa los puntos clave extraídos por la IA antes de generar los documentos funcionales
          </p>
        </div>

        <button
          type="button"
          onClick={() => (isEditing ? handleSaveEdit() : setIsEditing(true))}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
            isEditing
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-white hover:bg-slate-50 text-[#002777] border border-blue-200'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4" /> Guardar Edición
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4" /> Editar Resumen
            </>
          )}
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Participants */}
        <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#002777]">
              <Users className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-900">Participantes Identificados</h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => addItem('participants')}
                className="text-xs text-[#004497] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {editedSummary.participants.map((p, idx) =>
              isEditing ? (
                <div key={idx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updateItem('participants', idx, e.target.value)}
                    className="text-xs bg-transparent border-none focus:outline-none w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem('participants', idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-50 text-[#002777] border border-blue-100 rounded-lg text-xs font-semibold"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-blue-600">
              <FileText className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-900">Temas Clave Tratados</h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => addItem('topics')}
                className="text-xs text-[#004497] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            )}
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {editedSummary.topics.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#004497] font-bold mt-0.5">•</span>
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem('topics', idx, e.target.value)}
                      className="text-xs w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem('topics', idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{item}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Decisions */}
        <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-600">
              <CheckSquare className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-900">Decisiones y Acuerdos</h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => addItem('decisions')}
                className="text-xs text-[#004497] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            )}
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {editedSummary.decisions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem('decisions', idx, e.target.value)}
                      className="text-xs w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem('decisions', idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{item}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-600">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-bold text-sm text-slate-900">Requerimientos Mencionados</h3>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => addItem('requirements')}
                className="text-xs text-[#004497] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir
              </button>
            )}
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {editedSummary.requirements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem('requirements', idx, e.target.value)}
                      className="text-xs w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem('requirements', idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{item}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Knowledge Base Ingestion Card */}
      <div className="card p-5 bg-gradient-to-r from-blue-50/60 via-white to-blue-50/60 border border-blue-200/80 rounded-2xl shadow-sm space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={saveToKb}
            disabled={isSaved}
            onChange={(e) => setSaveToKb(e.target.checked)}
            className="h-5 w-5 rounded text-[#002777] border-slate-300 mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                Guardar en la Biblioteca de Conocimiento (RAG)
              </span>
              {isSaved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <BookmarkCheck className="h-3 w-3" /> Guardado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Indexa la minuta y transcripción completa para que el asistente de IA y los generadores de Inventario y Levantamiento puedan citarla y reutilizarla.
            </p>

            {saveToKb && !isSaved && (
              <div className="mt-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Etiquetas de búsqueda (separadas por coma):
                </label>
                <input
                  type="text"
                  value={customTagsInput}
                  onChange={(e) => setCustomTagsInput(e.target.value)}
                  placeholder="ej. kickoff, modulo_autenticacion, sprint_2"
                  className="w-full max-w-md px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Transcripción
        </button>

        <button
          type="button"
          onClick={handleProceed}
          disabled={isSavingKb}
          className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {isSavingKb ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Guardando en Biblioteca...</span>
            </>
          ) : (
            <>
              <span>Continuar a Generación de Documentos</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
