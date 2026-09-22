# Walkthrough: Replicación Completa de QA Project MGMT

Se ha completado la replicación integral del proyecto **QA Project MGMT** en la raíz del repositorio [`qa_project_mgmt`](file:///c:/Dev/FCV/qa_project_mgmt). 

El código monolítico anterior (basado en SQLite, Alembic y modelos relacionales pesados) ha sido archivado de forma segura en `_legacy_archive/` y sustituido por el **Command Center local para PM y QA con IA**, almacenamiento cifrado y arquitectura desacoplada por adaptadores.

---

## 1. Nueva Arquitectura del Proyecto

```
qa_project_mgmt/
├── backend/              # FastAPI + capa de integraciones + RAG local + AI runners
│   ├── app/
│   │   ├── ai/          # Runners Ollama / OpenAI / Anthropic + templates
│   │   ├── api/         # Routers: /health, /settings, /integrations, /features, /knowledge
│   │   ├── config/      # Configuración general
│   │   ├── context/     # Ingesta de documentos (PDF, DOCX, TXT) + RAG con BM25
│   │   ├── core/        # Storage cifrado (Fernet/Keyring) y settings
│   │   ├── features/    # Lógica de Standup, PRD y QA
│   │   └── integrations/# Adaptadores para Jira (OAuth 3LO + PAT), GitHub y GitLab
│   └── requirements.txt
├── frontend/             # React 19 + Vite + TypeScript + Tailwind CSS v4
│   ├── src/
│   │   ├── api/         # Cliente HTTP API
│   │   ├── components/  # Layout, modales OAuth, preview Jira/GitHub
│   │   ├── pages/       # Dashboard, PM Tools, QA Tools, Knowledge, Settings
│   │   └── App.tsx      # Routing con React Router v7
│   └── package.json
├── local/                # Almacenamiento local cifrado (tokens, cache, knowledge)
├── _legacy_archive/      # Respaldo del código previo
├── package.json          # Scripts raíz (dev:backend, dev:frontend)
├── README.md             # Guía completa de uso y configuración
└── DEPLOY.md             # Instrucciones de despliegue
```

---

## 2. Instrucciones de Arranque

### Opción A: Desde la raíz
```powershell
# Frontend
npm run dev:frontend

# Backend
npm run dev:backend
```

### Opción B: Carpetas individuales

#### Backend (FastAPI)
```powershell
cd c:\Dev\FCV\qa_project_mgmt\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **Documentación Swagger:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/health`

#### Frontend (React 19 + Vite)
```powershell
cd c:\Dev\FCV\qa_project_mgmt\frontend
npm run dev
```
- **Aplicación Web:** `http://127.0.0.1:5173`

---

## 3. Pruebas y Validación Realizadas

### Backend
- Importación limpia de módulos y validación de `app.main:app`.
- Verificación mediante `TestClient`:
  - `GET /api/health` -> `{"status": "ok", "app": "QA Project MGMT"}`
  - `GET /api/settings` -> `200 OK`
  - `GET /api/integrations` -> `200 OK`
- Compatibilidad completa de dependencias en Python 3.14 con `keyring`, `rank-bm25`, `pypdf`, `python-docx`, `cryptography`, `pydantic` y `fastapi`.

### Frontend
- Instalación de paquetes con `npm install` (51 paquetes, 0 vulnerabilidades).
- Compilación de producción con TypeScript y Vite:
  - `npm run build` completado exitosamente sin errores de tipos.
  - Bundles generados: `dist/index.html`, `dist/assets/index-BjhfM8Q8.css`, `dist/assets/index-DWP-8ehM.js`.

---

## 4. Funcionalidades Principales Disponibles

1. **Dashboard:** Vista general del estado de conexiones (Jira, GitHub, GitLab) y accesos directos.
2. **PM Tools:**
   - *Daily Standup Generator:* Asistente para redactar standups diarios basados en tareas y contexto.
   - *PRD Checker:* Análisis y revisión de especificaciones de producto.
   - *Change Impact:* Evaluación de impacto de cambios en requerimientos y código.
3. **QA Tools:**
   - *QaFeature:* Panel interactivo para análisis de regresión, API QA, matriz de pruebas y triage de bugs.
4. **Knowledge Base (RAG Local):**
   - Subida e indexación de archivos locales (PDF, DOCX, Markdown, Texto).
   - Motor de búsqueda contextual con BM25.
   - Interfaz *Ask My Product* para consultas con grounding sobre los documentos cargados.
5. **Integraciones:**
   - *Jira:* Conexión mediante OAuth 2.0 (3LO) o Personal Access Token (PAT).
   - *GitHub:* Conexión mediante Personal Access Token (PAT) con selector de repositorios.
   - *GitLab:* Soporte PAT.
6. **Configuración (Settings):**
   - Selección de proveedor de IA (Ollama local, OpenAI, Anthropic).
   - Configuración de modelo, API Key y URL base de Ollama.
   - Almacenamiento seguro de secretos cifrados con clave de máquina/keyring bajo `local/connections/`.
