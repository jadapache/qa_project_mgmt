import { useState, useEffect } from 'react'
import {
  Clock,
  Trash2,
  ExternalLink,
  Search,
  FileAudio,
  X,
  RefreshCw,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { api, type TranscriptionResult } from '../../api/client'

export interface TranscriptionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (record: TranscriptionResult) => void
}

export const TranscriptionHistoryModal = ({
  isOpen,
  onClose,
  onSelect,
}: TranscriptionHistoryModalProps) => {
  const [items, setItems] = useState<TranscriptionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadList = async () => {
    try {
      setLoading(true)
      const res = await api.listTranscriptions()
      setItems(res.transcriptions || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadList()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('¿Seguro que deseas eliminar esta transcripción y sus archivos asociados?')) return
    await api.deleteTranscription(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const filtered = items.filter((item) => {
    const title = item.metadata?.title || ''
    const desc = item.metadata?.description || ''
    const term = searchTerm.toLowerCase()
    return title.toLowerCase().includes(term) || desc.toLowerCase().includes(term)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historial de Transcripciones</h3>
            <p className="text-xs text-slate-500">
              Selecciona una sesión previa para revisar su resumen o generar documentos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadList}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              title="Recargar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título de reunión..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002777]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="h-6 w-6 border-2 border-[#002777] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Cargando historial...
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item)
                  onClose()
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#002777] group-hover:bg-[#002777] group-hover:text-white transition">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#002777] transition">
                      {item.metadata?.title || 'Reunión sin título'}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {item.metadata?.description || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.summary?.participants?.length || 0} participantes
                      </span>
                      {item.saved_to_knowledge && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> En biblioteca
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar transcripción"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <span className="px-3 py-1.5 bg-blue-50 text-[#002777] text-xs font-bold rounded-lg border border-blue-200/60 group-hover:bg-[#002777] group-hover:text-white transition flex items-center gap-1">
                    Abrir <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No hay transcripciones guardadas todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
