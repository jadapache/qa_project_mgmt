import React, { useEffect, useState } from 'react';
import { getAppConfig } from './config';

interface HealthStatus {
  status: string;
  app: string;
  environment: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const config = getAppConfig();

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.api_url}/health`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'El servicio no está disponible. Contacte al administrador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-indigo-400 mb-2">{config.app_name}</h1>
        <p className="text-sm text-slate-400 mb-6">Prueba de Concepto (PoC) — Conectividad HTTPS Cliente Tauri ↔ Backend FastAPI</p>

        <div className="space-y-4">
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Backend URL</span>
            <code className="text-sm text-emerald-300 font-mono break-all">{config.api_url}</code>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Estado de Conexión</span>
            {loading && <p className="text-yellow-400 text-sm animate-pulse">Verificando conexión...</p>}
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
            {health && (
              <div className="text-sm text-emerald-400 font-medium space-y-1">
                <p>Status: <span className="font-bold uppercase">{health.status}</span></p>
                <p>Entorno: {health.environment}</p>
              </div>
            )}
          </div>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow transition-colors"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    </div>
  );
}
