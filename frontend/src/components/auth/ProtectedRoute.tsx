import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Sparkles } from 'lucide-react'

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[linear-gradient(to_top_right,#8B0C3F_0%,#303E6D_100%)] p-4">
        
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B0C3F] to-[#303E6D] text-white shadow-xl shadow-[#8B0C3F]/50 ring-2 ring-white/10 animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-slate-200">Verificando sesión segura...</p>
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#8B0C3F] via-[#5D1F49] to-[#303E6D]" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
