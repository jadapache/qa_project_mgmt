import React, { useEffect, useState } from 'react'
import {
  FileAudio,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Edit2,
  Check,
  ShieldCheck,
  Layers,
  Clock,
  Plus,
} from 'lucide-react'
import { levantamientosApi, LevantamientoSession, StoryProposal } from '../../api'
import { useToast } from '../../context/ToastContext'
import { isTauriAvailable, pickMediaFile, transcribeMedia, cancelTranscription, TranscriptionProgress } from '../../services/transcription'

export const LevantamientoPage: React.FC = () => {
  const { showToast } = useToast()

  // Estado del Wizard: 1 = Selector / Carga local, 2 = Revisión de Transcript, 3 = Propuestas de Historias, 4 = Historial
  const [step, setStep] = useState<number>(1)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [webFile, setWebFile] = useState<File | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null)
  
  // Transcripción y consentimiento
  const [transcript, setTranscript] = useState('')
  const [confirmedCloudSend, setConfirmedCloudSend] = useState(false)
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false)

  // Sesión backend activa
  const [currentSession, setCurrentSession] = useState<LevantamientoSession | null>(null)
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCriteria, setEditCriteria] = useState('')
  const [editPriority, setEditPriority] = useState('MEDIA')

  // Selección e Importación
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([])
  const [targetIteration, setTargetIteration] = useState('Sprint 1 - Iteración Activa')
  const [isImporting, setIsImporting] = useState(false)

  // Historial
  const [sessionsHistory, setSessionsHistory] = useState<LevantamientoSession[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const data = await levantamientosApi.listProjectSessions('default')
      setSessionsHistory(data)
    } catch (err) {
      console.error('Error cargando historial de levantamientos:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Paso 1: Seleccionar archivo
  const handleSelectFile = async () => {
    try {
      if (isTauriAvailable()) {
        const path = await pickMediaFile()
        if (path) {
          setSelectedFile(path)
          setWebFile(null)
        }
      } else {
        // En entorno web se usa input file estándar
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'audio/*,video/*'
        input.onchange = (e: any) => {
          const file = e.target.files?.[0]
          if (file) {
            setWebFile(file)
            setSelectedFile(file.name)
          }
        }
        input.click()
      }
    } catch (err: any) {
      showToast(err.message || 'Error seleccionando el archivo', 'error')
    }
  }

  // Paso 1 -> 2: Iniciar Transcripción Local STT
  const handleStartTranscription = async () => {
    if (!selectedFile) return
    setIsTranscribing(true)
    setProgress({ percentage: 5, status: 'Iniciando pipeline de medios local...', current_time_sec: 0 })

    try {
      const result = await transcribeMedia(
        selectedFile,
        (p) => setProgress(p),
        'es'
      )
      setTranscript(result.text)
      setStep(2)
      showToast('Transcripción local completada exitosamente', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error durante la transcripción', 'error')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleCancelTranscription = async () => {
    await cancelTranscription()
    setIsTranscribing(false)
    showToast('Transcripción cancelada', 'warning')
  }

  // Paso 2 -> 3: Enviar Transcript al Backend / LLM
  const handleSendToLLM = async () => {
    if (!confirmedCloudSend) {
      showToast('Por favor confirma el aviso de envío del texto al LLM remoto', 'warning')
      return
    }

    setIsSubmittingCloud(true)
    try {
      const session = await levantamientosApi.createSession({
        project_id: 'default',
        source_label: selectedFile ? `Local STT: ${selectedFile.split('\\').pop()}` : 'Transcripción Local',
        transcript: transcript,
        llm_model: 'default',
      })

      setCurrentSession(session)
      showToast('Sesión registrada. Generando propuestas de Historias...', 'info')

      // Polling para esperar estado Listo
      let attempts = 0
      const interval = setInterval(async () => {
        attempts += 1
        try {
          const updated = await levantamientosApi.getSession(session.id)
          setCurrentSession(updated)
          if (updated.status === 'Listo') {
            clearInterval(interval)
            setIsSubmittingCloud(false)
            setSelectedProposalIds(updated.proposals.map((p) => p.id))
            setStep(3)
            loadHistory()
            showToast(`¡${updated.proposals.length} propuestas de Historias generadas!`, 'success')
          } else if (updated.status === 'Error') {
            clearInterval(interval)
            setIsSubmittingCloud(false)
            showToast(`Error en generación: ${updated.error_message}`, 'error')
          }
        } catch (e) {
          console.error(e)
        }

        if (attempts > 20) {
          clearInterval(interval)
          setIsSubmittingCloud(false)
          showToast('El procesamiento está tomando más de lo esperado. Revisa el historial.', 'warning')
        }
      }, 1500)

    } catch (err: any) {
      setIsSubmittingCloud(false)
      showToast(err.message || 'Error al enviar la transcripción', 'error')
    }
  }

  // Edición de propuesta inline
  const handleStartEdit = (prop: StoryProposal) => {
    setEditingProposalId(prop.id)
    setEditTitle(prop.title)
    setEditDescription(prop.description)
    setEditCriteria(prop.acceptance_criteria || '')
    setEditPriority(prop.priority)
  }

  const handleSaveEdit = async (propId: string) => {
    if (!currentSession) return
    try {
      const updatedProp = await levantamientosApi.updateProposal(currentSession.id, propId, {
        title: editTitle,
        description: editDescription,
        acceptance_criteria: editCriteria,
        priority: editPriority,
      })

      setCurrentSession({
        ...currentSession,
        proposals: currentSession.proposals.map((p) => (p.id === propId ? updatedProp : p)),
      })
      setEditingProposalId(null)
      showToast('Propuesta actualizada', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar propuesta', 'error')
    }
  }

  // Importar seleccionadas al backlog / iteración
  const handleImportSelected = async () => {
    if (!currentSession || selectedProposalIds.length === 0) {
      showToast('Selecciona al menos una propuesta para importar', 'warning')
      return
    }

    setIsImporting(true)
    try {
      const res = await levantamientosApi.importProposals(currentSession.id, {
        iteration_id: targetIteration,
        proposal_ids: selectedProposalIds,
      })

      const updated = await levantamientosApi.getSession(currentSession.id)
      setCurrentSession(updated)
      showToast(res.message, 'success')
      loadHistory()
    } catch (err: any) {
      showToast(err.message || 'Error al importar propuestas', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const toggleSelectAll = () => {
    if (!currentSession) return
    if (selectedProposalIds.length === currentSession.proposals.length) {
      setSelectedProposalIds([])
    } else {
      setSelectedProposalIds(currentSession.proposals.map((p) => p.id))
    }
  }

  const toggleSelectProposal = (id: string) => {
    setSelectedProposalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">
              Módulo Funcional
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              STT Local + IA Remota
            </span>
          </div>
          <h1 className="page-title mt-1">Levantamiento de Requerimientos</h1>
          <p className="page-subtitle">
            Transcripción local de audio/video y estructuración automática de Historias de Usuario para el backlog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep(4)}
            className={`btn ${step === 4 ? 'btn-primary' : 'btn-secondary'} text-xs`}
          >
            <Clock className="h-3.5 w-3.5" />
            Historial de Sesiones ({sessionsHistory.length})
          </button>
          {step !== 1 && (
            <button
              onClick={() => {
                setStep(1)
                setSelectedFile(null)
                setTranscript('')
                setCurrentSession(null)
              }}
              className="btn btn-secondary text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo Levantamiento
            </button>
          )}
        </div>
      </header>

      {/* Stepper Navigation */}
      {step !== 4 && (
        <nav className="flex items-center justify-between rounded-xl bg-white p-4 border border-[var(--color-border)] shadow-sm">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? 'text-[#002777]' : 'text-slate-500'}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? 'bg-[#002777] text-white' : 'bg-slate-100 text-slate-600'}`}>
              1
            </span>
            <span>Transcripción STT Local</span>
          </div>

          <ArrowRight className="h-4 w-4 text-slate-300" />

          <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? 'text-[#002777]' : 'text-slate-500'}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? 'bg-[#002777] text-white' : 'bg-slate-100 text-slate-600'}`}>
              2
            </span>
            <span>Revisión y Privacidad</span>
          </div>

          <ArrowRight className="h-4 w-4 text-slate-300" />

          <div className={`flex items-center gap-2 text-sm font-medium ${step === 3 ? 'text-[#002777]' : 'text-slate-500'}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === 3 ? 'bg-[#002777] text-white' : 'bg-slate-100 text-slate-600'}`}>
              3
            </span>
            <span>Propuestas de Historias</span>
          </div>
        </nav>
      )}

      {/* PASO 1: SELECCIÓN Y TRANCRIPCIÓN LOCAL */}
      {step === 1 && (
        <section className="card p-8 bg-white border border-slate-200 shadow-md space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#002777]">
                <FileAudio className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Selección de Archivo de Audio o Video</h2>
                <p className="text-xs text-slate-500">
                  El archivo se procesará 100% en tu equipo local usando Whisper/ffmpeg. Ningún archivo binario se subirá a servidores externos.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {isTauriAvailable() ? 'Entorno Desktop Tauri (Nativo)' : 'Entorno Web (Modo Demo)'}
            </span>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-4 hover:border-blue-300 transition-colors">
            <Upload className="h-10 w-10 mx-auto text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedFile ? `Archivo seleccionado: ${selectedFile}` : 'Elige una grabación de reunión o entrevista'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Soporta formatos .mp3, .wav, .m4a, .mp4, .mkv, .webm</p>
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={handleSelectFile} className="btn btn-secondary text-xs">
                {selectedFile ? 'Cambiar Archivo' : 'Explorar Archivo Local'}
              </button>
            </div>
          </div>

          {selectedFile && !isTranscribing && (
            <div className="flex justify-end">
              <button onClick={handleStartTranscription} className="btn btn-primary text-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Iniciar Transcripción Local
              </button>
            </div>
          )}

          {isTranscribing && progress && (
            <div className="space-y-3 rounded-xl bg-blue-50/50 p-5 border border-blue-100">
              <div className="flex justify-between items-center text-xs text-[#002777] font-semibold">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  {progress.status}
                </span>
                <span>{progress.percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#002777] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Tiempo aproximado procesado: {progress.current_time_sec.toFixed(0)}s</span>
                <button onClick={handleCancelTranscription} className="text-red-600 hover:underline font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PASO 2: REVISIÓN DE TRANSCRIPT Y CONFIRMACIÓN DE PRIVACIDAD */}
      {step === 2 && (
        <section className="card p-8 bg-white border border-slate-200 shadow-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Revisión de Transcripción y Consentimiento de IA</h2>
              <p className="text-xs text-slate-500">
                Puedes editar o complementar el texto antes de enviarlo al modelo de lenguaje en la nube.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Texto de Transcripción (Editable)
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-slate-200 p-4 text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs text-amber-900">
              <p className="font-semibold">Política de Privacidad y Procesamiento en Nube:</p>
              <p>
                Al continuar, solo el texto mostrado arriba será enviado al servicio LLM en la nube para estructurar las historias de usuario. Tu archivo multimedia original no sale de tu equipo.
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer font-medium text-amber-950">
                <input
                  type="checkbox"
                  checked={confirmedCloudSend}
                  onChange={(e) => setConfirmedCloudSend(e.target.checked)}
                  className="rounded border-amber-300 text-[#002777] focus:ring-[#002777]"
                />
                Confirmo y autorizo el envío de este texto al servicio LLM corporativo.
              </label>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn btn-secondary text-xs">
              Atrás
            </button>
            <button
              onClick={handleSendToLLM}
              disabled={!confirmedCloudSend || isSubmittingCloud || !transcript.trim()}
              className="btn btn-primary text-xs flex items-center gap-2"
            >
              {isSubmittingCloud ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generando Propuestas con LLM...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Historias de Usuario
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* PASO 3: PROPUESTAS DE HISTORIAS E IMPORTACIÓN */}
      {step === 3 && currentSession && (
        <section className="space-y-6">
          <div className="card p-6 bg-white border border-slate-200 shadow-md flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Propuestas de Historias Generadas ({currentSession.proposals.length})</h2>
              <p className="text-xs text-slate-500">
                Revisa, edita las historias necesarias y selecciona cuáles deseas importar a la iteración.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Iteración Destino</span>
                <select
                  value={targetIteration}
                  onChange={(e) => setTargetIteration(e.target.value)}
                  className="text-xs font-semibold rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 text-slate-800"
                >
                  <option value="Sprint 1 - Iteración Activa">Sprint 1 - Iteración Activa</option>
                  <option value="Sprint 2 - Planificación">Sprint 2 - Planificación</option>
                  <option value="Backlog General">Backlog General</option>
                </select>
              </div>

              <button
                onClick={handleImportSelected}
                disabled={isImporting || selectedProposalIds.length === 0}
                className="btn btn-primary text-xs flex items-center gap-2"
              >
                {isImporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-4 w-4" />}
                Importar Seleccionadas ({selectedProposalIds.length})
              </button>
            </div>
          </div>

          {/* Selector general */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={selectedProposalIds.length === currentSession.proposals.length && currentSession.proposals.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-[#002777]"
              />
              Seleccionar todas las propuestas
            </label>
            <span>{selectedProposalIds.length} de {currentSession.proposals.length} seleccionadas</span>
          </div>

          {/* Grilla de propuestas */}
          <div className="grid gap-4">
            {currentSession.proposals.map((prop) => {
              const isEditing = editingProposalId === prop.id
              const isSelected = selectedProposalIds.includes(prop.id)
              const isImported = prop.status === 'Importada'

              return (
                <div
                  key={prop.id}
                  className={`card p-6 transition-all border ${
                    isImported
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : isSelected
                      ? 'bg-blue-50/20 border-blue-300 shadow-sm'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      disabled={isImported}
                      checked={isSelected}
                      onChange={() => toggleSelectProposal(prop.id)}
                      className="mt-1 rounded border-slate-300 text-[#002777]"
                    />

                    <div className="flex-1 space-y-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-900"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                          />
                          <textarea
                            value={editCriteria}
                            onChange={(e) => setEditCriteria(e.target.value)}
                            rows={2}
                            placeholder="Criterios de Aceptación (Gherkin)"
                            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 font-mono"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                              className="text-xs rounded-lg border border-slate-300 p-1"
                            >
                              <option value="ALTA">Prioridad ALTA</option>
                              <option value="MEDIA">Prioridad MEDIA</option>
                              <option value="BAJA">Prioridad BAJA</option>
                            </select>

                            <button onClick={() => handleSaveEdit(prop.id)} className="btn btn-primary text-xs flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Guardar
                            </button>
                            <button onClick={() => setEditingProposalId(null)} className="btn btn-secondary text-xs">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{prop.title}</h3>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    prop.priority === 'ALTA'
                                      ? 'bg-red-100 text-red-800'
                                      : prop.priority === 'MEDIA'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {prop.priority}
                                </span>
                                {isImported && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Importada ({prop.imported_story_id})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{prop.description}</p>
                            </div>

                            {!isImported && (
                              <button onClick={() => handleStartEdit(prop)} className="text-slate-400 hover:text-blue-600 p-1">
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {prop.acceptance_criteria && (
                            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs font-mono text-slate-700 leading-relaxed">
                              <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Criterios de Aceptación</span>
                              {prop.acceptance_criteria}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* PASO 4: HISTORIAL DE SESIONES */}
      {step === 4 && (
        <section className="card p-6 bg-white border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Historial de Sesiones de Levantamiento</h2>
              <p className="text-xs text-slate-500">Sesiones previas de transcripción e historias generadas.</p>
            </div>
            <button onClick={loadHistory} className="btn btn-secondary text-xs flex items-center gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {sessionsHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No hay sesiones de levantamiento registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessionsHistory.map((session) => (
                <div key={session.id} className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{session.source_label || 'Sesión de Levantamiento'}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        session.status === 'Listo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">{session.transcript}</p>
                    <span className="text-[10px] text-slate-400">{new Date(session.created_at).toLocaleString()} • {session.proposals.length} propuestas</span>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentSession(session)
                      setSelectedProposalIds(session.proposals.map((p) => p.id))
                      setStep(3)
                    }}
                    className="btn btn-secondary text-xs"
                  >
                    Ver Propuestas
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
