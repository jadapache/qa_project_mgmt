# Design Document

## Overview

**QA Project Mgmt** es una aplicaciÃ³n corporativa de escritorio para Windows que centraliza la gestiÃ³n integral del ciclo de calidad de software: planificaciÃ³n de proyectos, ejecuciÃ³n de pruebas QA/QaS, sesiones de aceptaciÃ³n UAT, generaciÃ³n documental asistida por IA y trazabilidad de auditorÃ­a. La aplicaciÃ³n se distribuye como ejecutable nativo (.msi/.exe) mediante Tauri 2.x; el frontend React/TypeScript se ejecuta dentro del WebView del sistema operativo y se comunica exclusivamente con un backend FastAPI remoto a travÃ©s de HTTPS/JSON. NingÃºn componente del backend ni la base de datos se instala en el equipo del usuario final.

### Objetivos de diseÃ±o

| Objetivo | DecisiÃ³n arquitectÃ³nica |
|---|---|
| Cliente ligero sin dependencias de runtime | Tauri 2.x + WebView2 (incluido en Windows 10/11) |
| LÃ³gica de negocio y autorizaciÃ³n 100 % en servidor | FastAPI + JWT + RBAC en el backend |
| IA contextualizada por proyecto | LlamaIndex + pgvector (bÃºsqueda hÃ­brida densa + BM25) |
| Trazabilidad inmutable | Tabla `audit_log` append-only + polÃ­ticas de fila en PostgreSQL |
| EvoluciÃ³n hacia cliente web sin reescritura | API REST stateless, contratos OpenAPI 3.0 |
| Seguridad corporativa | TLS 1.2+, bcrypt, rate limiting, encabezados de seguridad |

---

## Architecture

### Diagrama de componentes

```mermaid
graph TD
    subgraph "Equipo Windows del usuario"
        C[Cliente Tauri 2.x\nReact + TypeScript + Vite\nWebView2]
    end

    subgraph "Infraestructura corporativa remota"
        subgraph "Backend"
            API[FastAPI\nPython 3.12\nUvicorn + Gunicorn]
            RAG[Motor RAG\nLlamaIndex\nEmbedding + Retrieval]
            CELERY[Cola de tareas asÃ­ncronas\nCelery + Redis]
        end

        subgraph "Persistencia"
            PG[(PostgreSQL 15+\nSQLAlchemy 2.x)]
            PGVEC[(pgvector\nÃndice vectorial)]
            REDIS[(Redis\nCache + Cola)]
            FILES[Repositorio de archivos\nSistema de ficheros / S3]
        end

        subgraph "Servicios externos"
            JIRA[Jira Cloud / Server\nAPI REST]
            LLM[Proveedor LLM\nOpenAI / Ollama]
        end
    end

    C -->|HTTPS/JSON + JWT| API
    API --> PG
    API --> PGVEC
    API --> CELERY
    API --> FILES
    RAG --> PGVEC
    RAG --> LLM
    CELERY --> RAG
    CELERY --> PG
    API -->|Opcional| JIRA
```

### Principios de comunicaciÃ³n

- El Cliente **nunca** se conecta directamente a PostgreSQL, Redis ni al Motor RAG.
- Toda comunicaciÃ³n Cliente â†” Backend usa HTTPS/JSON con JWT en el encabezado `Authorization: Bearer <token>`.
- La URL del backend se lee desde `app-config.json` (editable por el Administrador de TI, fuera del ejecutable compilado).
- Las tareas de larga duraciÃ³n (ingesta RAG, generaciÃ³n XLSX masiva) se delegan a Celery; el Cliente consulta el estado mediante un endpoint de tarea.

---

## Components and Interfaces

### 2.1 Cliente Tauri

| MÃ³dulo frontend | Responsabilidad |
|---|---|
| `AuthModule` | Formulario de login, almacenamiento JWT en memoria, refresco / caducidad |
| `ProjectModule` | CRUD proyectos, iteraciones, historias de usuario |
| `QAModule` | Casos de prueba, ejecuciones, evidencias, defectos, certificaciones |
| `UATModule` | Sesiones UAT, registro de resultados, resumen |
| `DocumentModule` | Plantillas, generaciÃ³n y aprobaciÃ³n de documentos versionados |
| `ChatModule` | Sesiones de chat con el Motor RAG, visualizaciÃ³n de fuentes |
| `AIReviewModule` | RevisiÃ³n y aprobaciÃ³n de borradores generados por IA |
| `IngestModule` | Carga de documentos al Ã­ndice RAG, consulta de estado de tarea |
| `ImportExportModule` | Carga/descarga de archivos XLSX |
| `AuditModule` | Consulta del registro de auditorÃ­a (solo Administrador) |
| `AdminModule` | GestiÃ³n de usuarios y roles |

**Estado global:** Zustand con slices por mÃ³dulo. El JWT se almacena exclusivamente en el store de Zustand (memoria de proceso); nunca en `localStorage`, cookies ni registro de Windows.

**Formularios:** React Hook Form + Zod para validaciÃ³n declarativa en cliente (complementa la validaciÃ³n Pydantic del servidor).

**HTTP Client:** `axios` con interceptor que adjunta el JWT, detecta 401 y redirige a login, y aplica reintentos exponenciales para 503.

### 2.2 Backend FastAPI

