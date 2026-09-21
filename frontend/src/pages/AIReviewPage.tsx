import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Sparkles, CheckCircle2, FileEdit, Check, Eye } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface AiDraft {
  id: string;
  artifact_type: string;
  original_content: string;
  edited_content: string | null;
  status: string;
  created_at: string;
}

export default function AIReviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<AiDraft | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {}
  };

  const loadDrafts = async (projId: string) => {
    try {
      const data = await api.getAiDrafts(projId);
      setDrafts(data);
      if (data.length > 0) {
        setSelectedDraft(data[0]);
        setEditedText(data[0].edited_content || data[0].original_content);
      } else {
        setSelectedDraft(null);
        setEditedText('');
      }
    } catch (err) {
      setDrafts([]);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDrafts(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleSelectDraft = (d: AiDraft) => {
    setSelectedDraft(d);
    setEditedText(d.edited_content || d.original_content);
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    try {
      const updated = await api.editAiDraft(selectedDraft.id, editedText);
      setSelectedDraft(updated);
      setMsg('Borrador editado y guardado correctamente.');
      if (selectedProjectId) loadDrafts(selectedProjectId);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error al guardar la edición.');
    }
  };

  const handleApprove = async () => {
    if (!selectedDraft) return;
    try {
      const approved = await api.approveAiDraft(selectedDraft.id);
      setSelectedDraft(approved);
      setMsg('¡Borrador IA aprobado oficialmente!');
      if (selectedProjectId) loadDrafts(selectedProjectId);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error al aprobar el borrador.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Revisión y Aprobación de Borradores IA
          </h1>
          <p className="text-xs text-slate-400">Revisión formal de artefactos provisionales generados por el asistente de IA (Req. 8.1 - 8.6)</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Proyecto:</label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drafts List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Borradores Pendientes</h2>
          <div className="space-y-2">
            {drafts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No hay borradores IA registrados.</p>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDraft(d)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedDraft?.id === d.id
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-indigo-400">{d.artifact_type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      d.status === 'Aprobado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{d.original_content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side-by-Side Review Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {!selectedDraft ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500 italic">
              Selecciona un borrador IA de la lista para revisar.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Borrador IA: {selectedDraft.artifact_type}</h3>
                  <span className="text-[11px] text-slate-500">Estado actual: {selectedDraft.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDraft.status !== 'Aprobado' && (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Guardar Cambios
                      </button>
                      <button
                        onClick={handleApprove}
                        className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprobar artefacto
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Content (Inmutable - Req. 8.3) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Original Generado por IA (Inmutable)
                  </label>
                  <div className="w-full h-80 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedDraft.original_content}
                  </div>
                </div>

                {/* Edited Content */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
                    Contenido Editado por Líder QA
                  </label>
                  <textarea
                    rows={15}
                    value={editedText}
                    disabled={selectedDraft.status === 'Aprobado'}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-80 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
