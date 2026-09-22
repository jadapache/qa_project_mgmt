import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  User,
  UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const LoginPage = () => {
  const { login, register, isAuthenticated, error, clearError, isLoading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessMsg(null)
    clearError()

    if (!username.trim() || !password.trim()) {
      setLocalError('Por favor completa los campos obligatorios.')
      return
    }

    try {
      if (mode === 'login') {
        await login(username.trim(), password)
        navigate('/', { replace: true })
      } else {
        const res = await register(username.trim(), password, email.trim(), fullName.trim())
        if (res.token) {
          navigate('/', { replace: true })
        } else {
          setSuccessMsg(
            res.message ||
              'Solicitud de acceso enviada correctamente. El administrador debe aprobar tu cuenta para que puedas ingresar.',
          )
          setUsername('')
          setPassword('')
          setEmail('')
          setFullName('')
          setMode('login')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud'
      setLocalError(msg)
    }
  }

  const switchTab = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setLocalError(null)
    setSuccessMsg(null)
    clearError()
  }

  const activeError = localError || error

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[linear-gradient(to_top_right,#8B0C3F_0%,#303E6D_100%)] p-4 sm:p-6 lg:p-8">
      {/* Subtle Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Main Card: Solid White */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition-all">
        {/* Card Header Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {mode === 'login' ? 'Iniciar Sesión' : 'Solicitud de Acceso'}
          </h1>
        </div>

        {/* Tab Switcher - Solid white background & navbar border styling */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5 border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#002777] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-[#002777] border border-[var(--color-border)]'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#002777] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-[#002777] border border-[var(--color-border)]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Solicitar Acceso
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {activeError && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nombre de Usuario <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. danipacheco"
                className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2.5 pl-10 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:outline-none focus:ring-2 focus:ring-[#002777]/20 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Fields for Registration */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ej. Daniel Pacheco"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2.5 pl-10 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:outline-none focus:ring-2 focus:ring-[#002777]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dominio.com"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2.5 pl-10 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:outline-none focus:ring-2 focus:ring-[#002777]/20 transition-all shadow-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2.5 pl-10 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:outline-none focus:ring-2 focus:ring-[#002777]/20 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#002777] hover:bg-[#00369d] py-3 text-xs font-bold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-[#002777]/30 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                Ingresar al Centro de Comando
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Enviar Solicitud de Acceso
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}