```
app/
â”œâ”€â”€ main.py                  # CreaciÃ³n de la app FastAPI, middleware, CORS
â”œâ”€â”€ core/
â”‚   â”œâ”€â”€ config.py            # Settings (Pydantic BaseSettings, variables de entorno)
â”‚   â”œâ”€â”€ security.py          # JWT encode/decode, bcrypt, lista de revocaciÃ³n
â”‚   â”œâ”€â”€ dependencies.py      # get_current_user, require_role, get_db
â”‚   â””â”€â”€ rate_limiter.py      # Slowapi integration
â”œâ”€â”€ db/
â”‚   â”œâ”€â”€ base.py              # SQLAlchemy Base + engine + session factory
â”‚   â””â”€â”€ migrations/          # Alembic versions
â”œâ”€â”€ models/                  # SQLAlchemy ORM models (uno por entidad)
â”œâ”€â”€ schemas/                 # Pydantic schemas (Request / Response por entidad)
â”œâ”€â”€ routers/
â”‚   â”œâ”€â”€ auth.py
â”‚   â”œâ”€â”€ users.py
â”‚   â”œâ”€â”€ projects.py
â”‚   â”œâ”€â”€ iterations.py
â”‚   â”œâ”€â”€ stories.py
â”‚   â”œâ”€â”€ test_cases.py
â”‚   â”œâ”€â”€ executions.py
â”‚   â”œâ”€â”€ evidences.py
â”‚   â”œâ”€â”€ defects.py
â”‚   â”œâ”€â”€ certifications.py
â”‚   â”œâ”€â”€ uat_sessions.py
â”‚   â”œâ”€â”€ documents.py
â”‚   â”œâ”€â”€ chat.py
â”‚   â”œâ”€â”€ ingest.py
â”‚   â”œâ”€â”€ import_export.py
â”‚   â”œâ”€â”€ audit.py
â”‚   â””â”€â”€ jira.py
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ auth_service.py
â”‚   â”œâ”€â”€ project_service.py
â”‚   â”œâ”€â”€ qa_service.py
â”‚   â”œâ”€â”€ uat_service.py
â”‚   â”œâ”€â”€ document_service.py
â”‚   â”œâ”€â”€ rag_service.py       # Orquesta LlamaIndex
â”‚   â”œâ”€â”€ ingest_service.py    # Pipeline de ingesta
â”‚   â”œâ”€â”€ export_service.py    # GeneraciÃ³n XLSX (openpyxl)
â”‚   â”œâ”€â”€ import_service.py    # ValidaciÃ³n e importaciÃ³n XLSX
â”‚   â”œâ”€â”€ audit_service.py
â”‚   â””â”€â”€ jira_service.py
â”œâ”€â”€ tasks/
â”‚   â”œâ”€â”€ celery_app.py
â”‚   â”œâ”€â”€ ingest_tasks.py
â”‚   â””â”€â”€ export_tasks.py
â””â”€â”€ rag/
    â”œâ”€â”€ pipeline.py          # Pipeline LlamaIndex: chunk â†’ embed â†’ store
    â”œâ”€â”€ retriever.py         # RecuperaciÃ³n hÃ­brida densa + BM25 + reranking
    â””â”€â”€ chat_engine.py       # ContextChatEngine con historial de sesiÃ³n
```

### 2.3 Motor RAG â€” Pipeline de ingesta y recuperaciÃ³n

#### Pipeline de ingesta (asÃ­ncrono, via Celery)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as FastAPI
    participant Q as Celery/Redis
    participant RAG as ingest_service
    participant PG as PostgreSQL+pgvector

    C->>API: POST /api/v1/ingest/upload (archivo + project_id)
    API->>PG: INSERT rag_document (estado=Procesando)
    API->>Q: enqueue(ingest_task, doc_id)
    API-->>C: 202 Accepted {task_id}
    Q->>RAG: execute ingest_task(doc_id)
    RAG->>RAG: ExtracciÃ³n de texto (PDF/DOCX/TXT/MD)
    RAG->>RAG: Chunking (1024 tokens, overlap 200)
    RAG->>RAG: Embedding (LlamaIndex + modelo configurable)
    RAG->>PG: INSERT embeddings via pgvector
    RAG->>PG: UPDATE rag_document (estado=Indexado, fragmentos=N)
    C->>API: GET /api/v1/ingest/status/{task_id}
    API-->>C: {estado: "Indexado", fragmentos: N}
```

#### Pipeline de recuperaciÃ³n (hÃ­brido)

```mermaid
flowchart LR
    Q[Consulta usuario] --> E[Embedding consulta]
    E --> VS[BÃºsqueda vectorial\npgvector cosine]
    Q --> KW[BÃºsqueda BM25\nts_rank PostgreSQL]
    VS --> RRF[Reciprocal Rank Fusion]
    KW --> RRF
    RRF --> RR[Cross-encoder reranking\nFlagEmbedding / BGE]
    RR --> TOP[Top-K fragmentos + fuentes]
    TOP --> LLM[LLM synthesis\nContextChatEngine]
    LLM --> R[Respuesta + lista Fuentes_RAG]
