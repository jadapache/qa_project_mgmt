import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadAppConfig } from './config';
import './index.css';

function Root() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAppConfig().finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200">
        <p className="text-lg animate-pulse">Cargando QA Project Mgmt...</p>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
