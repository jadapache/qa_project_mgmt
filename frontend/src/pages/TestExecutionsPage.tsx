import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const TestExecutionsPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [iterations, setIterations] = useState<any[]>([]);
  const [selectedIterationId, setSelectedIterationId] = useState<string>('');
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal para nuevo caso de prueba
  const [showTcModal, setShowTcModal] = useState(false);
  const [tcTitle, setTcTitle] = useState('');
  const [tcPrecond, setTcPrecond] = useState('');
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');

  // Modal para registrar ejecución
  const [selectedTc, setSelectedTc] = useState<any>(null);
  const [execStatus, setExecStatus] = useState('Aprobado');
  const [execComments, setExecComments] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchIterations(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchIterations = async (projId: string) => {
    try {
      const data = await api.getIterations(projId);
      setIterations(data);
      if (data.length > 0) {
        setSelectedIterationId(data[0].id);
      } else {
        setStories([]);
        setTestCases([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedIterationId) {
      fetchStories(selectedIterationId);
    }
  }, [selectedIterationId]);

  const fetchStories = async (iterId: string) => {
    try {
      const data = await api.getStories(iterId);
      setStories(data);
      if (data.length > 0) {
        setSelectedStoryId(data[0].id);
      } else {
        setTestCases([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedStoryId) {
      fetchTestCases(selectedStoryId);
    }
  }, [selectedStoryId]);

  const fetchTestCases = async (storyId: string) => {
    setLoading(true);
    try {
      const data = await api.getStoryTestCases(storyId);
      setTestCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoryId || !tcTitle) return;
    try {
      await api.createTestCase(selectedStoryId, {
        title: tcTitle,
        preconditions: tcPrecond,
        input_data: tcInput,
        expected_result: tcExpected,
      });
      setTcTitle('');
      setTcPrecond('');
      setTcInput('');
      setTcExpected('');
      setShowTcModal(false);
      fetchTestCases(selectedStoryId);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear caso de prueba');
    }
  };

  const handleExecuteTc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTc) return;
    try {
      const execution = await api.executeTestCase(selectedTc.id, execStatus, execComments);
      if (evidenceFile) {
        await api.uploadEvidence(execution.id, evidenceFile);
      }
      setSelectedTc(null);
      setExecComments('');
      setEvidenceFile(null);
      fetchTestCases(selectedStoryId);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al registrar ejecución');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Ejecución de Pruebas QA</h1>
          <p className="text-slate-400 text-sm">Ejecución paso a paso, evidencias multimedia y actualización de estado</p>
        </div>
        <button
          onClick={() => setShowTcModal(true)}
          disabled={!selectedStoryId}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
        >
          + Nuevo Caso de Prueba
        </button>
      </div>

      {/* Selector de Proyecto, Sprint e Historia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/50">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Proyecto</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sprint / Iteración</label>
          <select
            value={selectedIterationId}
            onChange={(e) => setSelectedIterationId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
          >
            {iterations.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Historia de Usuario</label>
          <select
            value={selectedStoryId}
            onChange={(e) => setSelectedStoryId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id}>{s.description.substring(0, 45)}...</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Casos de Prueba */}
      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700/50 font-semibold text-slate-200">
          Casos de Prueba ({testCases.length})
        </div>
        <div className="divide-y divide-slate-700/50">
          {loading ? (
            <div className="p-6 text-center text-slate-400">Cargando casos de prueba...</div>
          ) : testCases.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No hay casos de prueba registrados para esta historia.</div>
          ) : (
            testCases.map((tc) => (
              <div key={tc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-700/30 transition-colors">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      tc.status === 'Aprobado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      tc.status === 'Fallido' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      tc.status === 'Bloqueado' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {tc.status}
                    </span>
                    <h3 className="font-semibold text-slate-200">{tc.title}</h3>
                  </div>
                  {tc.preconditions && <p className="text-xs text-slate-400"><strong className="text-slate-300">Precondiciones:</strong> {tc.preconditions}</p>}
                  {tc.expected_result && <p className="text-xs text-slate-400"><strong className="text-slate-300">Esperado:</strong> {tc.expected_result}</p>}
                </div>
                <button
                  onClick={() => setSelectedTc(tc)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow transition-colors self-start md:self-center"
                >
                  Ejecutar Caso
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nuevo Caso de Prueba */}
      {showTcModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Nuevo Caso de Prueba</h2>
            <form onSubmit={handleCreateTc} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Título del Caso *</label>
                <input
                  type="text"
                  required
                  value={tcTitle}
                  onChange={(e) => setTcTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  placeholder="Ej. Validar login con credenciales correctas"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Precondiciones</label>
                <textarea
                  value={tcPrecond}
                  onChange={(e) => setTcPrecond(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm h-16"
                  placeholder="Ej. Usuario creado en BD..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Datos de Entrada</label>
                <input
                  type="text"
                  value={tcInput}
                  onChange={(e) => setTcInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
                  placeholder="Ej. admin / Admin12345!"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Resultado Esperado</label>
                <textarea
                  value={tcExpected}
                  onChange={(e) => setTcExpected(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm h-16"
                  placeholder="Ej. Redirección al Dashboard con HTTP 200..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTcModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow"
                >
                  Guardar Caso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Ejecución */}
      {selectedTc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Registrar Ejecución: {selectedTc.title}</h2>
            <form onSubmit={handleExecuteTc} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Resultado de la Ejecución *</label>
                <select
                  value={execStatus}
                  onChange={(e) => setExecStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm font-medium"
                >
                  <option value="Aprobado">Aprobado</option>
                  <option value="Fallido">Fallido</option>
                  <option value="Bloqueado">Bloqueado</option>
                  <option value="No_Ejecutado">No Ejecutado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Comentarios y Hallazgos</label>
                <textarea
                  value={execComments}
                  onChange={(e) => setExecComments(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm h-20"
                  placeholder="Detalles del comportamiento observado durante la prueba..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Adjuntar Archivo de Evidencia (Máx. 10MB)</label>
                <input
                  type="file"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTc(null)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow"
                >
                  Guardar Ejecución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestExecutionsPage;
