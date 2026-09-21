import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ShieldCheck, Search, Filter, ChevronLeft, ChevronRight, 
  Loader2, AlertTriangle, FileText, User 
} from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  operation_type: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [operationType, setOperationType] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, operationType, userIdFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLog(page, pageSize, operationType || undefined, userIdFilter || undefined);
      setLogs(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError('Error al obtener los registros de auditoría.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getOperationBadge = (op: string) => {
    if (op.includes('CREATE') || op.includes('UPLOAD')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (op.includes('UPDATE') || op.includes('APPROVE') || op.includes('SYNC')) {
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    }
    if (op.includes('DELETE') || op.includes('REJECT')) {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
    return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Bitácora de Auditoría (Audit Log)</h1>
            <p className="text-xs text-slate-400">Registro inmutable de trazabilidad de operaciones del sistema</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 font-mono">
          Total Entradas: <span className="text-indigo-400 font-bold">{totalCount}</span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={operationType}
              onChange={(e) => { setOperationType(e.target.value); setPage(1); }}
              className="bg-slate-800/80 border border-slate-700/80 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="">Todas las Operaciones</option>
              <option value="USER_LOGIN">USER_LOGIN</option>
              <option value="PROJECT_CREATE">PROJECT_CREATE</option>
              <option value="TEST_CASE_EXECUTE">TEST_CASE_EXECUTE</option>
              <option value="DEFECT_SYNC_JIRA">DEFECT_SYNC_JIRA</option>
              <option value="QAS_CERTIFICATION_GENERATE">QAS_CERTIFICATION_GENERATE</option>
              <option value="UAT_RESULT_SUBMIT">UAT_RESULT_SUBMIT</option>
            </select>
          </div>

          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por User ID..."
              value={userIdFilter}
              onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
              className="bg-slate-800/80 border border-slate-700/80 text-slate-200 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Página <span className="font-semibold text-slate-200">{page}</span> de <span className="font-semibold text-slate-200">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Cargando registros de auditoría...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron entradas de auditoría para los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Fecha & Hora</th>
                  <th className="px-6 py-4">Operación</th>
                  <th className="px-6 py-4">Entidad</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono border ${getOperationBadge(entry.operation_type)}`}>
                        {entry.operation_type}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {entry.entity_type} {entry.entity_id ? `(${entry.entity_id.substring(0, 8)}...)` : ''}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {entry.user_id ? entry.user_id.substring(0, 8) + '...' : 'Sistema'}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {entry.ip_address || '127.0.0.1'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {entry.details ? (
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver JSON
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 font-mono">
                <FileText className="w-4 h-4 text-indigo-400" />
                Detalles Operación ({selectedEntry.operation_type})
              </h3>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <pre className="text-xs font-mono text-indigo-300 leading-relaxed">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedEntry.details || '{}'), null, 2);
                  } catch (_) {
                    return selectedEntry.details;
                  }
                })()}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