```

**DecisiÃ³n de diseÃ±o (ADR-004):** Se usa bÃºsqueda hÃ­brida densa+BM25 en lugar de solo vectorial porque los documentos corporativos contienen terminologÃ­a tÃ©cnica y nÃºmeros de referencia que la bÃºsqueda semÃ¡ntica pura no recupera con precisiÃ³n. El RRF combina ambas listas sin necesitar pesos calibrados manualmente.

---

## Data Models

### Diagrama entidad-relaciÃ³n (principales)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username UK
        string password_hash
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    REVOKED_TOKENS {
        uuid id PK
        string jti UK
        uuid user_id FK
        datetime revoked_at
        datetime expires_at
    }
    LOGIN_ATTEMPTS {
        uuid id PK
        string username
        int attempt_count
        datetime window_start
        datetime locked_until
    }
    PROJECTS {
        uuid id PK
        string name UK
        string description
        date start_date
        date end_date_estimated
        string status
        uuid owner_id FK
        datetime created_at
    }
    PROJECT_MEMBERS {
        uuid project_id FK
        uuid user_id FK
        string role
    }
    ITERATIONS {
        uuid id PK
        uuid project_id FK
        string name
        date start_date
        date end_date
        string status
    }
    USER_STORIES {
        uuid id PK
        uuid iteration_id FK
        string description
        text acceptance_criteria
        string priority
        string status
        datetime created_at
    }
    TEST_CASES {
        uuid id PK
        uuid story_id FK
        string title
        text preconditions
        jsonb steps
        text input_data
        text expected_result
        string status
        datetime created_at
    }
    EXECUTIONS {
        uuid id PK
        uuid test_case_id FK
        uuid analyst_id FK
        string result
        text comments
        datetime executed_at
    }
    EVIDENCES {
        uuid id PK
        uuid execution_id FK
        string file_path
        string mime_type
        bigint size_bytes
        datetime uploaded_at
    }
    DEFECTS {
        uuid id PK
        uuid execution_id FK
        string title
        text description
        text steps_to_reproduce
        string severity
        string status
        uuid assigned_to FK
        string jira_issue_key
        datetime jira_synced_at
        datetime created_at
    }
    QAS_CYCLES {
        uuid id PK
        uuid project_id FK
        string name
        date start_date
        date end_date
        string status
    }
    CERTIFICATIONS {
        uuid id PK
        uuid cycle_id FK
        float coverage_pct
        float approval_pct
        uuid generated_by FK
        datetime generated_at
        int version
    }
    UAT_SESSIONS {
        uuid id PK
        uuid project_id FK
        string name
        text description
        date start_date
        date end_date
        string status
        uuid owner_id FK
    }
    UAT_TESTERS {
        uuid session_id FK
        uuid user_id FK
    }
    UAT_RESULTS {
        uuid id PK
        uuid session_id FK
        uuid tester_id FK
        string result
        text comments
        datetime recorded_at
    }
    DOC_TEMPLATES {
        uuid id PK
        string name
        string description
        int version
        string status
        bytea content
        datetime created_at
    }
    VERSIONED_DOCUMENTS {
        uuid id PK
        uuid template_id FK
        uuid project_id FK
        int version
        text content
        string status
        uuid generated_by FK
        datetime generated_at
        uuid approved_by FK
        datetime approved_at
    }
    AI_DRAFTS {
        uuid id PK
        uuid project_id FK
        uuid chat_session_id FK
        string artifact_type
        text original_content
        text edited_content
        string status
        uuid approved_by FK
        datetime approved_at
        datetime created_at
    }
    CHAT_SESSIONS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string status
        datetime started_at
        datetime closed_at
    }
    CHAT_MESSAGES {
        uuid id PK
        uuid session_id FK
        string role
        text content
        jsonb rag_sources
        datetime timestamp
    }
    RAG_DOCUMENTS {
        uuid id PK
        uuid project_id FK
        string filename
        string mime_type
        bigint size_bytes
        string status
        int fragment_count
        text error_message
        datetime ingested_at
    }
    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string user_role
        string operation_type
        uuid entity_id
        string entity_type
        string client_ip
        datetime timestamp_utc
        string result
        jsonb metadata
    }

    USERS ||--o{ REVOKED_TOKENS : "tokens"
    USERS ||--o{ PROJECT_MEMBERS : "miembro de"
    PROJECTS ||--o{ PROJECT_MEMBERS : "tiene"
    PROJECTS ||--o{ ITERATIONS : "contiene"
    ITERATIONS ||--o{ USER_STORIES : "contiene"
    USER_STORIES ||--o{ TEST_CASES : "tiene"
    TEST_CASES ||--o{ EXECUTIONS : "registra"
    EXECUTIONS ||--o{ EVIDENCES : "adjunta"
    EXECUTIONS ||--o{ DEFECTS : "genera"
    PROJECTS ||--o{ QAS_CYCLES : "tiene"
    QAS_CYCLES ||--o{ CERTIFICATIONS : "genera"
    PROJECTS ||--o{ UAT_SESSIONS : "tiene"
    UAT_SESSIONS ||--o{ UAT_TESTERS : "invita"
    UAT_SESSIONS ||--o{ UAT_RESULTS : "registra"
    PROJECTS ||--o{ VERSIONED_DOCUMENTS : "tiene"
    DOC_TEMPLATES ||--o{ VERSIONED_DOCUMENTS : "origina"
    PROJECTS ||--o{ CHAT_SESSIONS : "tiene"
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contiene"
    CHAT_SESSIONS ||--o{ AI_DRAFTS : "genera"
    PROJECTS ||--o{ RAG_DOCUMENTS : "indexa"
```

### Notas de diseÃ±o del modelo de datos

- **`steps` en `TEST_CASES`:** tipo `JSONB` con estructura `[{"order": 1, "description": "...", "expected": "..."}]`, mÃ¡ximo 100 elementos, validado por constraint `CHECK (jsonb_array_length(steps) <= 100)`.
- **`AUDIT_LOG`:** sin restricciones `ON DELETE CASCADE`; Ã­ndices en `(timestamp_utc DESC)`, `(user_id)`, `(entity_type, entity_id)`, `(operation_type)`. La columna `metadata` almacena estado anterior/nuevo en formato JSON.
- **`REVOKED_TOKENS`:** job de limpieza Celery Beat que elimina tokens cuya `expires_at < NOW()` (solo tokens ya expirados; no modifica el log de auditorÃ­a).
- **`RAG_DOCUMENTS`:** el campo `fragment_count` se actualiza al finalizar la ingesta; en estado `Error_Ingesta` se preserva el `error_message` tÃ©cnico.
- **`VERSIONED_DOCUMENTS.content`:** texto estructurado (Markdown o HTML limpio). Los binarios `.docx` se generan al momento de descarga, no se almacenan.
- **`AI_DRAFTS`:** `original_content` es inmutable (contenido del LLM); `edited_content` recoge las modificaciones del LÃ­der_QA. Ambos campos se preservan para trazabilidad.

---

## API Design

Prefijo global: `/api/v1`

### MÃ³dulo 1: AutenticaciÃ³n

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| POST | `/auth/login` | â€” | AutenticaciÃ³n; devuelve JWT |
| POST | `/auth/logout` | Autenticado | Revoca el JWT activo |
| POST | `/auth/register` | Administrador | Crea usuario con rol |
| PUT | `/auth/users/{id}/password` | Administrador / propio | Cambio de contraseÃ±a |

