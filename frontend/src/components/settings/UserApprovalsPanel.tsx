import { RefreshCw, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { UserApprovalsSkeleton } from '../common'
import { useUserApprovalsManager } from './hooks/useUserApprovalsManager'

export type UserApprovalsPanelProps = {
  userApprovalsManager?: ReturnType<typeof useUserApprovalsManager>
}

export const UserApprovalsPanel = ({ userApprovalsManager: externalManager }: UserApprovalsPanelProps) => {
  const internalManager = useUserApprovalsManager()
  const {
    pendingRequests,
    loadingRequests,
    loadAccessRequests,
    handleApproveRequest,
    handleRejectRequest,
  } = externalManager || internalManager

  return (
    <div className="card space-y-6 border border-[var(--color-border)] p-6 md:p-8">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#002777]" />
          <div>
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Solicitudes de Acceso Pendientes</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Gestión de aprobaciones para usuarios que han solicitado acceso a la plataforma.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadAccessRequests()}
          disabled={loadingRequests}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {loadingRequests && pendingRequests.length === 0 ? (
        <UserApprovalsSkeleton />
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500 space-y-2">
          <UserCheck className="h-8 w-8 mx-auto text-slate-400" />
          <p className="font-semibold text-slate-700 text-sm">No hay solicitudes pendientes</p>
          <p className="text-slate-500">Todas las solicitudes de registro han sido procesadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm hover:border-blue-200 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{req.username}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Pendiente de aprobación
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {req.full_name || 'Sin nombre'} • {req.email || 'Sin correo electrónico'}
                </p>
                {req.created_at ? (
                  <p className="text-[11px] text-slate-400">Solicitado: {req.created_at}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleApproveRequest(req.id, req.username)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Aprobar Acceso</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRejectRequest(req.id, req.username)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <UserX className="h-4 w-4" />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
