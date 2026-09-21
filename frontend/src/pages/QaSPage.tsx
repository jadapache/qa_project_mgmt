import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Award, Plus, FileCheck, CheckCircle, AlertTriangle, 
  Loader2, Percent, Calendar, ShieldCheck, Clock 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface QasCycle {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface Certification {
  id: string;
  qas_cycle_id: string;
  version: number;
  total_test_cases: number;
  executed_test_cases: number;
  passed_test_cases: number;
  failed_test_cases: number;
  coverage_percentage: number;
  approval_percentage: number;
  certified_by: string;
  certified_at: string;
}

export default function QaSPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [cycles, setCycles] = useState<QasCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal create cycle
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchCycles(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedCycleId) {
      fetchCertifications(selectedCycleId);
    } else {
      setCertifications([]);
    }
  }, [selectedCycleId]);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setError('Error al cargar proyectos.');
    }
  };

  const fetchCycles = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQasCycles(projectId);
      setCycles(data);
      if (data.length > 0) {
        setSelectedCycleId(data[0].id);
      } else {
        setSelectedCycleId(null);
      }
    } catch (err) {
      setError('Error al obtener los ciclos QaS.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCertifications = async (cycleId: string) => {
    setCertLoading(true);
    try {
      const data = await api.getCertifications(cycleId);
      setCertifications(data);
    } catch (err) {
      setError('Error al obtener las certificaciones del ciclo.');
    } finally {
      setCertLoading(false);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setCreateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createQasCycle(selectedProjectId, {
        name: cycleName,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccess('Ciclo QaS creado exitosamente.');
      setShowCycleModal(false);
      setCycleName('');
      setStartDate('');
      setEndDate('');
      fetchCycles(selectedProjectId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear ciclo QaS.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleGenerateCertification = async () => {
    if (!selectedCycleId) return;
    setGeneratingCert(true);
    setError(null);
    setSuccess(null);
    try {
      const cert = await api.createCertification(selectedCycleId);
      setSuccess(`Certificación v${cert.version} generada exitosamente. Cobertura: ${cert.coverage_percentage}%, Aprobación: ${cert.approval_percentage}%`);
      fetchCertifications(selectedCycleId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al generar la certificación.');
    } finally {
      setGeneratingCert(false);
    }
  };

  const latestCert = certifications.length > 0 ? certifications[certifications.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Certificaciones QaS (Quality as a Service)</h1>
            <p className="text-xs text-slate-400">Genere reportes de certificación con fórmulas formales de Cobertura y Aprobación</p>
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
            onClick={() => setShowCycleModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Ciclo QaS
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cycles List */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Ciclos de Certificación
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Cargando ciclos...</span>
            </div>
          ) : cycles.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">No hay ciclos de certificación registrados.</p>
          ) : (
            <div className="space-y-2">
              {cycles.map((cycle) => {
                const isSelected = cycle.id === selectedCycleId;
                return (
                  <div
                    key={cycle.id}
                    onClick={() => setSelectedCycleId(cycle.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100 shadow-md'
                        : 'bg-slate-800/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm">{cycle.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300">
                        {cycle.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{cycle.start_date} al {cycle.end_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Certification Details & Generation */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCycleId ? (
            <>
              {/* Cycle Certification Header Card */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Certificación Formal del Ciclo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calcule la cobertura (% ejecutado / total) y aprobación (% aprobado / ejecutado)
                  </p>
                </div>

                <button
                  onClick={handleGenerateCertification}
                  disabled={generatingCert}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {generatingCert ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Generar Certificación
                </button>
              </div>

              {/* Latest Metric Cards */}
              {latestCert ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                      <span>Cobertura de Pruebas</span>
                      <Percent className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-3xl font-extrabold text-indigo-400 mt-2">
                      {latestCert.coverage_percentage}%
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {latestCert.executed_test_cases} ejecutados de {latestCert.total_test_cases} totales
                    </p>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                      <span>Aprobación de Pruebas</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                      {latestCert.approval_percentage}%
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {latestCert.passed_test_cases} aprobados de {latestCert.executed_test_cases} ejecutados
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Version History Table */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  Historial de Certificaciones Emitidas
                </h3>

                {certLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Cargando historial...</span>
                  </div>
                ) : certifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    Aún no se ha emitido ninguna versión de certificación para este ciclo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Versión</th>
                          <th className="px-4 py-3">Totales / Ejecutados</th>
                          <th className="px-4 py-3">% Cobertura</th>
                          <th className="px-4 py-3">% Aprobación</th>
                          <th className="px-4 py-3">Fecha Emisión</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {certifications.map((cert) => (
                          <tr key={cert.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-100">v{cert.version}</td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {cert.total_test_cases} / {cert.executed_test_cases} (P: {cert.passed_test_cases}, F: {cert.failed_test_cases})
                            </td>
                            <td className="px-4 py-3 font-semibold text-indigo-400">{cert.coverage_percentage}%</td>
                            <td className="px-4 py-3 font-semibold text-emerald-400">{cert.approval_percentage}%</td>
                            <td className="px-4 py-3 text-xs text-slate-400">{new Date(cert.certified_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-12 text-center text-slate-500">
              Seleccione o cree un ciclo QaS para ver y emitir certificaciones.
            </div>
          )}
        </div>
      </div>

      {/* Modal Create Cycle */}
      {showCycleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Nuevo Ciclo QaS
              </h3>
              <button 
                onClick={() => setShowCycleModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Ciclo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ciclo QaS Sprint 14"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
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
                  onClick={() => setShowCycleModal(false)}
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
                  Crear Ciclo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