### MÃ³dulo 2: GestiÃ³n de Roles y Usuarios

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/users` | Administrador | Lista usuarios |
| GET | `/users/{id}` | Administrador | Detalle usuario |
| PUT | `/users/{id}/role` | Administrador | Asigna / cambia rol |
| DELETE | `/users/{id}` | Administrador | Desactiva usuario |

### MÃ³dulo 3: Proyectos, Iteraciones e Historias

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/projects` | Todos | Lista proyectos asignados al usuario |
| POST | `/projects` | LÃ­der_QA | Crea proyecto |
| GET | `/projects/{id}` | Asignado | Detalle proyecto |
| PUT | `/projects/{id}` | LÃ­der_QA | Edita proyecto |
| PATCH | `/projects/{id}/status` | LÃ­der_QA | Cambia estado |
| POST | `/projects/{id}/iterations` | LÃ­der_QA | Crea iteraciÃ³n |
| GET | `/projects/{id}/iterations` | Asignado | Lista iteraciones |
| PUT | `/iterations/{id}` | LÃ­der_QA | Edita iteraciÃ³n |
| POST | `/iterations/{id}/stories` | LÃ­der_QA, Analista_QA | Crea historia |
| GET | `/iterations/{id}/stories` | Asignado | Lista historias |
| PUT | `/stories/{id}` | LÃ­der_QA, Analista_QA | Edita historia |

### MÃ³dulo 4: QA/QaS

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| POST | `/stories/{id}/test-cases` | LÃ­der_QA | Crea caso de prueba |
| GET | `/stories/{id}/test-cases` | Asignado | Lista casos |
| PUT | `/test-cases/{id}` | LÃ­der_QA | Edita caso |
| PATCH | `/test-cases/{id}/status` | LÃ­der_QA | Cambia estado (Borradorâ†’Aprobadoâ†’Obsoleto) |
| POST | `/test-cases/{id}/executions` | Analista_QA | Registra ejecuciÃ³n |
| GET | `/test-cases/{id}/executions` | Asignado | Lista ejecuciones |
| POST | `/executions/{id}/evidences` | Analista_QA | Adjunta evidencia (multipart) |
| GET | `/executions/{id}/evidences` | Asignado | Lista evidencias |
| POST | `/executions/{id}/defects` | Analista_QA | Registra defecto (solo si result=Fallido) |
| GET | `/executions/{id}/defects` | Asignado | Lista defectos |
| PATCH | `/defects/{id}/status` | LÃ­der_QA, Analista_QA | Cambia estado defecto |
| POST | `/projects/{id}/qas-cycles` | LÃ­der_QA | Crea ciclo QaS |
| POST | `/qas-cycles/{id}/certifications` | LÃ­der_QA | Genera certificaciÃ³n |
| GET | `/qas-cycles/{id}/certifications` | Asignado | Lista certificaciones |

### MÃ³dulo 5: Sesiones UAT

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| POST | `/projects/{id}/uat-sessions` | LÃ­der_QA | Crea sesiÃ³n UAT |
| GET | `/projects/{id}/uat-sessions` | Asignado | Lista sesiones |
| GET | `/uat-sessions/{id}` | Asignado | Detalle |
| POST | `/uat-sessions/{id}/results` | UAT_Tester (invitado) | Registra resultado |
| GET | `/uat-sessions/{id}/summary` | LÃ­der_QA | Resumen de participaciÃ³n |

### MÃ³dulo 6: GeneraciÃ³n Documental

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/doc-templates` | Autenticado | Lista plantillas activas |
| POST | `/doc-templates` | Administrador | Crea plantilla |
| PATCH | `/doc-templates/{id}/status` | Administrador | Activa / Obsoleta |
| POST | `/projects/{id}/documents` | LÃ­der_QA | Genera documento versionado |
| GET | `/projects/{id}/documents` | Asignado | Lista documentos |
| GET | `/documents/{id}` | Asignado | Detalle + historial de versiones |
| PATCH | `/documents/{id}/approve` | LÃ­der_QA | Aprueba documento |
| GET | `/documents/{id}/download` | Asignado | Descarga (HTML o .docx) |

### MÃ³dulo 7: Motor RAG â€” Chat e Ingesta

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| POST | `/projects/{id}/chat-sessions` | LÃ­der_QA, Analista_QA | Inicia sesiÃ³n de chat |
| GET | `/chat-sessions/{id}/messages` | Propietario | Historial |
| POST | `/chat-sessions/{id}/messages` | Propietario | EnvÃ­a mensaje |
| PATCH | `/chat-sessions/{id}/close` | Propietario | Cierra sesiÃ³n |
| POST | `/projects/{id}/ingest` | Administrador, LÃ­der_QA | Sube documento para ingesta |
| GET | `/ingest/status/{task_id}` | Administrador, LÃ­der_QA | Estado de tarea |
| GET | `/projects/{id}/rag-documents` | Asignado | Lista documentos indexados |
| DELETE | `/rag-documents/{id}` | Administrador, LÃ­der_QA | Elimina del Ã­ndice |

### MÃ³dulo 8: RevisiÃ³n de Borradores IA

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/projects/{id}/ai-drafts` | LÃ­der_QA | Lista borradores pendientes |
| GET | `/ai-drafts/{id}` | LÃ­der_QA | Detalle borrador |
| PATCH | `/ai-drafts/{id}` | LÃ­der_QA | Edita borrador |
| PATCH | `/ai-drafts/{id}/approve` | LÃ­der_QA | Aprueba borrador |

