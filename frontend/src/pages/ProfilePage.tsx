import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

export const ProfilePage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const { user, updateUser } = useAuth()

  // Form Fields
  const [fullName, setFullName] = useState(user?.full_name || displayName)
  const [email, setEmail] = useState(
    user?.email || (user?.username ? `${user.username.toLowerCase()}@fcv.org` : 'danielpacheco@fcv.org'),
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Standup Rubric State
  const [standupRubric, setStandupRubric] = useState('')

  // Status & Feedback
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingRubric, setSavingRubric] = useState(false)

  const activeFullName = user?.full_name || fullName || displayName
  const activeEmail = user?.email || email
  const activeRole = user?.role ? (user.role === 'admin' ? 'Administrador' : 'Usuario') : 'Usuario'

  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const initials = getInitials(activeFullName)

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name)
    } else if (displayName) {
      setFullName(displayName)
    }
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user, displayName])

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // 1. Validar Nombres
    const cleanName = fullName.trim()
    if (!cleanName) {
      errors.fullName = 'El nombre completo es obligatorio.'
    } else if (cleanName.length < 3) {
      errors.fullName = 'El nombre debe tener al menos 3 caracteres.'
    }

    // 2. Validar Correo Electrónico
    const cleanEmail = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!cleanEmail) {
      errors.email = 'El correo electrónico es obligatorio.'
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Por favor ingresa un correo electrónico válido (ej. usuario@fcv.org).'
    }

    // 3. Validar Contraseña (si se proporciona)
    if (password) {
      if (password.length < 6) {
        errors.password = 'La nueva contraseña debe tener al menos 6 caracteres.'
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden.'
      }
    } else if (confirmPassword) {
      errors.password = 'Ingresa la nueva contraseña antes de confirmarla.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!validateForm()) {
      return
    }

    setSavingProfile(true)
    try {
      const payload: { full_name: string; email: string; password?: string } = {
        full_name: fullName.trim(),
        email: email.trim(),
      }
      if (password.trim()) {
        payload.password = password.trim()
      }

      // 1. Actualizar perfil y credenciales en backend
      const res = await api.updateProfile(payload)

      // 2. Actualizar contexto de sesión
      if (res.user) {
        updateUser(res.user)
      }

      // 3. Sincronizar display_name general
      const updatedSettings = await api.updateSettings({ display_name: fullName.trim() })
      if (updatedSettings.display_name) {
        setDisplayName(updatedSettings.display_name)
      }

      // Limpiar campos de contraseña tras guardado exitoso
      setPassword('')
      setConfirmPassword('')
      setFormErrors({})
      setMessage('Datos del perfil y credenciales actualizados exitosamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil de usuario')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRubricSubmit = async (event: FormEvent) => {
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
          Administra tus datos personales, correo, credenciales de acceso y configuración de rúbricas de evaluación.
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
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#002777] to-[#004497] text-white font-extrabold text-2xl shadow-lg shadow-[#002777]/25 ring-4 ring-blue-100">
            {initials}
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold text-slate-900 truncate" title={activeFullName}>
                {activeFullName}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-xs font-semibold text-[#002777]">
                <Shield className="h-3 w-3" /> {activeRole}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2 truncate" title={activeEmail}>
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{activeEmail}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PANEL: MODIFICACIÓN DE DATOS CON VALIDACIONES (Nombres, Correo, Contraseña) */}
        <form
          onSubmit={(e) => void handleProfileSubmit(e)}
          className="card space-y-5 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Datos Personales y Credenciales</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actualiza tu nombre completo, correo corporativo y contraseña de acceso.
                </p>
              </div>
            </div>

            {/* Campo: Nombres */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Nombres y Apellidos *</span>
                {formErrors.fullName && (
                  <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.fullName}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (formErrors.fullName) {
                      setFormErrors((prev) => {
                        const next = { ...prev }
                        delete next.fullName
                        return next
                      })
                    }
                  }}
                  placeholder="Ej. Daniel Pacheco"
                  className={[
                    'input-field text-sm font-medium text-slate-900 border rounded-xl transition',
                    formErrors.fullName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-500',
                  ].join(' ')}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Visible en saludos y encabezados (ej. Herramientas de {fullName.trim() || displayName}).
              </p>
            </div>

            {/* Campo: Correo Electrónico */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Correo Electrónico *</span>
                {formErrors.email && (
                  <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {formErrors.email}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (formErrors.email) {
                      setFormErrors((prev) => {
                        const next = { ...prev }
                        delete next.email
                        return next
                      })
                    }
                  }}
                  placeholder="ejemplo@fcv.org"
                  className={[
                    'input-field text-sm font-medium text-slate-900 border rounded-xl transition',
                    formErrors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-500',
                  ].join(' ')}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Utilizado para inicio de sesión, notificaciones y solicitudes de acceso.
              </p>
            </div>

            {/* Separador de Seguridad */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                <Lock className="h-3.5 w-3.5 text-[#002777]" /> Modificar Contraseña (Opcional)
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Campo: Nueva Contraseña */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (formErrors.password) {
                          setFormErrors((prev) => {
                            const next = { ...prev }
                            delete next.password
                            return next
                          })
                        }
                      }}
                      placeholder="••••••••"
                      className={[
                        'input-field pr-9 text-sm font-mono border rounded-xl transition',
                        formErrors.password
                          ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                          : 'border-slate-300 focus:border-blue-500',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-[11px] font-medium text-red-600 mt-0.5">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Campo: Confirmar Contraseña */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (formErrors.confirmPassword) {
                          setFormErrors((prev) => {
                            const next = { ...prev }
                            delete next.confirmPassword
                            return next
                          })
                        }
                      }}
                      placeholder="••••••••"
                      className={[
                        'input-field pr-9 text-sm font-mono border rounded-xl transition',
                        formErrors.confirmPassword
                          ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                          : 'border-slate-300 focus:border-blue-500',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-[11px] font-medium text-red-600 mt-0.5">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Deja los campos de contraseña en blanco si deseas conservar tu contraseña actual.
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
              <span>{savingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
            </button>
          </div>
        </form>

        {/* Formulario de Rúbricas de Evaluación Standup */}
        <form
          onSubmit={(e) => void handleRubricSubmit(e)}
          className="card space-y-5 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl flex flex-col justify-between"
        >
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
                rows={9}
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
