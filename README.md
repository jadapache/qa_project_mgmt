# QA Project MGMT

> Centro de comando local con IA para Product Managers e Ingenieros de QA con búsqueda RAG contextual, almacenamiento local cifrado e integraciones desacopladas para gestores de tareas y repositorios.

---

## Inicio Rápido (< 5 min)

### Requisitos previos
- **Node.js**: v18+ (v20+ recomendado)
- **Python**: 3.10+ (probado en Python 3.11 – 3.14)

### 1. Clonar y Configurar el Entorno
```bash
cp .env.example .env
```
*(Opcional: Configura las claves del proveedor de IA o las credenciales de Jira en el archivo `.env`, o bien configúralas directamente desde la interfaz web en Configuración).*

### 2. Ejecución con Scripts Raíz
```bash
# Terminal 1 - Backend (FastAPI en http://127.0.0.1:8000)
npm run dev:backend

# Terminal 2 - Frontend (Vite en http://localhost:5173)
npm run dev:frontend
```

### 3. Ejecución Manual (Alternativa)
```bash
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows (o source .venv/bin/activate en Unix/macOS)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

- **Aplicación Web**: [http://localhost:5173](http://localhost:5173)
- **Documentación Interactiva de la API (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## Tecnologías Utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, React Router v7 |
| **Backend** | Python, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| **IA y RAG** | Ejecutor de IA multiproveedor (Ollama, OpenAI, Anthropic), búsqueda RAG local con BM25, `pypdf`, `python-docx` |
| **Almacenamiento y Seguridad** | Almacén de credenciales cifrado localmente (`local/connections/`) con Fernet y el `keyring` del sistema operativo (sin base de datos externa) |
| **Integraciones** | Adaptadores desacoplados para Jira (OAuth 2.0 3LO y PAT), GitHub (PAT) y GitLab (PAT) |

---

## Estructura del Proyecto

```
qa_project_mgmt/
├── backend/                  # Aplicación FastAPI y servicios de IA
│   ├── app/
│   │   ├── ai/              # Ejecutor de IA multiproveedor, registro de prompts y plantillas
│   │   ├── api/             # Endpoints REST (/health, /settings, /integrations, /features, /knowledge)
│   │   ├── context/         # Analizadores de documentos (PDF, Word, Markdown) y búsqueda BM25
│   │   ├── core/            # Configuración, cifrado Fernet y almacenamiento de credenciales
│   │   ├── features/        # Lógica de negocio para Standup, PRD, Impacto y QA
│   │   └── integrations/    # Adaptadores de Jira (OAuth 3LO + PAT), GitHub (PAT) y GitLab
│   └── requirements.txt     # Dependencias de Python
├── frontend/                 # Aplicación React 19 SPA
│   ├── src/
│   │   ├── api/             # Cliente HTTP tipado
│   │   ├── components/      # Componentes UI, diseño base y modales de conexión
│   │   ├── pages/           # Panel Principal, Standup, PRD, Impacto, QA, Conocimiento, Configuración
│   │   └── App.tsx          # Enrutamiento de la aplicación
│   └── package.json         # Dependencias y scripts del frontend
├── local/                    # Almacenamiento local en tiempo de ejecución (secretos e índices)
│   ├── connections/         # Tokens API y credenciales OAuth cifradas (.enc)
│   ├── settings/            # Preferencias de usuario locales (app.json)
│   ├── knowledge/           # Documentos cargados e índices RAG
│   └── ai/                  # Registros de ejecución de IA y rúbricas
├── _legacy_archive/          # Respaldo histórico del código y especificaciones anteriores
├── package.json              # Scripts raíz de coordinación (dev:backend, dev:frontend)
├── DEPLOY.md                 # Guía de despliegue en producción (Docker, Render, Railway)
└── Dockerfile                # Contenedor de producción (multietapa)
```

---

## Funcionalidades Clave

### 1. Panel Principal (Dashboard)
- Estado visual inmediato de todas las conexiones a herramientas externas (Jira, GitHub, GitLab).
- Accesos rápidos a los flujos de trabajo diarios y estado del sistema.

### 2. Herramientas PM
- **Generador de Standup Diario**: Consolida tareas abiertas, trabajo reciente y bloqueos desde Jira y GitHub para generar reportes estructurados.
- **Revisor de PRD**: Audita documentos de especificaciones analizando claridad, criterios de aceptación, vacíos y riesgos.
- **Análisis de Impacto de Cambios**: Evalúa los efectos de un cambio propuesto en la arquitectura técnica, código y suites de prueba.

### 3. Herramientas QA
- **Panel QaFeature**: Entorno de trabajo especializado que cubre planes de prueba de Regresión, listas de verificación de QA de API, QA Visual, datos de prueba inteligentes y evaluación de Estado de Lanzamiento.

### 4. Biblioteca de Conocimiento Contextual (RAG Local)
- Sube documentos en formatos **PDF**, **DOCX**, **Markdown** o **TXT**.
- Fragmentación de texto en memoria e índice de alta velocidad con **BM25** sin necesidad de bases de datos vectoriales complejas.
- **Consultar Producto**: Chat conversacional fundamentado estrictamente en la documentación cargada, ofreciendo referencias reales sin inventar respuestas.

### 5. Integraciones Desacopladas
- **Jira**: Autenticación con OAuth 2.0 (3LO) de Atlassian o mediante Personal Access Token (PAT).
- **GitHub**: Autenticación segura por PAT con selección de repositorios y consulta de issues/PRs.
- **GitLab**: Autenticación por PAT con inspección de proyectos.

### 6. Motor de IA Multiproveedor
- Funciona con modelos locales a través de **Ollama** (ej. `llama3`, `mistral`, `qwen`) para privacidad absoluta fuera de línea.
- Compatible con proveedores en la nube (**OpenAI**, **Anthropic**) mediante claves API configurables en la UI o `.env`.
- Prompts de sistema y rúbricas de evaluación editables desde la interfaz o en `local/ai/prompts/`.

---

## Configuración y Variables de Entorno

Copia el archivo `.env.example` a `.env`. Todas las credenciales también pueden establecerse desde la pantalla de **Configuración** e **Integraciones** en la aplicación web.

```bash
# Servidor y CORS
PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Seguridad y Cifrado (Opcional; por defecto se usa el keyring de la máquina)
PMQA_SECRET_KEY=

