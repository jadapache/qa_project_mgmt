import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { FolderKanban, Plus, Calendar, CheckCircle2, ChevronRight, Layers, FileText } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date_estimated: string;
  status: string;
}

interface Iteration {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Story {
  id: string;
  description: string;
  acceptance_criteria: string;
  priority: string;
  status: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showIterationModal, setShowIterationModal] = useState<boolean>(false);
  const [showStoryModal, setShowStoryModal] = useState<boolean>(false);

  // Modal forms state
  const [newProject, setNewProject] = useState({ name: '', description: '', start_date: '', end_date_estimated: '' });
  const [newIteration, setNewIteration] = useState({ name: '', start_date: '', end_date: '' });
  const [newStory, setNewStory] = useState({ description: '', acceptance_criteria: '', priority: 'Media' });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const role = useAuthStore((state) => state.role);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err: any) {
      setErrorMsg('Error al cargar la lista de proyectos.');
    }
  };

  const loadIterations = async (projId: string) => {
    try {
      const data = await api.getIterations(projId);
      setIterations(data);
      if (data.length > 0) {
        setSelectedIterationId(data[0].id);
      } else {
        setSelectedIterationId(null);
        setStories([]);
      }
    } catch (err: any) {
      setIterations([]);
    }
  };

  const loadStories = async (iterId: string) => {
    try {
      const data = await api.getStories(iterId);
      setStories(data);
    } catch (err: any) {
      setStories([]);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadIterations(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedIterationId) {
      loadStories(selectedIterationId);
    }
  }, [selectedIterationId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createProject(newProject);
      setShowProjectModal(false);
      setNewProject({ name: '', description: '', start_date: '', end_date_estimated: '' });
      loadProjects();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear el proyecto.');
    }
  };

  const handleCreateIteration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setErrorMsg(null);
    try {
      await api.createIteration(selectedProjectId, newIteration);
      setShowIterationModal(false);
      setNewIteration({ name: '', start_date: '', end_date: '' });
      loadIterations(selectedProjectId);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear la iteración.');
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIterationId) return;
    setErrorMsg(null);
    try {
      await api.createStory(selectedIterationId, newStory);
      setShowStoryModal(false);
      setNewStory({ description: '', acceptance_criteria: '', priority: 'Media' });
      loadStories(selectedIterationId);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear la historia de usuario.');
    }
  };

  const canManage = role === 'Administrador' || role === 'Líder_QA';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            Gestión de Proyectos
          </h1>
          <p className="text-xs text-slate-400">Proyectos, Iteraciones e Historias de Usuario</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowProjectModal(true)}
            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Grid: Proyectos -> Iteraciones -> Historias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Proyectos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proyectos</h2>
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedProjectId === p.id
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                    {p.status}
                  </span>
                </div>
                {p.description && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{p.description}</p>}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{p.start_date} al {p.end_date_estimated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Iteraciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Iteraciones (Sprints)
            </h2>
            {canManage && selectedProjectId && (
              <button
                onClick={() => setShowIterationModal(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Nueva Iteración"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {iterations.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No hay iteraciones en este proyecto.</p>
            ) : (
              iterations.map((iter) => (
                <div
                  key={iter.id}
                  onClick={() => setSelectedIterationId(iter.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedIterationId === iter.id
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">{iter.name}</span>
                    <span className="text-[10px] text-indigo-300">{iter.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{iter.start_date} ~ {iter.end_date}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Historias de Usuario */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              Historias de Usuario
            </h2>
            {canManage && selectedIterationId && (
              <button
                onClick={() => setShowStoryModal(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Nueva Historia"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {stories.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No hay historias creadas en esta iteración.</p>
            ) : (
              stories.map((st) => (
                <div key={st.id} className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      st.priority === 'Alta' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {st.priority}
                    </span>
                    <span className="text-[10px] text-slate-500">{st.status}</span>
                  </div>
                  <p className="text-xs text-slate-200">{st.description}</p>
                  {st.acceptance_criteria && (
                    <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/50">
                      <strong>Criterios:</strong> {st.acceptance_criteria}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Nuevo Proyecto */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100">Crear Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Fin Est.</label>
                  <input
                    type="date"
                    required
                    value={newProject.end_date_estimated}
                    onChange={(e) => setNewProject({ ...newProject, end_date_estimated: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Iteración */}
      {showIterationModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100">Crear Nueva Iteración</h3>
            <form onSubmit={handleCreateIteration} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre (Sprint)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sprint 1"
                  value={newIteration.name}
                  onChange={(e) => setNewIteration({ ...newIteration, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={newIteration.start_date}
                    onChange={(e) => setNewIteration({ ...newIteration, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={newIteration.end_date}
                    onChange={(e) => setNewIteration({ ...newIteration, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIterationModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Historia */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100">Nueva Historia de Usuario</h3>
            <form onSubmit={handleCreateStory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Como [rol], quiero [acción] para [beneficio]"
                  value={newStory.description}
                  onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Criterios de Aceptación</label>
                <textarea
                  rows={3}
                  value={newStory.acceptance_criteria}
                  onChange={(e) => setNewStory({ ...newStory, acceptance_criteria: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridad</label>
                <select
                  value={newStory.priority}
                  onChange={(e) => setNewStory({ ...newStory, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStoryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