### MÃ³dulo 9: ImportaciÃ³n / ExportaciÃ³n

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/projects/{id}/export` | LÃ­der_QA | Exporta XLSX (query param: `entity=test_cases\|stories\|defects\|executions`) |
| POST | `/projects/{id}/import` | LÃ­der_QA | Importa XLSX (multipart, query param: `entity`) |

### MÃ³dulo 10: AuditorÃ­a

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| GET | `/audit-log` | Administrador | Consulta filtrada y paginada |

### MÃ³dulo 11: IntegraciÃ³n Jira

| MÃ©todo | Ruta | Rol requerido | DescripciÃ³n |
|---|---|---|---|
| POST | `/projects/{id}/jira-config` | Administrador | Configura credenciales Jira |
| POST | `/defects/{id}/sync-jira` | LÃ­der_QA | Sincroniza defecto con Jira |
| PATCH | `/defects/{id}/sync-jira` | LÃ­der_QA | Actualiza estado en Jira |

---

## Architecture Decisions

### ADR-001: Tauri 2.x como cliente sin backend embebido

**Contexto:** El requisito 12 exige un ejecutable Windows que no instale Python ni .NET.  
**DecisiÃ³n:** La aplicaciÃ³n Tauri encapsula Ãºnicamente el frontend React/TypeScript. El backend FastAPI se despliega en infraestructura remota. La URL del backend se configura externamente.  
**Consecuencias:** El cliente no tiene capacidad offline. Si el backend no estÃ¡ disponible, el cliente muestra un error descriptivo (Req. 12.6). Se elimina la complejidad de empaquetar el runtime Python en el instalador.

### ADR-002: JWT stateless + lista de revocaciÃ³n en Redis

**Contexto:** El Req. 1.7 exige invalidar el JWT al hacer logout. El Req. 2.4 exige invalidar todos los JWT de un usuario al cambiar su rol. JWT stateless no admite revocaciÃ³n nativa.  
**DecisiÃ³n:** Se mantiene una lista de JTI (JWT ID) revocados en Redis con TTL igual al tiempo de expiraciÃ³n del token. En cada peticiÃ³n protegida se comprueba si el JTI estÃ¡ en la lista antes de procesar la solicitud.  
**Alternativa descartada:** Sesiones de servidor (stateful) â€” incompatible con Req. 15.4 (stateless para futura web).

### ADR-003: AuditorÃ­a append-only con polÃ­ticas de fila de PostgreSQL

**Contexto:** El Req. 11.3 prohÃ­be la modificaciÃ³n o eliminaciÃ³n de registros de auditorÃ­a.  
**DecisiÃ³n:** La tabla `audit_log` no tiene claves forÃ¡neas con `ON DELETE CASCADE`. Se crea un rol PostgreSQL de solo-inserciÃ³n (`audit_writer`) que el backend usa exclusivamente para escribir en `audit_log`. Se aplica una Row Security Policy que deniega UPDATE y DELETE a todos los roles excepto el superusuario de mantenimiento.  
**Consecuencia:** Los borrados en otras tablas no propagan a `audit_log`. El historial se conserva incluso si se elimina una entidad.

### ADR-004: BÃºsqueda hÃ­brida densa + BM25 con Reciprocal Rank Fusion

**Contexto:** Los documentos corporativos combinan texto narrativo y terminologÃ­a tÃ©cnica precisa (cÃ³digos, identificadores, numeraciones). La bÃºsqueda puramente semÃ¡ntica pierde precisiÃ³n en tÃ©rminos exactos; BM25 solo no captura sinÃ³nimos semÃ¡nticos.  
**DecisiÃ³n:** RecuperaciÃ³n hÃ­brida: (1) bÃºsqueda vectorial `<=>` cosine en pgvector; (2) bÃºsqueda full-text `ts_rank` nativa de PostgreSQL. Las dos listas se fusionan con RRF y se rerankean con un cross-encoder ligero (BGE-reranker-v2-m3 vÃ­a sentence-transformers).  
**Umbral de similitud:** configurable por proyecto, valor por defecto 0.75 (score RRF normalizado).

### ADR-005: Celery + Redis para tareas asÃ­ncronas

**Contexto:** La ingesta de documentos RAG (hasta 50 MB, chunking + embedding) y la exportaciÃ³n XLSX masiva (hasta 5000 registros) no caben en el tiempo de respuesta HTTP esperado.  
**DecisiÃ³n:** Celery con broker y backend Redis. El endpoint de ingesta devuelve `202 Accepted` con `task_id`; el cliente hace polling al endpoint de estado.  
**Alternativa descartada:** BackgroundTasks de FastAPI â€” sin persistencia de estado ni reintentos.

### ADR-006: GeneraciÃ³n XLSX con openpyxl en el backend

**Contexto:** Req. 10 requiere exportar datos en formato XLSX con encabezados en espaÃ±ol.  
**DecisiÃ³n:** `openpyxl` en el backend; el archivo se genera en memoria (`BytesIO`) y se sirve como `StreamingResponse`. Para conjuntos > 2000 registros la tarea se delega a Celery y el archivo se sirve desde almacenamiento temporal.

### ADR-007: Credenciales Jira cifradas con Fernet en la BD

**Contexto:** Req. 14.4 prohÃ­be almacenar credenciales Jira en texto plano.  
**DecisiÃ³n:** Las credenciales se cifran con `cryptography.fernet.Fernet` usando una clave maestra almacenada en variable de entorno (`JIRA_ENCRYPTION_KEY`). La clave no se versiona ni se incluye en el ejecutable.

---

## Security Considerations

### Capa de transporte
- TLS 1.2+ obligatorio en todos los endpoints (Req. 13.1)
- HSTS con `max-age=31536000; includeSubDomains` (Req. 13.4)
- CORS con lista explÃ­cita de orÃ­genes; sin comodÃ­n en producciÃ³n (Req. 13.2)

### Capa de autenticaciÃ³n y autorizaciÃ³n
- ContraseÃ±as almacenadas con bcrypt, factor de coste 12 mÃ­nimo (Req. 1.9)
- JWT firmado HS256 con JTI Ãºnico; expiraciÃ³n 8 horas (Req. 1.1)
- Bloqueo de cuenta: 5 intentos fallidos â†’ bloqueo 15 min â†’ HTTP 429 (Req. 1.3)
- AutorizaciÃ³n evaluada exclusivamente en el servidor, basada en rol del JWT (Req. 2.1)
- Lista de revocaciÃ³n en Redis para logout y cambio de rol (Req. 1.7, 2.4)
- Rol incluido en payload JWT; re-validado en cada peticiÃ³n (Req. 1.11)

### Capa de aplicaciÃ³n
- ValidaciÃ³n de entrada con Pydantic en todos los endpoints (Req. 13.7)
- Consultas parametrizadas con SQLAlchemy ORM (Req. 13.8)
- Rate limiting: 200 req/min en endpoints generales, 10 req/min en `/auth/login` (Req. 13.5)
- ValidaciÃ³n de tipo MIME y tamaÃ±o de archivos antes de procesamiento (Req. 4.7, 9.2)
- Encabezados de seguridad HTTP en middleware (`X-Content-Type-Options`, `X-Frame-Options`, `CSP`) (Req. 13.4)

### Capa de cliente (Tauri)
- JWT en memoria de proceso; prohibido persistir en disco, localStorage o registro de Windows (Req. 12.7)
- Ejecutable firmado con certificado corporativo antes de distribuciÃ³n (Req. 12.8)
- Sin secretos embebidos en el ejecutable (claves API, cadenas de conexiÃ³n) (Req. 12.9)
- URL del backend desde archivo de configuraciÃ³n externo, no compilada (Req. 12.5)

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse en todas las ejecuciones válidas del sistema: es decir, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven de puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquina.*

### Property 1: Autenticación — round-trip de hash de contraseña

*Para cualquier* contraseña válida que cumpla la política (mínimo 10 caracteres, al menos una mayúscula, una minúscula y un dígito), el hash bcrypt generado por el sistema debe verificar correctamente con la contraseña original y no debe verificar con ninguna otra cadena distinta.

**Validates: Requirements 1.9, 1.10**

### Property 2: JWT — integridad del payload de rol

*Para cualquier* usuario con rol asignado, el JWT emitido por el backend debe contener el mismo rol que tiene el usuario en la base de datos en el momento de la emisión; cualquier token con rol adulterado no debe pasar la validación.

**Validates: Requirements 1.11, 2.1**

### Property 3: Bloqueo de cuenta por intentos fallidos

*Para cualquier* nombre de usuario y cualquier secuencia de 5 o más credenciales inválidas consecutivas dentro de una ventana de 10 minutos, el sistema debe responder con HTTP 429 a partir del quinto intento y mantener el bloqueo durante al menos 15 minutos.

**Validates: Requirements 1.3**

### Property 4: Autorización — restricción por rol

*Para cualquier* operación de escritura (POST/PUT/PATCH/DELETE) y cualquier usuario con rol Observador, el backend debe responder con HTTP 403 sin ejecutar ninguna lógica de negocio del recurso solicitado.

**Validates: Requirements 2.5, 2.7**

### Property 5: Validación de fechas en Proyectos e Iteraciones

*Para cualquier* combinación de `fecha_inicio` y `fecha_fin` donde `fecha_fin < fecha_inicio`, el backend debe rechazar la creación con HTTP 422, independientemente del resto del contenido del cuerpo de la solicitud.

**Validates: Requirements 3.2, 3.5, 5.2**

### Property 6: Cálculo de cobertura y aprobación de certificación QaS

*Para cualquier* ciclo QaS con N casos de prueba y E ejecuciones, los porcentajes de cobertura y aprobación calculados por el backend deben ser iguales a los resultados de las fórmulas definidas en el Req. 4.11 con exactamente 2 decimales, para todo N ≥ 1 y E ≥ 0.

**Validates: Requirements 4.11**

### Property 7: Cálculo de métricas de sesión UAT

*Para cualquier* sesión UAT con T testers invitados y R resultados registrados (R ≤ T), el porcentaje de participación y el porcentaje de aprobados devueltos por el endpoint de resumen deben coincidir con las fórmulas del Req. 5.7 redondeadas a 2 decimales, para todo T ≥ 1 y R ≥ 0.

**Validates: Requirements 5.7**

### Property 8: Inmutabilidad de registros de auditoría

*Para cualquier* registro de auditoría insertado en la tabla `audit_log`, ninguna operación posterior (incluyendo eliminación de la entidad referenciada) debe modificar ni eliminar dicho registro.

**Validates: Requirements 11.3**

### Property 9: Validación de tipo MIME y tamaño de archivos

*Para cualquier* archivo enviado al sistema (evidencia o ingesta), si el tipo MIME no está en la lista permitida o el tamaño supera el límite configurado, el backend debe rechazar la carga con HTTP 422 sin almacenar ningún fragmento del archivo.

**Validates: Requirements 4.7, 4.8, 9.2, 9.3**

### Property 10: Importación XLSX — atomicidad

*Para cualquier* archivo XLSX de importación que contenga al menos una fila inválida (campo obligatorio ausente o tipo incorrecto), el backend debe rechazar la importación completa con HTTP 422 sin persistir ningún registro del archivo en la base de datos.

**Validates: Requirements 10.4, 10.5**

### Property 11: Motor RAG — preservación de fuentes por respuesta

*Para cualquier* mensaje enviado en una sesión de chat activa que produzca una respuesta del Motor RAG basada en documentación indexada, la lista de Fuentes_RAG en la respuesta debe contener al menos un fragmento con nombre de documento y referencia de fragmento válidos.

**Validates: Requirements 7.3**

### Property 12: Trazabilidad de borradores IA — preservación del contenido original

*Para cualquier* borrador IA que haya sido editado por un Líder_QA, el contenido original generado por el Motor RAG debe permanecer inalterado en el campo `original_content` de la entidad, independientemente del número de ediciones aplicadas al campo `edited_content`.

**Validates: Requirements 8.3**

---

## Error Handling

### Estrategia global en el backend

```python
# Manejadores de excepciÃ³n registrados en main.py
@app.exception_handler(RequestValidationError)   â†’ HTTP 422, detalles de campo
@app.exception_handler(HTTPException)            â†’ cÃ³digo HTTP + mensaje
@app.exception_handler(SQLAlchemyError)          â†’ HTTP 500, log ERROR, sin detalles internos al cliente
@app.exception_handler(Exception)               â†’ HTTP 500, log ERROR con traza, request_id
```

Todos los errores no controlados se registran con:
- Nivel `ERROR`
- Traza de pila completa
- Marca de tiempo UTC (ISO 8601)
- `request_id` (UUID generado por middleware y propagado en el encabezado `X-Request-ID`)

Los mensajes de error al cliente **nunca** exponen: nombres de tablas, rutas internas, trazas de pila, nombres de roles internos ni cadenas de conexiÃ³n.

### Errores especÃ­ficos por mÃ³dulo

| SituaciÃ³n | CÃ³digo HTTP | Comportamiento |
|---|---|---|
| Credenciales invÃ¡lidas | 401 | Mensaje genÃ©rico; no indica si falla usuario o contraseÃ±a |
| JWT ausente, malformado o expirado | 401 | Sin detalles tÃ©cnicos |
| Rol sin permiso | 403 | Sin informaciÃ³n de roles internos ni rutas |
| Recurso no encontrado | 404 | Mensaje descriptivo sin paths internos |
| Conflicto de nombre Ãºnico | 409 | Indica el campo conflictivo |
| ValidaciÃ³n de entrada | 422 | Lista de campos con error y descripciÃ³n del criterio incumplido |
| Rate limit excedido | 429 | Encabezado `Retry-After` |
| Error interno | 500 | `request_id` para correlaciÃ³n en logs; sin detalles tÃ©cnicos |
| Motor RAG timeout (>15 s) | â€” | HTTP 200 con mensaje de error en el cuerpo; historial preservado |
| Jira no disponible | â€” | HTTP 200 con campo `jira_error`; operaciÃ³n local completada |

### Errores en el cliente Tauri

- El interceptor Axios detecta 401 â†’ limpia JWT de memoria â†’ redirige a `/login`.
- En errores 5xx o de red, el cliente muestra un modal con el mensaje del campo `detail` de la respuesta; si no hay respuesta (timeout de red), muestra: "El servicio no estÃ¡ disponible. Contacte al administrador." sin exponer detalles tÃ©cnicos (Req. 12.6).
- Los errores de la cola Celery (tareas de ingesta fallidas) se comunican mediante el endpoint de estado; el cliente hace polling cada 3 segundos durante mÃ¡ximo 5 minutos.

---

## Testing Strategy

### Enfoque dual: pruebas de ejemplo + pruebas basadas en propiedades

Las pruebas se organizan en dos capas complementarias:

1. **Pruebas de ejemplo (unitarias e integraciÃ³n):** validan comportamientos especÃ­ficos, casos de borde y flujos de integraciÃ³n entre componentes.
2. **Pruebas basadas en propiedades (PBT):** validan las propiedades universales definidas en la secciÃ³n de Correctness Properties usando `Hypothesis` (Python) y `fast-check` (TypeScript).

### Backend â€” Pytest + Hypothesis

**ConfiguraciÃ³n base:**

```python
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.hypothesis]
max_examples = 100
deriving = "best"
```

**Estructura de directorios de pruebas (backend):**

```
tests/
â”œâ”€â”€ unit/
â”‚   â”œâ”€â”€ test_security.py         # PBT: Propiedades 1, 2
â”‚   â”œâ”€â”€ test_auth_lockout.py     # PBT: Propiedad 3
â”‚   â”œâ”€â”€ test_rbac.py             # PBT: Propiedad 4
â”‚   â”œâ”€â”€ test_date_validation.py  # PBT: Propiedad 5
â”‚   â”œâ”€â”€ test_certifications.py   # PBT: Propiedad 6
â”‚   â”œâ”€â”€ test_uat_metrics.py      # PBT: Propiedad 7
â”‚   â”œâ”€â”€ test_audit_immutability.py # PBT: Propiedad 8
â”‚   â”œâ”€â”€ test_file_validation.py  # PBT: Propiedad 9
â”‚   â””â”€â”€ test_import_atomicity.py # PBT: Propiedad 10
â”œâ”€â”€ integration/
â”‚   â”œâ”€â”€ test_auth_flow.py
â”‚   â”œâ”€â”€ test_project_lifecycle.py
â”‚   â”œâ”€â”€ test_qa_execution_flow.py
â”‚   â”œâ”€â”€ test_uat_session_flow.py
â”‚   â”œâ”€â”€ test_rag_chat.py         # Pruebas: Propiedades 11, 12
â”‚   â”œâ”€â”€ test_document_generation.py
â”‚   â””â”€â”€ test_audit_log.py
â””â”€â”€ conftest.py                  # Fixtures: TestClient, DB en memoria, mocks LLM
```

**Ejemplo de prueba basada en propiedades (Propiedad 6 â€” certificaciÃ³n QaS):**

```python
# Feature: qa-project-mgmt, Property 6: CÃ¡lculo de cobertura y aprobaciÃ³n de certificaciÃ³n QaS
from hypothesis import given, settings
from hypothesis import strategies as st
from app.services.qa_service import calculate_certification_metrics

