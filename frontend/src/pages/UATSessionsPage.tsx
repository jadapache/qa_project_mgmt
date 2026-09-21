import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, Plus, UserPlus, CheckCircle, XCircle, AlertTriangle, 
  Loader2, Calendar, BarChart3, MessageSquare 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface UatSession {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface UatSummary {
  session_id: string;
  total_testers_invited: number;
  testers_responded: number;
  total_approved: number;
  total_rejected: number;
  participation_percentage: number;
  approval_percentage: number;
}

export default function UATSessionsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sessions, setSessions] = useState<UatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<UatSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Create Session
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Result Form
  const [resultStatus, setResultStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [resultComments, setResultComments] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSessions(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSummary(selectedSessionId);
    } else {
      setSummary(null);
    }
  }, [selectedSessionId]);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (err) {
      setError('Error al obtener proyectos.');
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      // Non-critical
    }
  };

  const fetchSessions = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUatSessions(projectId);
      setSessions(data);
      if (data.length > 0) {
        setSelectedSessionId(data[0].id);
      } else {
        setSelectedSessionId(null);
      }
    } catch (err) {
      setError('Error al obtener sesiones UAT.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (sessionId: string) => {
    setSummaryLoading(true);
    try {
      const data = await api.getUatSummary(sessionId);
      setSummary(data);
    } catch (err) {
      setError('Error al obtener resumen de la sesión UAT.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setCreateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createUatSession(selectedProjectId, {
        name: sessionName,
        description: sessionDescription,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccess('Sesión UAT creada exitosamente.');
      setShowSessionModal(false);
      setSessionName('');
      setSessionDescription('');
      setStartDate('');
      setEndDate('');
      fetchSessions(selectedProjectId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear la sesión UAT.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInviteTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedUserId) return;
    setInviteLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.inviteUatTester(selectedSessionId, selectedUserId);
      setSuccess('Tester invitado exitosamente a la sesión UAT.');
      setShowInviteModal(false);
      setSelectedUserId('');
      fetchSummary(selectedSessionId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al invitar al tester.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    setSubmittingResult(true);
    setError(null);
    setSuccess(null);
    try {
      await api.submitUatResult(selectedSessionId, resultStatus, resultComments);
      setSuccess(`Voto UAT registrado (${resultStatus === 'Approved' ? 'Aprobado' : 'Rechazado'}).`);
      setResultComments('');
      fetchSummary(selectedSessionId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar el resultado UAT.');
    } finally {
      setSubmittingResult(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Sesiones UAT (User Acceptance Testing)</h1>
            <p className="text-xs text-slate-400">Coordine validaciones de usuarios finales, invite evaluadores y evalúe la tasa de aprobación</p>
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
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Sesión UAT
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sessions List */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Sesiones UAT Activas
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Cargando sesiones...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">No hay sesiones UAT creadas para este proyecto.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100 shadow-md'
                        : 'bg-slate-800/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm">{session.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300">
                        {session.status}
                      </span>
                    </div>
                    {session.description && (
                      <p className="text-xs text-slate-400 truncate mt-1">{session.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{session.start_date} al {session.end_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Session Metrics & Feedback Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSessionId ? (
            <>
              {/* Actions Header */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Panel de Resultados UAT</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Invita testers y registra tu veredicto final sobre la sesión</p>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-4 py-2.5 rounded-xl font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  Invitar Tester
                </button>
              </div>

              {/* Metric Cards */}
              {summaryLoading ? (
                <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Cargando métricas...</span>
                </div>
              ) : summary ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">Testers Invitados</span>
                    <p className="text-2xl font-bold text-slate-100 mt-1">{summary.total_testers_invited}</p>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                    <span className="text-xs text-indigo-400 font-medium">% Participación</span>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">{summary.participation_percentage}%</p>
                    <span className="text-[10px] text-slate-500">{summary.testers_responded} de {summary.total_testers_invited} respondieron</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                    <span className="text-xs text-emerald-400 font-medium">% Aprobación</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.approval_percentage}%</p>
                    <span className="text-[10px] text-slate-500">{summary.total_approved} aprobaciones</span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                    <span className="text-xs text-red-400 font-medium">Rechazos</span>
                    <p className="text-2xl font-bold text-red-400 mt-1">{summary.total_rejected}</p>
                    <span className="text-[10px] text-slate-500">votos en contra</span>
                  </div>
                </div>
              ) : null}

              {/* Submit Result Form Card */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Registrar Veredicto de Prueba UAT
                </h3>

                <form onSubmit={handleSubmitResult} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Resultado</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 p-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors">
                        <input
                          type="radio"
                          name="result"
                          value="Approved"
                          checked={resultStatus === 'Approved'}
                          onChange={() => setResultStatus('Approved')}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-slate-200">Aprobado</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 p-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors">
                        <input
                          type="radio"
                          name="result"
                          value="Rejected"
                          checked={resultStatus === 'Rejected'}
                          onChange={() => setResultStatus('Rejected')}
                          className="text-red-500 focus:ring-red-500"
                        />
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-slate-200">Rechazado</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Comentarios / Observaciones de la Prueba</label>
                    <textarea
                      rows={3}
                      placeholder="Escriba comentarios sobre la experiencia del usuario o motivos de rechazo..."
                      value={resultComments}
                      onChange={(e) => setResultComments(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingResult}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {submittingResult && <Loader2 className="w-4 h-4 animate-spin" />}
                      Guardar Veredicto
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-12 text-center text-slate-500">
              Seleccione una sesión UAT para ver resultados y participar.
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Nueva Sesión UAT
              </h3>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Sesión</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Validación UAT Módulo Facturación"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Objetivo</label>
                <textarea
                  rows={2}
                  placeholder="Describa el alcance de la prueba..."
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Crear Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Tester Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Invitar Tester UAT
              </h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteTester} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seleccionar Usuario Tester</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar usuario --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {inviteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enviar Invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