# Proveedor de IA por defecto (ollama, openai, anthropic)
PMQA_AI_PROVIDER=ollama
PMQA_AI_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434

# Claves de IA en la nube (opcional si usas Ollama)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Configuración OAuth 2.0 para Jira (Atlassian 3LO)
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=http://127.0.0.1:8000/api/integrations/jira/callback
```

---

## Configuración de OAuth para Jira (Atlassian 3LO)

1. Ingresa a la [Consola de Desarrolladores de Atlassian](https://developer.atlassian.com/console/myapps/) y crea una aplicación.
2. Añade una concesión de autorización **OAuth 2.0 (3LO)**.
3. Establece la URL de callback en:
   ```
   http://127.0.0.1:8000/api/integrations/jira/callback
   ```
4. En **Permisos (Permissions)**, añade los permisos de la API de Jira:
   - `read:jira-work` (Ver datos de issues de Jira)
   - `read:jira-user` (Ver perfiles de usuario)
5. Copia tu **Client ID** y **Client Secret** en el `.env` (o directamente en la UI).
6. En la aplicación: ve a **Integraciones → Jira → Conectar → OAuth**.
7. *Alternativa rápida*: Utiliza un **Personal Access Token (PAT)** (Correo + URL del sitio + Token de API generado en id.atlassian.com).

---

## Modelo de Seguridad y Almacenamiento Local

- **Sin base de datos remota**: No se requiere instalar PostgreSQL/MySQL ni lidiar con archivos de base de datos propensos a bloqueos.
- **Secretos Cifrados**: Los tokens sensibles (tokens de refresco OAuth de Jira, PATs de GitHub, claves API) se almacenan en `local/connections/*.enc` cifrados con Fernet.
- **Jerarquía de Claves**: La clave de cifrado se obtiene primero del llavero nativo del sistema operativo (`keyring`), utilizando como respaldo la derivación de hardware o la variable `PMQA_SECRET_KEY`.
- **Desconexión Limpia**: Al desconectar cualquier servicio desde la UI, el archivo `.enc` correspondiente se elimina permanentemente del disco.

---

## Despliegue en Producción

El proyecto incluye un [`Dockerfile`](./Dockerfile) multietapa que compila el frontend de React y lo sirve directamente como archivos estáticos desde FastAPI.

Consulta **[DEPLOY.md](./DEPLOY.md)** para obtener instrucciones de despliegue en un clic para **Render**, **Railway** o cualquier plataforma de contenedores.