@given(
    total_cases=st.integers(min_value=1, max_value=500),
    executed_cases=st.integers(min_value=0),
    approved_executions=st.integers(min_value=0)
)
@settings(max_examples=100)
def test_certification_metrics_formula(total_cases, executed_cases, approved_executions):
    executed_cases = min(executed_cases, total_cases)
    approved_executions = min(approved_executions, executed_cases)

    result = calculate_certification_metrics(
        total_cases=total_cases,
        executed_cases=executed_cases,
        approved_executions=approved_executions
    )

    expected_coverage = round((executed_cases / total_cases) * 100, 2)
    expected_approval = round((approved_executions / executed_cases) * 100, 2) if executed_cases > 0 else 0.0

    assert result.coverage_pct == expected_coverage
    assert result.approval_pct == expected_approval
```

**Ejemplo de prueba basada en propiedades (Propiedad 5 â€” validaciÃ³n de fechas):**

```python
# Feature: qa-project-mgmt, Property 5: ValidaciÃ³n de fechas en Proyectos e Iteraciones
from hypothesis import given, settings
from hypothesis import strategies as st
from datetime import date, timedelta

@given(
    start=st.dates(min_value=date(2020, 1, 1), max_value=date(2030, 12, 31)),
    delta=st.integers(min_value=1, max_value=3650)
)
@settings(max_examples=100)
def test_project_end_before_start_rejected(client, start, delta):
    end = start - timedelta(days=delta)  # siempre anterior al inicio
    response = client.post("/api/v1/projects", json={
        "name": "Test Project",
        "start_date": start.isoformat(),
        "end_date_estimated": end.isoformat()
    })
    assert response.status_code == 422
