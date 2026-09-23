import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import { api } from '../api/client'
import { DEFAULT_DISPLAY_NAME } from '../constants/app'
import { useAuth } from '../context/AuthContext'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

export const ProfilePage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const { user, isAuthenticated } = useAuth()

  const [name, setName] = useState(displayName)
  const [standupRubric, setStandupRubric] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingRubric, setSavingRubric] = useState(false)

  const activeFullName = user?.full_name || displayName
  const activeEmail = user?.email || (user?.username ? `${user.username.toLowerCase()}@fcv.org` : 'danielpacheco@fcv.org')
  const activeRole = user?.role ? (user.role === 'admin' ? 'Administrador' : 'Usuario') : 'Usuario'

  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const initials = getInitials(activeFullName)

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  useEffect(() => {
    const load = async () => {
      try {
        const rubric = await api.getRubric('standup')
        setStandupRubric(((rubric.criteria as string[]) || []).join('\n'))
      } catch {
        // ignore on boot
      }
    }
    void load()
  }, [])

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSavingProfile(true)
    try {
      const updated = await api.updateSettings({ display_name: name.trim() || DEFAULT_DISPLAY_NAME })
      setDisplayName(updated.display_name ?? name)
      setMessage('Perfil guardado exitosamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRubric = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSavingRubric(true)
    try {
      const criteria = standupRubric
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      await api.updateRubric('standup', criteria)
      setMessage('Rúbrica de evaluación Standup actualizada exitosamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la rúbrica')
    } finally {
      setSavingRubric(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">Cuenta & Usuario</p>
        </div>
        <h1 className="page-title">Perfil & Preferencias</h1>
        <p className="page-subtitle">
          Administra tus datos personales, nombre visible y configuración de rúbricas de evaluación.
        </p>
      </header>

      {/* Global Alerts */}
      {message ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Tarjeta de Identidad de Usuario (Estilo Dropdown & Perfil) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-extrabold text-2xl shadow-lg ring-4 ring-amber-100">
            {initials}
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold text-slate-900 truncate">{activeFullName}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-xs font-semibold text-[#002777]">
                <Shield className="h-3 w-3" /> {activeRole}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isAuthenticated ? 'Activo' : 'Sesión Local'}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{activeEmail}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario de Perfil */}
        <form onSubmit={(e) => void handleProfile(e)} className="card space-y-5 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Información del Perfil</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nombre a mostrar en saludos y encabezados del sistema.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Nombre a mostrar
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Daniel Pacheco"
                className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                Aparecerá en los encabezados del sistema (ej. Herramientas de {name || displayName}).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Correo Electrónico
              </label>
              <input
                type="text"
                value={activeEmail}
                disabled
                className="input-field text-sm font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                Asociado a tu cuenta de usuario corporativa.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer text-sm"
            >
              <Check className="h-4 w-4" />
              <span>{savingProfile ? 'Guardando...' : 'Guardar Perfil'}</span>
            </button>
          </div>
        </form>

        {/* Formulario de Rúbricas de Evaluación Standup */}
        <form onSubmit={(e) => void handleRubric(e)} className="card space-y-5 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Rúbrica de Evaluación Standup</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Criterios utilizados para validar la completitud del resumen diario.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Criterios (uno por línea)
              </label>
              <textarea
                value={standupRubric}
                onChange={(e) => setStandupRubric(e.target.value)}
                rows={6}
                placeholder="Un criterio por línea..."
                className="input-field font-mono text-xs leading-relaxed border border-slate-300 rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                El agente de IA evaluará las respuestas del standup comparándolas contra estas pautas.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingRubric}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer text-sm"
            >
              <Check className="h-4 w-4" />
              <span>{savingRubric ? 'Guardando...' : 'Guardar Rúbrica'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
