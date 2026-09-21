import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Bug, RefreshCw, Key, ExternalLink, CheckCircle, 
  AlertTriangle, Filter, Search, Plus, Loader2 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Defect {
  id: string;
  execution_id: string;
  title: string;
  description?: string;
  steps_to_reproduce?: string;
  severity: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: 'Abierto' | 'En_Proceso' | 'Resuelto' | 'Cerrado';
  jira_issue_key?: string;
  created_at: string;
}

export default function DefectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Jira Config Modal State
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraConfigLoading, setJiraConfigLoading] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchDefects(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err: any) {
      setError('Error al cargar la lista de proyectos.');
    }
  };

  const fetchDefects = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjectDefects(projectId);
      setDefects(data);
    } catch (err: any) {
      setError('Error al obtener los defectos del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncJira = async (defectId: string) => {
    setSyncingId(defectId);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.syncDefectJira(defectId);
      setSuccess(`Sincronización exitosa con Jira. Clave: ${res.jira_issue_key || 'Actualizada'}`);
      if (selectedProjectId) fetchDefects(selectedProjectId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al sincronizar con Jira. Verifique la configuración.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveJiraConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setJiraConfigLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.saveJiraConfig(selectedProjectId, {
        jira_url: jiraUrl,
        user_email: jiraEmail,
        api_token: jiraToken,
      });
      setSuccess('Configuración de Jira guardada y encriptada exitosamente.');
      setShowJiraModal(false);
      setJiraUrl('');
      setJiraEmail('');
      setJiraToken('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar configuración de Jira.');
    } finally {
      setJiraConfigLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Crítica':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Alta':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Media':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
    }
  };

  const filteredDefects = defects.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.jira_issue_key && d.jira_issue_key.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'ALL' || d.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 rounded-xl border border-red-500/30 text-red-400">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Gestión de Defectos & Integración Jira</h1>
              <p className="text-xs text-slate-400">Monitoree hallazgos de ejecuciones de QA y sincronice incidentes con Atlassian Jira</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowJiraModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Key className="w-4 h-4 text-indigo-400" />
            Configurar Jira
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Defectos</span>
          <p className="text-2xl font-bold text-slate-100 mt-1">{defects.length}</p>
        </div>
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-red-400 font-medium">Severidad Crítica/Alta</span>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {defects.filter(d => d.severity === 'Crítica' || d.severity === 'Alta').length}
          </p>
        </div>
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-indigo-400 font-medium">Sincronizados en Jira</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {defects.filter(d => !!d.jira_issue_key).length}
          </p>
        </div>
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-emerald-400 font-medium">Pendientes de Sincro</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {defects.filter(d => !d.jira_issue_key).length}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o ticket Jira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-200 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/80 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">Todas las Severidades</option>
            <option value="Crítica">Crítica</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Defect Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Cargando defectos...</span>
          </div>
        ) : filteredDefects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron defectos registrados para este proyecto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Título & Descripción</th>
                  <th className="px-6 py-4">Severidad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Jira Ticket</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDefects.map((defect) => (
                  <tr key={defect.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-semibold text-slate-100">{defect.title}</p>
                      {defect.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{defect.description}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">Ejecución ID: {defect.execution_id.substring(0, 8)}...</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityBadge(defect.severity)}`}>
                        {defect.severity}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-300">
                        {defect.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {defect.jira_issue_key ? (
                        <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-xs">
                          <span>{defect.jira_issue_key}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-400/70" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No sincronizado</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSyncJira(defect.id)}
                        disabled={syncingId === defect.id}
                        className="inline-flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {syncingId === defect.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {defect.jira_issue_key ? 'Re-sincronizar' : 'Sincro Jira'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Jira Setup Modal */}
      {showJiraModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Configuración Atlassian Jira
              </h3>
              <button 
                onClick={() => setShowJiraModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJiraConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jira Base URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://tu-dominio.atlassian.net"
                  value={jiraUrl}
                  onChange={(e) => setJiraUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo de Usuario Atlassian</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">API Token de Jira (Encriptado Fernet)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowJiraModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={jiraConfigLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {jiraConfigLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