```

### Frontend â€” Vitest + React Testing Library + fast-check

**Pruebas de propiedades en TypeScript:**

```typescript
// Feature: qa-project-mgmt, Property 10: ImportaciÃ³n XLSX â€” atomicidad
import fc from 'fast-check'
import { validateXlsxRow } from '@/services/importService'

test('Property 10: fila con campo obligatorio ausente siempre falla validaciÃ³n', () => {
  fc.assert(
    fc.property(
      fc.record({
        title: fc.constantFrom('', undefined, null, '   '), // campos vacÃ­os / nulos
        description: fc.string({ minLength: 1 })
      }),
      (row) => {
        const result = validateXlsxRow(row, 'test_cases')
        return result.isValid === false && result.errors.length > 0
      }
    ),
    { numRuns: 100 }
  )
})
```

### Cobertura objetivo

| Capa | Herramienta | Cobertura mÃ­nima |
|---|---|---|
| Backend â€” lÃ³gica de negocio (services) | Pytest + Hypothesis | 90 % lÃ­neas |
| Backend â€” routers/endpoints | Pytest (integraciÃ³n) | 85 % lÃ­neas |
| Frontend â€” componentes UI | Vitest + RTL | 80 % lÃ­neas |
| Frontend â€” servicios/utils | Vitest + fast-check | 85 % lÃ­neas |

### Pruebas de integraciÃ³n end-to-end

- Framework: `Playwright` (desde el cliente Tauri en modo desarrollo o desde un navegador apuntando al backend de pruebas)
- Escenarios clave: flujo completo de autenticaciÃ³n â†’ creaciÃ³n de proyecto â†’ ejecuciÃ³n de caso de prueba â†’ generaciÃ³n de certificaciÃ³n.
- Las pruebas E2E se ejecutan en CI contra una instancia de PostgreSQL con datos semilla.

### CI/CD

```yaml
# .github/workflows/ci.yml (esquema)
jobs:
  backend-tests:
    - pytest tests/unit tests/integration --cov=app --cov-report=xml
    - hypothesis database persistida entre runs para reproducibilidad
  frontend-tests:
    - vitest run --coverage
  e2e:
    - playwright test (solo en rama main y PRs a main)
