import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { login, register, error, clearError, isLoading } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!username.trim() || !password.trim()) {
      setLocalError('Por favor completa los campos obligatorios.')
      return
    }

    try {
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register(username.trim(), password, email.trim(), fullName.trim())
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error en la autenticación'
      setLocalError(msg)
    }
  }

  const switchTab = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setLocalError(null)
    clearError()
  }

  const activeError = localError || error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#004497]/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-[#002777]/20 backdrop-blur-xl">
        {/* Glowing Ambient Background */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#002777]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-[#004497]/30 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#002777] to-[#004497] shadow-lg shadow-[#002777]/40 ring-1 ring-white/10">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            QA Project Management
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Centro de Comando Local con Autenticación Segura (SHA-256 + Salt)
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-950/60 p-1 ring-1 ring-white/5">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-[#002777] text-white shadow-md shadow-[#002777]/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-[#002777] text-white shadow-md shadow-[#002777]/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Crear Cuenta
          </button>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nombre de Usuario <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. danipacheco"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-[#004497] focus:outline-none focus:ring-1 focus:ring-[#004497] transition-all"
              />
            </div>
          </div>

          {/* Additional fields for Register */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ej. Daniel Pacheco"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-[#004497] focus:outline-none focus:ring-1 focus:ring-[#004497] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dominio.com"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-[#004497] focus:outline-none focus:ring-1 focus:ring-[#004497] transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 pl-10 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:border-[#004497] focus:outline-none focus:ring-1 focus:ring-[#004497] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#002777] to-[#004497] py-3 text-xs font-bold text-white shadow-lg shadow-[#002777]/40 hover:from-[#003399] hover:to-[#0055b8] focus:outline-none focus:ring-2 focus:ring-[#004497] disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
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
                Registrar Cuenta Segura
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