```

---

## Estructura de Carpetas del Proyecto

```
qa-project-mgmt/
â”œâ”€â”€ .kiro/
â”‚   â””â”€â”€ specs/qa-project-mgmt/
â”‚       â”œâ”€â”€ .config.kiro
â”‚       â”œâ”€â”€ requirements.md
â”‚       â””â”€â”€ design.md
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ app/                    # CÃ³digo fuente FastAPI (ver secciÃ³n 2.2)
â”‚   â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ alembic/
â”‚   â”‚   â”œâ”€â”€ env.py
â”‚   â”‚   â””â”€â”€ versions/
â”‚   â”œâ”€â”€ pyproject.toml          # Dependencias (uv / Poetry)
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ .env.example            # Plantilla de variables de entorno (no versionado .env)
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/         # Componentes React reutilizables
â”‚   â”‚   â”œâ”€â”€ pages/              # PÃ¡ginas por mÃ³dulo
â”‚   â”‚   â”œâ”€â”€ stores/             # Zustand slices
â”‚   â”‚   â”œâ”€â”€ services/           # Clientes HTTP por mÃ³dulo
â”‚   â”‚   â”œâ”€â”€ schemas/            # Zod schemas de formularios
â”‚   â”‚   â”œâ”€â”€ hooks/              # Custom hooks
â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ vite.config.ts
â”‚   â”œâ”€â”€ tsconfig.json
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ tauri/
â”‚   â”œâ”€â”€ src/                    # CÃ³digo Rust de la capa Tauri
â”‚   â”œâ”€â”€ Cargo.toml
â”‚   â”œâ”€â”€ tauri.conf.json         # ConfiguraciÃ³n Tauri 2.x
â”‚   â””â”€â”€ icons/
â”œâ”€â”€ app-config.json.example     # Plantilla de configuraciÃ³n del cliente (URL backend)
â”œâ”€â”€ docker-compose.yml          # PostgreSQL + Redis para desarrollo local
â””â”€â”€ README.md
```

---

## Consideraciones de Escalabilidad y Operaciones

- **Pool de conexiones:** SQLAlchemy async engine con `pool_size=10`, `max_overflow=20`. pgvector requiere conexiones adicionales por bÃºsquedas concurrentes; se recomienda PgBouncer en producciÃ³n.
- **Ãndices pgvector:** `HNSW` (Ã­ndice aproximado) para vectores de dimensiÃ³n â‰¥ 768; `IVFFlat` para dimensiones menores. Se crean via Alembic con `CREATE INDEX CONCURRENTLY`.
- **Celery workers:** mÃ­nimo 2 workers para ingesta RAG; separar la cola de ingesta (`ingest`) de la cola de exportaciÃ³n (`export`) para evitar que las ingestas bloqueen las exportaciones.
- **Logs estructurados:** `structlog` en el backend; salida JSON con campos `timestamp`, `level`, `request_id`, `user_id`, `operation`. Compatible con ELK / Datadog.
- **Migraciones Alembic:** `alembic upgrade head` en el arranque del contenedor (script de entrypoint); se bloquea el inicio si falla.
- **Respaldo del Ã­ndice vectorial:** los embeddings en pgvector se respaldan con el backup estÃ¡ndar de PostgreSQL (`pg_dump`). No se requiere respaldo separado.


