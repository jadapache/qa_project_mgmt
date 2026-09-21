# Implementation Plan: QA Project Mgmt

## Overview

Plan de implementación incremental para la aplicación corporativa de escritorio **QA Project Mgmt**: cliente Tauri 2.x (React + TypeScript + Vite), backend FastAPI (Python 3.12), base de datos PostgreSQL con SQLAlchemy 2.x / Alembic, motor RAG (LlamaIndex + pgvector), cola asíncrona Celery + Redis, integración Jira y distribución como ejecutable Windows (.msi/.exe).

Las tareas siguen siete fases del roadmap: Fase 0 (PoC), Fase 1 (Cimientos del Backend), Fase 2 (Cliente Tauri + Frontend), Fase 3 (RAG y Documentación), Fase 4 (QA/QaS y Certificaciones), Fase 5 (UAT y Piloto) y Fase 6 (Evolución). Cada sub-tarea referencia los requisitos que la originan. Las sub-tareas marcadas con `*` son opcionales y no deben implementarse automáticamente; las que no tienen `*` son obligatorias.

---

## Tasks

---

### Fase 0 — Validación Tecnológica (PoC)

- [ ] 1. Configurar la estructura base del repositorio y el entorno de desarrollo
  - Crear la estructura de carpetas según el diseño: `backend/`, `frontend/`, `tauri/`, `docker-compose.yml`, `README.md`.
  - Configurar `docker-compose.yml` con servicios PostgreSQL 15 y Redis para desarrollo local.
  - Crear `.env.example` con todas las variables de entorno requeridas (sin valores reales).
  - Crear `app-config.json.example` con la plantilla de URL del backend para el cliente Tauri.
  - _Requisitos: 12.5, 13.1, RNF-03.2_

  - [ ] 1.1 Crear estructura de carpetas del proyecto y archivos de configuración base
    - Inicializar el repositorio con la estructura definida en el diseño (sección "Estructura de Carpetas del Proyecto").
    - Crear `docker-compose.yml` con PostgreSQL 15+ y Redis; verificar que ambos levantan con `docker compose up -d`.
    - Crear `.env.example` con todas las variables: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `JIRA_ENCRYPTION_KEY`, `LLM_PROVIDER`, `ALLOWED_ORIGINS`, etc.
    - _Requisitos: RNF-03.2, 12.5, 12.9_

  - [ ] 1.2 Instalar y validar WebView2 Runtime en equipo Windows corporativo (PoC)
    - Verificar que WebView2 Runtime está disponible en los equipos objetivo o puede instalarse sin privilegios elevados.
    - Documentar el resultado en `docs/poc/webview2-validation.md`.
    - _Requisitos: 12.2, 12.3, 16.2_

  - [ ] 1.3 Scaffolding del proyecto Tauri 2.x + React + TypeScript + Vite
    - Inicializar proyecto Tauri 2.x con frontend Vite + React + TypeScript dentro de la carpeta `frontend/` y la capa Tauri en `tauri/`.
    - Configurar `tauri.conf.json` para leer la URL del backend desde `app-config.json` externo al ejecutable.
    - Verificar que la aplicación compila y levanta con WebView2 en Windows 10/11.
    - _Requisitos: 12.1, 12.2, 12.5, 16.1_

  - [ ] 1.4 Scaffolding del proyecto FastAPI con configuración de seguridad base
    - Crear el proyecto FastAPI con `pyproject.toml` (uv/Poetry), estructura `app/` según el diseño.
    - Configurar Pydantic `BaseSettings` en `core/config.py` para leer variables de entorno.
    - Habilitar HTTPS mediante TLS (configuración Uvicorn + certificado autofirmado para PoC).
    - Agregar middleware CORS con lista explícita de orígenes desde variable de entorno.
    - _Requisitos: 13.1, 13.2, 15.1, 16.4_

  - [ ] 1.5 Prueba de conectividad HTTPS Cliente Tauri ↔ Backend FastAPI (PoC)
    - Implementar un endpoint `/health` en FastAPI que devuelva `{"status": "ok"}`.
    - Configurar el cliente Tauri para leer la URL del backend desde `app-config.json` y hacer una petición HTTPS al endpoint `/health`.
    - Verificar la conexión a través del proxy corporativo si aplica.
    - Documentar el resultado en `docs/poc/connectivity-validation.md`.
    - _Requisitos: 12.4, 12.6, 16.3, 16.4_

- [ ] 2. Punto de control Fase 0 — Asegurarse de que todos los tests pasan y el entorno PoC funciona
  - Verificar que el PoC de conectividad funciona en un equipo Windows corporativo.
  - Asegurar que `docker compose up` levanta PostgreSQL y Redis sin errores.
  - Preguntar al usuario si hay bloqueos antes de continuar con la Fase 1.

---

### Fase 1 — Cimientos del Backend

- [ ] 3. Implementar la capa de base de datos: modelos ORM, migraciones Alembic y seguridad append-only de auditoría
  - Crear todos los modelos SQLAlchemy 2.x en `backend/app/models/` según el diagrama ER del diseño.
  - Configurar Alembic con la migración inicial que crea todas las tablas.
  - Aplicar política Row Security en PostgreSQL para `audit_log` (solo-inserción).
  - _Requisitos: 11.1, 11.2, 11.3, RNF-03.1_

  - [ ] 3.1 Implementar modelos ORM para usuarios, autenticación y control de acceso
    - Crear modelos: `User`, `RevokedToken`, `LoginAttempt`, `ProjectMember` en `models/`.
    - Definir índices: `(username)` en `User`, `(jti)` en `RevokedToken`, `(username, window_start)` en `LoginAttempt`.
    - _Requisitos: 1.1, 1.3, 1.9, 2.1, 2.3_

  - [ ] 3.2 Implementar modelos ORM para proyectos, iteraciones e historias de usuario
    - Crear modelos: `Project`, `Iteration`, `UserStory` con sus relaciones.
    - Definir constraint `UNIQUE` en `Project.name`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ] 3.3 Implementar modelos ORM para QA/QaS: casos de prueba, ejecuciones, evidencias, defectos, ciclos y certificaciones
    - Crear modelos: `TestCase` (con campo `steps JSONB` y constraint `CHECK (jsonb_array_length(steps) <= 100)`), `Execution`, `Evidence`, `Defect`, `QasCycle`, `Certification`.
    - _Requisitos: 4.1, 4.3, 4.5, 4.9, 4.11_

  - [ ] 3.4 Implementar modelos ORM para UAT, documentación, chat, RAG y auditoría
    - Crear modelos: `UatSession`, `UatTester`, `UatResult`, `DocTemplate`, `VersionedDocument`, `AiDraft`, `ChatSession`, `ChatMessage`, `RagDocument`.
    - Crear modelo `AuditLog` sin `ON DELETE CASCADE`; definir índices: `(timestamp_utc DESC)`, `(user_id)`, `(entity_type, entity_id)`, `(operation_type)`.
    - _Requisitos: 5.1, 6.1, 7.1, 8.1, 9.1, 11.1, 11.2_

  - [ ] 3.5 Crear migración Alembic inicial y configurar política append-only en audit_log
    - Ejecutar `alembic revision --autogenerate -m "initial_schema"` y revisar el script generado.
    - Agregar en la migración la creación del rol PostgreSQL `audit_writer` con solo privilegio `INSERT` en `audit_log`.
    - Agregar Row Security Policy que deniega `UPDATE` y `DELETE` a todos los roles excepto superusuario.
    - Verificar que `alembic upgrade head` se ejecuta sin errores contra la BD local de Docker.
    - _Requisitos: 11.3, RNF-03.1_

  - [ ]* 3.6 Escribir prueba de propiedad — Propiedad 8: Inmutabilidad de registros de auditoría
    - **Propiedad 8: Para cualquier registro de auditoría insertado en `audit_log`, ninguna operación posterior debe modificarlo ni eliminarlo.**
    - Usar Hypothesis para generar operaciones aleatorias (UPDATE/DELETE) sobre `audit_log` y verificar que la Row Security Policy las rechaza.
    - Archivo: `tests/unit/test_audit_immutability.py`
    - **Valida: Requisito 11.3**

- [ ] 4. Implementar el módulo de autenticación y seguridad en el backend
  - Implementar `core/security.py`: hash bcrypt (factor 12), JWT encode/decode (HS256, JTI, expiración 8h, rol en payload), lista de revocación en Redis.
  - Implementar `core/rate_limiter.py` con Slowapi: 10 req/min en `/auth/login`, 200 req/min general.
  - Implementar `core/dependencies.py`: `get_current_user`, `require_role`, `get_db`.
  - _Requisitos: 1.1, 1.3, 1.5, 1.6, 1.7, 1.9, 1.10, 1.11, 2.1, 13.5_

  - [ ] 4.1 Implementar utilidades de seguridad: bcrypt, JWT y lista de revocación Redis
    - En `core/security.py`: función `hash_password(plain: str) -> str` con bcrypt factor ≥ 12.
    - Función `verify_password(plain: str, hashed: str) -> bool`.
    - Función `create_access_token(data: dict) -> str` con JTI único, expiración 8h y rol en payload.
    - Función `decode_access_token(token: str) -> dict` con validación de firma y expiración.
    - Función `revoke_token(jti: str, expires_at: datetime)` que escribe el JTI en Redis con TTL.
    - Función `is_token_revoked(jti: str) -> bool` que consulta Redis.
    - _Requisitos: 1.1, 1.7, 1.9, 1.11, 2.4_

  - [ ]* 4.2 Escribir prueba de propiedad — Propiedad 1: Round-trip de hash de contraseña
    - **Propiedad 1: Para cualquier contraseña válida (≥ 10 chars, ≥ 1 mayúscula, ≥ 1 minúscula, ≥ 1 dígito), `verify_password(plain, hash_password(plain))` siempre es `True`; para cualquier cadena distinta, el resultado es `False`.**
    - Usar Hypothesis con estrategia de generación de contraseñas válidas e inválidas.
    - Archivo: `tests/unit/test_security.py`
    - **Valida: Requisitos 1.9, 1.10**

  - [ ]* 4.3 Escribir prueba de propiedad — Propiedad 2: Integridad del payload de rol en el JWT
    - **Propiedad 2: Para cualquier usuario con rol asignado, el JWT emitido contiene exactamente el mismo rol; cualquier token con rol adulterado no pasa la validación.**
    - Usar Hypothesis para generar combinaciones de roles válidos e inválidos y verificar el comportamiento de `decode_access_token`.
    - Archivo: `tests/unit/test_security.py`
    - **Valida: Requisitos 1.11, 2.1**

  - [ ] 4.4 Implementar control de intentos fallidos de autenticación y bloqueo de cuenta
    - En `auth_service.py`: lógica que incrementa `LoginAttempt.attempt_count` en cada fallo.
    - Bloquear el nombre de usuario 15 minutos tras 5 intentos fallidos en 10 minutos; devolver HTTP 429.
    - Limpiar el contador tras autenticación exitosa.
    - _Requisitos: 1.2, 1.3_

  - [ ]* 4.5 Escribir prueba de propiedad — Propiedad 3: Bloqueo de cuenta por intentos fallidos
    - **Propiedad 3: Para cualquier nombre de usuario y cualquier secuencia de ≥ 5 credenciales inválidas consecutivas en una ventana de 10 min, el backend responde HTTP 429 a partir del quinto intento y mantiene el bloqueo ≥ 15 min.**
    - Archivo: `tests/unit/test_auth_lockout.py`
    - **Valida: Requisito 1.3**

  - [ ] 4.6 Implementar routers de autenticación y gestión de usuarios
    - Router `routers/auth.py`: `POST /auth/login`, `POST /auth/logout`, `POST /auth/register` (solo Administrador), `PUT /auth/users/{id}/password`.
    - Router `routers/users.py`: `GET /users`, `GET /users/{id}`, `PUT /users/{id}/role`, `DELETE /users/{id}`.
    - Validar política de contraseña en registro y cambio: mínimo 10 chars, ≥ 1 mayúscula, ≥ 1 minúscula, ≥ 1 dígito; devolver HTTP 422 con descripción del criterio incumplido.
    - Al cambiar rol: invalidar todos los JWT activos del usuario en Redis.
    - _Requisitos: 1.1, 1.2, 1.6, 1.7, 1.10, 1.12, 2.3, 2.4, 2.6_

  - [ ]* 4.7 Escribir prueba de propiedad — Propiedad 4: Restricción de escritura por rol Observador
    - **Propiedad 4: Para cualquier operación POST/PUT/PATCH/DELETE y cualquier usuario con rol Observador, el backend responde HTTP 403 sin ejecutar lógica de negocio.**
    - Archivo: `tests/unit/test_rbac.py`
    - **Valida: Requisitos 2.5, 2.7**

- [ ] 5. Implementar el servicio de auditoría y middleware de seguridad HTTP
  - Implementar `services/audit_service.py`: función `log_event(...)` que inserta en `audit_log` vía el rol `audit_writer`.
  - Agregar middleware en `main.py` que añade los encabezados de seguridad HTTP a todas las respuestas.
  - Configurar manejadores de excepción globales en `main.py`.
  - _Requisitos: 11.1, 11.2, 11.3, 13.4, RNF-02.1_

  - [ ] 5.1 Implementar servicio de auditoría y registrar eventos en todos los módulos críticos
    - Crear `services/audit_service.py` con función `log_event(user_id, user_role, operation_type, entity_id, entity_type, client_ip, result, metadata)`.
    - Integrar llamadas a `log_event` en todos los routers listados en el Req. 11.1 (auth, proyectos, QA, UAT, documentos, RAG, importación/exportación, roles).
    - _Requisitos: 11.1, 11.2, 11.3_

  - [ ] 5.2 Implementar middleware de encabezados de seguridad y manejadores de excepción
    - Agregar middleware que añade: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` a todas las respuestas.
    - Registrar manejadores: `RequestValidationError` → 422, `HTTPException` → código HTTP, `SQLAlchemyError` → 500 con log, `Exception` → 500 con `request_id`.
    - Agregar middleware que genera `request_id` (UUID) por petición y lo propaga en el encabezado `X-Request-ID`.
    - _Requisitos: 13.4, RNF-02.1_

- [ ] 6. Implementar gestión de proyectos, iteraciones e historias de usuario en el backend
  - Implementar `routers/projects.py`, `routers/iterations.py`, `routers/stories.py` con toda la lógica de negocio delegada a `services/project_service.py`.
  - _Requisitos: 3.1 – 3.11_

  - [ ] 6.1 Implementar CRUD de proyectos con validación de fechas y control de estado
    - `POST /projects`: validar nombre único (409 si duplicado), fechas (422 si `end < start`), persistir con estado inicial `Activo`.
    - `GET /projects`: devolver solo los proyectos asignados al usuario autenticado.
    - `PUT /projects/{id}` y `PATCH /projects/{id}/status`: registrar cambio de estado en `audit_log`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.9, 3.10, 3.11_

  - [ ] 6.2 Implementar CRUD de iteraciones e historias de usuario con validación de estados
    - `POST /projects/{id}/iterations`: validar que el proyecto está `Activo` (409 si no), validar fechas (422), persistir con estado `Planificada`.
    - `POST /iterations/{id}/stories`: validar que la iteración está `Planificada` o `En_Curso` (409 si `Finalizada`), persistir con prioridad por defecto `Media`.
    - _Requisitos: 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 6.3 Escribir prueba de propiedad — Propiedad 5: Validación de fechas en proyectos e iteraciones
    - **Propiedad 5: Para cualquier combinación de `fecha_inicio` y `fecha_fin` donde `fecha_fin < fecha_inicio`, el backend rechaza con HTTP 422, independientemente del resto del cuerpo de la solicitud.**
    - Archivo: `tests/unit/test_date_validation.py`
    - **Valida: Requisitos 3.2, 3.5, 5.2**

- [ ] 7. Punto de control Fase 1 — Asegurarse de que todos los tests pasan antes de la Fase 2
  - Ejecutar `pytest tests/unit --cov=app` y verificar cobertura ≥ 90 % en servicios.
  - Ejecutar `alembic upgrade head` en la BD Docker y verificar que no hay errores.
  - Preguntar al usuario si hay dudas antes de continuar.

---

### Fase 2 — Cliente Tauri y Frontend React

- [ ] 8. Configurar el proyecto frontend: dependencias, cliente HTTP, estado global y esquemas de validación
  - Instalar y configurar: Zustand (slices por módulo), React Hook Form + Zod, Axios con interceptores, React Router v6.
  - Configurar Vitest + React Testing Library + fast-check para pruebas unitarias y PBT del frontend.
  - _Requisitos: 1.4, 12.4, 12.7, 15.3_

  - [ ] 8.1 Instalar dependencias del frontend y configurar el cliente HTTP Axios
    - Instalar: `zustand`, `react-hook-form`, `zod`, `axios`, `react-router-dom`, `@tanstack/react-query`.
    - Crear `services/httpClient.ts`: instancia Axios con `baseURL` leída desde configuración Tauri, interceptor que adjunta JWT del store Zustand, interceptor que detecta HTTP 401 y redirige a `/login`, reintentos exponenciales para HTTP 503.
    - El JWT **nunca** se almacena en `localStorage`, cookies ni `sessionStorage`; solo en el store Zustand en memoria.
    - _Requisitos: 1.4, 12.4, 12.7_

  - [ ] 8.2 Configurar Zustand con slices por módulo y Vitest + fast-check
    - Crear slices: `authSlice`, `projectSlice`, `qaSlice`, `uatSlice`, `documentSlice`, `chatSlice`, `auditSlice`.
    - Configurar `vitest.config.ts`, instalar `@testing-library/react`, `fast-check`.
    - Agregar scripts `test` y `test:coverage` en `package.json`.
    - _Requisitos: 12.7, 15.3_

- [ ] 9. Implementar el módulo de autenticación en el frontend (AuthModule)
  - Pantalla de login con formulario React Hook Form + Zod; consumir `POST /auth/login`; almacenar JWT en Zustand; redirigir según rol.
  - Lógica de cierre de sesión: limpiar JWT de memoria + llamar `POST /auth/logout`.
  - Detectar expiración de JWT (interceptor 401) y redirigir al login descartando el JWT.
  - _Requisitos: 1.4, 1.7, 1.12_

  - [ ] 9.1 Implementar pantalla de login y flujo de autenticación
    - Crear `pages/LoginPage.tsx` con formulario de usuario/contraseña, manejo de errores HTTP 401/429 con mensajes genéricos amigables.
    - Implementar `stores/authSlice.ts`: acciones `login`, `logout`, `setToken`, selectors.
    - Implementar `services/authService.ts`: wrappers para `POST /auth/login` y `POST /auth/logout`.
    - _Requisitos: 1.1, 1.4, 1.7_

  - [ ]* 9.2 Escribir prueba de propiedad frontend — Propiedad 4: Operaciones bloqueadas para Observador
    - **Propiedad 4 (frontend): Para cualquier combinación de endpoint de escritura y token de usuario con rol Observador, el cliente recibe HTTP 403 y no modifica el estado local.**
    - Usar fast-check para generar combinaciones de rutas y roles.
    - Archivo: `frontend/tests/unit/authSlice.property.test.ts`
    - **Valida: Requisitos 2.5, 2.7**

- [ ] 10. Implementar el módulo de proyectos, iteraciones e historias (ProjectModule)
  - Vistas para listar, crear, editar proyectos; gestión de iteraciones e historias de usuario.
  - Validación Zod en formularios (nombre, fechas, prioridad).
  - _Requisitos: 3.1 – 3.11_

  - [ ] 10.1 Implementar vistas de proyectos e iteraciones
    - Crear `pages/ProjectsPage.tsx`, `pages/ProjectDetailPage.tsx`.
    - Componentes para crear/editar proyecto con validación de fechas en cliente (Zod).
    - Componente de lista de iteraciones con creación inline.
    - _Requisitos: 3.1, 3.2, 3.4, 3.9, 3.10_

  - [ ] 10.2 Implementar vistas de historias de usuario
    - Crear `pages/StoriesPage.tsx` con listado y formulario de creación/edición de historias.
    - Validar campos obligatorios y límites de caracteres con Zod.
    - _Requisitos: 3.7, 3.8_

- [ ] 11. Implementar el módulo de importación y exportación XLSX (ImportExportModule)
  - Botones de exportación e importación por entidad (casos de prueba, historias, defectos, ejecuciones).
  - Mostrar reporte de errores de importación fila por fila.
  - _Requisitos: 10.1 – 10.6_

  - [ ] 11.1 Implementar servicio de exportación XLSX en el backend
    - Crear `services/export_service.py` con función `generate_xlsx(project_id, entity, db)` usando `openpyxl`; encabezados en español.
    - Para conjuntos > 2000 registros, delegar a tarea Celery en `tasks/export_tasks.py`; devolver `task_id`.
    - Endpoint `GET /projects/{id}/export` con query param `entity`.
    - _Requisitos: 10.1, 10.2, RNF-01.3_

  - [ ] 11.2 Implementar servicio de importación XLSX en el backend
    - Crear `services/import_service.py` con función `validate_and_import(file, entity, project_id, db)`.
    - Validar presencia y tipo de columnas obligatorias antes de persistir.
    - Si hay cualquier fila inválida: HTTP 422 con reporte detallado de fila+columna; no persistir ningún registro.
    - Si todo es válido: persistir en transacción atómica; devolver conteo de registros importados.
    - _Requisitos: 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.3 Escribir prueba de propiedad — Propiedad 10: Atomicidad en importación XLSX
    - **Propiedad 10: Para cualquier archivo XLSX con al menos una fila inválida, el backend rechaza con HTTP 422 sin persistir ningún registro.**
    - Usar Hypothesis para generar archivos XLSX con combinaciones de filas válidas e inválidas.
    - Archivo: `tests/unit/test_import_atomicity.py`
    - **Valida: Requisitos 10.4, 10.5**

  - [ ]* 11.4 Escribir prueba de propiedad frontend — Propiedad 10: Validación de fila XLSX
    - **Propiedad 10 (frontend): Para cualquier fila con campo obligatorio ausente o nulo, `validateXlsxRow` devuelve `isValid: false` con al menos un error.**
    - Usar fast-check con estrategias de valores vacíos/nulos.
    - Archivo: `frontend/tests/unit/importService.property.test.ts`
    - **Valida: Requisitos 10.3, 10.4**

  - [ ] 11.5 Implementar vistas de importación y exportación en el frontend
    - Crear `pages/ImportExportPage.tsx` con selector de entidad, botón de exportación (descarga directa) y formulario de carga XLSX.
    - Mostrar reporte de errores de importación con tabla de filas y columnas afectadas.
    - _Requisitos: 10.1, 10.3, 10.4_

- [ ] 12. Implementar el módulo de administración de usuarios (AdminModule)
  - Pantalla para listar usuarios, crear usuario con rol, cambiar rol, desactivar usuario.
  - Solo accesible para Administrador.
  - _Requisitos: 2.1 – 2.8_

  - [ ] 12.1 Implementar vistas de gestión de usuarios y roles en el frontend
    - Crear `pages/admin/UsersPage.tsx` con tabla de usuarios, modal de creación y modal de cambio de rol.
    - Proteger rutas administrativas con guard de rol `Administrador`.
    - _Requisitos: 2.1, 2.3, 2.4, 2.5_

- [ ] 13. Construir y validar el instalador Tauri 2.x para Windows
  - Compilar el instalador `.msi`/`.exe` con Tauri 2.x.
  - Verificar que el ejecutable corre en Windows 10 (v1903+) y Windows 11 sin instalar dependencias adicionales.
  - Firmar el ejecutable con el certificado corporativo.
  - _Requisitos: 12.1, 12.2, 12.7, 12.8, 12.9, 16.1, 16.5_

  - [ ] 13.1 Compilar el instalador Windows y verificar firma digital
    - Ejecutar `tauri build` y verificar que el instalador `.msi`/`.exe` se genera correctamente.
    - Firmar el ejecutable con el certificado corporativo (`signtool.exe` o equivalente).
    - Verificar que el ejecutable no contiene secretos embebidos (claves, cadenas de conexión).
    - Probar la instalación en un equipo Windows 10 corporativo con las políticas de antivirus activas.
    - _Requisitos: 12.1, 12.8, 12.9, 16.1, 16.5_

- [ ] 14. Punto de control Fase 2 — Asegurarse de que todos los tests pasan antes de la Fase 3
  - Ejecutar `vitest run --coverage` en el frontend y verificar cobertura ≥ 80 %.
  - Verificar que el instalador Windows funciona en el entorno corporativo objetivo.
  - Preguntar al usuario si hay ajustes antes de continuar.

---

### Fase 3 — Motor RAG, Ingesta Documental y Generación Documental

- [ ] 15. Implementar el pipeline de ingesta RAG asíncrono con Celery
  - Implementar pipeline LlamaIndex: extracción de texto, chunking (1024 tokens, overlap 200), embedding, almacenamiento en pgvector.
  - Integrar con Celery para ejecución asíncrona; endpoint devuelve `202 Accepted` con `task_id`.
  - _Requisitos: 9.1 – 9.8_

  - [ ] 15.1 Configurar Celery, Redis y la aplicación de tareas asíncronas
    - Crear `tasks/celery_app.py` con configuración de broker Redis y backend Redis.
    - Crear colas separadas: `ingest` para ingesta RAG, `export` para exportación XLSX.
    - Configurar Celery Beat para el job de limpieza de tokens revocados expirados en `REVOKED_TOKENS`.
    - _Requisitos: 9.1, ADR-005, RNF-01.3_

  - [ ] 15.2 Implementar el pipeline de ingesta de documentos en `rag/pipeline.py`
    - Extracción de texto según MIME: PDF (`pymupdf`), DOCX (`python-docx`), TXT/MD (directo).
    - Chunking: 1024 tokens con overlap de 200 usando `SentenceSplitter` de LlamaIndex.
    - Embedding con el modelo configurado en variables de entorno (`LLM_PROVIDER`).
    - Almacenamiento de vectores en pgvector mediante `PGVectorStore` de LlamaIndex.
    - _Requisitos: 9.2, 9.4, 9.5_

  - [ ] 15.3 Implementar tarea Celery de ingesta y endpoints de control
    - Crear `tasks/ingest_tasks.py` con tarea `ingest_document_task(doc_id)` que invoca el pipeline.
    - Al finalizar: actualizar `rag_document.status = "Indexado"` y `fragment_count = N`.
    - Al fallar: actualizar `rag_document.status = "Error_Ingesta"` con `error_message`.
    - Endpoints: `POST /projects/{id}/ingest` (carga + encola), `GET /ingest/status/{task_id}`, `DELETE /rag-documents/{id}`.
    - Validar MIME y tamaño (≤ 50 MB) antes de encolar; rechazar con HTTP 422 si no cumple.
    - _Requisitos: 9.1, 9.3, 9.6, 9.7, 9.8_

  - [ ]* 15.4 Escribir prueba de propiedad — Propiedad 9: Validación de tipo MIME y tamaño de archivos
    - **Propiedad 9: Para cualquier archivo con MIME no permitido o tamaño > límite, el backend rechaza con HTTP 422 sin almacenar ningún fragmento del archivo.**
    - Cubrir tanto evidencias (Req. 4.7) como ingesta RAG (Req. 9.2) en el mismo test de propiedad.
    - Archivo: `tests/unit/test_file_validation.py`
    - **Valida: Requisitos 4.7, 4.8, 9.2, 9.3**

- [ ] 16. Implementar el motor de recuperación RAG y el motor de chat
  - Búsqueda híbrida densa (pgvector cosine) + BM25 (`ts_rank` PostgreSQL) con Reciprocal Rank Fusion y cross-encoder reranking (BGE-reranker-v2-m3).
  - `ContextChatEngine` de LlamaIndex con historial de los últimos 50 intercambios.
  - _Requisitos: 7.1 – 7.10_

  - [ ] 16.1 Implementar el retriever híbrido en `rag/retriever.py`
    - Búsqueda vectorial: `<=>` cosine en pgvector con índice HNSW.
    - Búsqueda BM25: `ts_rank` nativa de PostgreSQL sobre campo de texto.
    - Fusión RRF de las dos listas.
    - Reranking con cross-encoder BGE-reranker-v2-m3 via `sentence-transformers`.
    - Umbral de similitud configurable por proyecto (valor por defecto 0.75 en score RRF normalizado).
    - _Requisitos: 7.2, 7.7, ADR-004_

  - [ ] 16.2 Implementar el motor de chat en `rag/chat_engine.py` y los endpoints de sesión
    - `ContextChatEngine` de LlamaIndex con historial de hasta 50 intercambios por sesión.
    - Incluir lista de `Fuentes_RAG` (nombre de documento + referencia de fragmento) en cada respuesta.
    - Si no hay fragmentos con similitud ≥ umbral: devolver respuesta indicando información insuficiente; registrar en log del sistema.
    - Timeout de 15 segundos: si se excede, cancelar consulta, devolver error al cliente, preservar historial.
    - Endpoints: `POST /projects/{id}/chat-sessions`, `POST /chat-sessions/{id}/messages`, `GET /chat-sessions/{id}/messages`, `PATCH /chat-sessions/{id}/close`.
    - Crear/cerrar sesión en ≤ 3 segundos.
    - _Requisitos: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 16.3 Escribir prueba de propiedad — Propiedad 11: Preservación de fuentes por respuesta RAG
    - **Propiedad 11: Para cualquier mensaje que produzca una respuesta basada en documentación indexada, la lista `rag_sources` contiene al menos un fragmento con nombre de documento y referencia válidos.**
    - Usar Hypothesis con documentos y consultas generados aleatoriamente contra un índice de prueba.
    - Archivo: `tests/integration/test_rag_chat.py`
    - **Valida: Requisito 7.3**

- [ ] 17. Implementar revisión y aprobación de borradores IA (AIReviewModule)
  - Endpoints para listar, editar y aprobar `AiDraft`; conservar `original_content` inmutable.
  - _Requisitos: 8.1 – 8.6_

  - [ ] 17.1 Implementar endpoints de gestión de borradores IA en el backend
    - Endpoints: `GET /projects/{id}/ai-drafts`, `GET /ai-drafts/{id}`, `PATCH /ai-drafts/{id}` (edición), `PATCH /ai-drafts/{id}/approve`.
    - Al editar: persistir en `edited_content`; `original_content` permanece intacto.
    - Al aprobar: cambiar estado a `Aprobado`, registrar aprobador y marca de tiempo; bloquear modificaciones posteriores.
    - Solo `Líder_QA` puede editar y aprobar; prohibir incorporación automática a artefactos formales sin aprobación.
    - Registrar en `audit_log` cada generación, edición y aprobación.
    - _Requisitos: 8.1, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 17.2 Escribir prueba de propiedad — Propiedad 12: Preservación del contenido original de borradores IA
    - **Propiedad 12: Para cualquier borrador editado N veces, `original_content` permanece idéntico al contenido generado por el Motor RAG, independientemente del número de ediciones aplicadas a `edited_content`.**
    - Usar Hypothesis para generar secuencias de N ediciones y verificar invarianza de `original_content`.
    - Archivo: `tests/integration/test_rag_chat.py`
    - **Valida: Requisito 8.3**

  - [ ] 17.3 Implementar vistas de revisión de borradores IA en el frontend (AIReviewModule)
    - Crear `pages/AIReviewPage.tsx` con lista de borradores pendientes diferenciados visualmente.
    - Componente de edición side-by-side (original generado por IA vs. contenido editado).
    - Botón de aprobación con confirmación explícita.
    - _Requisitos: 8.2, 8.3, 8.4, 8.5_

- [ ] 18. Implementar la generación documental con plantillas versionadas (DocumentModule)
  - CRUD de `DocTemplate`; generación, aprobación y descarga de `VersionedDocument`.
  - _Requisitos: 6.1 – 6.6_

  - [ ] 18.1 Implementar CRUD de plantillas y generación de documentos versionados en el backend
    - Endpoints: `GET /doc-templates`, `POST /doc-templates`, `PATCH /doc-templates/{id}/status`.
    - `POST /projects/{id}/documents`: combinar plantilla activa con datos del proyecto; persistir con versión autoincremental, estado `Borrador`.
    - Si la plantilla está `Obsoleta`: rechazar con HTTP 422 indicando la versión activa disponible.
    - Mantener historial completo de versiones; endpoint `GET /documents/{id}` devuelve historial.
    - `PATCH /documents/{id}/approve`: cambiar a `Aprobado`, registrar aprobador y timestamp, bloquear modificaciones.
    - `GET /documents/{id}/download`: generar y devolver el documento (Markdown/HTML o `.docx`).
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 18.2 Implementar vistas de documentos en el frontend (DocumentModule)
    - Crear `pages/DocumentsPage.tsx` con lista de documentos, selector de plantilla, botones de generar, aprobar y descargar.
    - _Requisitos: 6.2, 6.3_

- [ ] 19. Implementar las vistas de chat RAG en el frontend (ChatModule) e ingesta (IngestModule)
  - Sesión de chat en tiempo real con visualización de fuentes RAG.
  - Panel de carga de documentos con polling de estado de tarea Celery.
  - _Requisitos: 7.1 – 7.10, 9.1 – 9.8_

  - [ ] 19.1 Implementar la vista de sesión de chat y visualización de fuentes (ChatModule)
    - Crear `pages/ChatPage.tsx` con hilo de mensajes, input de texto, indicador de carga y lista de `Fuentes_RAG` visible por defecto debajo de cada respuesta.
    - Mostrar mensaje de error descriptivo si el Motor RAG no responde en 15 s (sin limpiar el historial).
    - _Requisitos: 7.2, 7.3, 7.4, 7.9, 7.10_

  - [ ] 19.2 Implementar la vista de ingesta documental con polling de estado (IngestModule)
    - Crear `pages/IngestPage.tsx` con formulario de carga de archivos (drag & drop), lista de documentos indexados por proyecto y badge de estado (Procesando / Indexado / Error_Ingesta).
    - Polling cada 3 segundos al endpoint de estado de tarea durante máximo 5 minutos.
    - _Requisitos: 9.1, 9.6, 9.7_

- [ ] 20. Punto de control Fase 3 — Asegurarse de que todos los tests pasan antes de la Fase 4
  - Ejecutar `pytest tests/unit tests/integration --cov=app` y verificar cobertura.
  - Verificar que el pipeline de ingesta y recuperación RAG funciona con documentos de prueba.
  - Preguntar al usuario si hay ajustes antes de continuar.

---

### Fase 4 — QA/QaS, Certificaciones y Defectos

- [ ] 21. Implementar la ejecución de casos de prueba, evidencias y defectos en el backend (QAModule)
  - Endpoints completos para ciclo de vida de casos de prueba, ejecuciones, evidencias y defectos.
  - _Requisitos: 4.1 – 4.13_

  - [ ] 21.1 Implementar CRUD de casos de prueba y cambio de estado
    - Endpoints: `POST /stories/{id}/test-cases`, `GET /stories/{id}/test-cases`, `PUT /test-cases/{id}`, `PATCH /test-cases/{id}/status`.
    - Validar que la `Historia_Usuario` existe (422 si no); campo `steps` máximo 100 elementos.
    - Rechazar ejecución si el caso está en estado `Borrador` u `Obsoleto`.
    - _Requisitos: 4.1, 4.2, 4.4_

  - [ ] 21.2 Implementar registro de ejecuciones y adjunto de evidencias
    - Endpoint `POST /test-cases/{id}/executions`: persistir resultado, comentarios, `executed_at` UTC.
    - Endpoint `POST /executions/{id}/evidences`: multipart upload; validar MIME y tamaño (≤ 20 MB); almacenar en repositorio de archivos; registrar en BD.
    - Rechazar carga si la ejecución no existe (404) o el MIME/tamaño no es válido (422).
    - _Requisitos: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 21.3 Implementar registro de defectos y cambio de estado
    - Endpoint `POST /executions/{id}/defects`: solo si `result = "Fallido"`; rechazar con 422 si no.
    - Endpoint `PATCH /defects/{id}/status`: registrar en `audit_log` cada cambio de estado.
    - _Requisitos: 4.9, 4.10, 4.13_

- [ ] 22. Implementar ciclos QaS y generación de certificaciones
  - Cálculo de porcentajes de cobertura y aprobación según fórmulas del Req. 4.11.
  - _Requisitos: 4.11, 4.12_

  - [ ] 22.1 Implementar ciclos QaS y cálculo de métricas de certificación
    - Endpoint `POST /projects/{id}/qas-cycles`: crear ciclo con nombre, fechas.
    - Endpoint `POST /qas-cycles/{id}/certifications`: calcular `coverage_pct` y `approval_pct` con 2 decimales; persistir `VersionedDocument` con versión autoincremental.
    - Rechazar si el ciclo no existe (404).
    - _Requisitos: 4.11, 4.12_

  - [ ]* 22.2 Escribir prueba de propiedad — Propiedad 6: Cálculo de cobertura y aprobación de certificación QaS
    - **Propiedad 6: Para cualquier ciclo QaS con N casos y E ejecuciones, los porcentajes de cobertura y aprobación calculados son exactamente iguales a las fórmulas del Req. 4.11 con 2 decimales, para todo N ≥ 1 y E ≥ 0.**
    - Usar el ejemplo de `test_certification_metrics_formula` del diseño como base.
    - Archivo: `tests/unit/test_certifications.py`
    - **Valida: Requisito 4.11**

- [ ] 23. Implementar las vistas QA en el frontend (QAModule)
  - Pantallas para gestión de casos de prueba, registro de ejecuciones, carga de evidencias y defectos.
  - _Requisitos: 4.1 – 4.13_

  - [ ] 23.1 Implementar vistas de casos de prueba y ejecuciones
    - Crear `pages/TestCasesPage.tsx`, `pages/ExecutionPage.tsx`.
    - Formulario de caso de prueba con campo de pasos dinámico (hasta 100) y selector de historia de usuario.
    - Formulario de ejecución con selector de resultado y área de comentarios.
    - _Requisitos: 4.1, 4.3_

  - [ ] 23.2 Implementar vistas de evidencias, defectos y certificaciones
    - Componente de upload de evidencias con validación de tipo MIME en cliente.
    - Formulario de registro de defecto (habilitado solo si resultado es `Fallido`).
    - Vista de certificación con porcentajes de cobertura y aprobación.
    - _Requisitos: 4.5, 4.9, 4.11_

- [ ] 24. Implementar la integración con Jira
  - Sincronización de defectos con Jira; almacenamiento cifrado de credenciales.
  - _Requisitos: 14.1 – 14.5_

  - [ ] 24.1 Implementar configuración de Jira y sincronización de defectos en el backend
    - Endpoint `POST /projects/{id}/jira-config`: cifrar credenciales con `Fernet` usando `JIRA_ENCRYPTION_KEY`; persistir cifradas.
    - Endpoint `POST /defects/{id}/sync-jira`: enviar título, descripción, severidad e ID del defecto a Jira; registrar `jira_issue_key` y fecha de sincronización en el defecto.
    - Si falla: registrar en `audit_log`, devolver mensaje descriptivo al cliente sin interrumpir operaciones locales.
    - Endpoint `PATCH /defects/{id}/sync-jira`: ofrecer actualización de estado en Jira.
    - _Requisitos: 14.1, 14.2, 14.3, 14.4, 14.5, ADR-007_

- [ ] 25. Punto de control Fase 4 — Asegurarse de que todos los tests pasan antes de la Fase 5
  - Ejecutar suite completa de tests del backend; verificar que las propiedades 6 y 9 pasan.
  - Preguntar al usuario si hay ajustes antes de continuar.

---

### Fase 5 — Sesiones UAT, Auditoría y Piloto

- [ ] 26. Implementar sesiones UAT en el backend y frontend (UATModule)
  - Creación, gestión de invitados, registro de resultados y resumen con métricas.
  - _Requisitos: 5.1 – 5.7_

  - [ ] 26.1 Implementar endpoints de sesiones UAT en el backend
    - Endpoint `POST /projects/{id}/uat-sessions`: validar que `fecha_fin > fecha_inicio`, lista de testers no vacía, al menos un caso/historia asociada; persistir con estado `Abierta`.
    - Endpoint `POST /uat-sessions/{id}/results`: solo testers invitados (403 si no); solo si estado `Abierta` (409 si `Cerrada`).
    - Cierre automático al alcanzar `fecha_fin`: cambiar estado a `Cerrada`; registrar en `audit_log`.
    - Endpoint `GET /uat-sessions/{id}/summary`: calcular porcentaje de participación y de aprobados redondeados a 2 decimales; listar observaciones.
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 26.2 Escribir prueba de propiedad — Propiedad 7: Cálculo de métricas de sesión UAT
    - **Propiedad 7: Para cualquier sesión UAT con T testers invitados y R resultados (R ≤ T), el porcentaje de participación y el de aprobados devueltos por `/summary` coinciden con las fórmulas del Req. 5.7 redondeadas a 2 decimales, para todo T ≥ 1 y R ≥ 0.**
    - Archivo: `tests/unit/test_uat_metrics.py`
    - **Valida: Requisito 5.7**

  - [ ] 26.3 Implementar vistas de sesiones UAT en el frontend (UATModule)
    - Crear `pages/UATSessionsPage.tsx` con lista de sesiones, formulario de creación con selector de testers y cobertura de casos/historias.
    - Vista de detalle con formulario de registro de resultado para UAT_Tester.
    - Vista de resumen con porcentajes y lista de observaciones para Líder_QA.
    - _Requisitos: 5.1, 5.3, 5.7_

- [ ] 27. Implementar el módulo de auditoría en el frontend (AuditModule)
  - Vista de consulta del registro de auditoría con filtros y paginación.
  - Solo accesible para Administrador.
  - _Requisitos: 11.1 – 11.6_

  - [ ] 27.1 Implementar endpoint de consulta del registro de auditoría con filtros y paginación
    - Endpoint `GET /audit-log` (solo Administrador): filtros por rango de fechas, tipo de operación, ID de usuario, tipo de entidad.
    - Paginación: hasta 100 registros por página; ordenado por `timestamp_utc DESC` por defecto.
    - Tiempo de respuesta ≤ 5 segundos para rangos de hasta 90 días.
    - _Requisitos: 11.4, 11.5, 11.6_

  - [ ] 27.2 Implementar la vista de auditoría en el frontend
    - Crear `pages/admin/AuditLogPage.tsx` con tabla paginada, filtros de fecha/operación/usuario/entidad.
    - _Requisitos: 11.4, 11.5_

- [ ] 28. Implementar pruebas de integración y E2E con Playwright
  - Flujos completos de extremo a extremo: autenticación → proyecto → caso de prueba → certificación.
  - _Requisitos: 1.1, 3.1, 4.3, 4.11, 7.1, RNF-01_

  - [ ] 28.1 Implementar suite de pruebas de integración del backend
    - Crear pruebas de integración en `tests/integration/`: `test_auth_flow.py`, `test_project_lifecycle.py`, `test_qa_execution_flow.py`, `test_uat_session_flow.py`, `test_document_generation.py`, `test_audit_log.py`.
    - Usar `conftest.py` con fixtures: `TestClient`, BD PostgreSQL de prueba en Docker, mocks de LLM.
    - _Requisitos: 1.1, 3.1, 4.3, 5.1, 6.2, 11.1_

  - [ ] 28.2 Implementar suite de pruebas E2E con Playwright
    - Crear escenarios en `frontend/tests/e2e/`: flujo completo autenticación → creación de proyecto → ejecución de caso de prueba → generación de certificación.
    - Configurar Playwright para ejecutar contra el backend de pruebas con datos semilla.
    - _Requisitos: 1.1, 3.1, 4.11, 7.1_

- [ ] 29. Configurar CI/CD con GitHub Actions
  - Pipeline de CI: tests unitarios backend + frontend, tests de integración, pruebas E2E en rama `main`.
  - _Requisitos: RNF-02.1, RNF-03.1_

  - [ ] 29.1 Configurar pipeline CI/CD en `.github/workflows/ci.yml`
    - Job `backend-tests`: `pytest tests/unit tests/integration --cov=app --cov-report=xml`; base de datos Hypothesis persistida entre runs.
    - Job `frontend-tests`: `vitest run --coverage`.
    - Job `e2e`: `playwright test` (solo en `main` y PRs a `main`).
    - _Requisitos: RNF-02.1, RNF-03.1_

- [ ] 30. Punto de control Fase 5 — Asegurarse de que todos los tests pasan antes de la Fase 6
  - Ejecutar la suite completa de pruebas (unitarias, integración, E2E) y verificar cobertura objetivo.
  - Verificar que el pipeline CI/CD pasa sin errores.
  - Preguntar al usuario si hay ajustes antes de continuar.

---

### Fase 6 — Evolución: OpenAPI, Stateless y Configuración de Producción

- [ ] 31. Exponer documentación OpenAPI 3.0 y validar arquitectura stateless
  - Habilitar Swagger UI en ruta dedicada; verificar que el backend no depende del entorno Tauri.
  - _Requisitos: 15.1, 15.2, 15.3, 15.4_

  - [ ] 31.1 Habilitar OpenAPI 3.0 y Swagger UI en el backend
    - Configurar FastAPI para exponer `GET /docs` (Swagger UI) y `GET /openapi.json`.
    - Revisar que todos los endpoints tienen esquemas Pydantic completos de Request y Response.
    - Verificar que el backend no contiene ninguna dependencia del entorno de escritorio Tauri.
    - _Requisitos: 15.2, 15.3_

  - [ ] 31.2 Validar arquitectura stateless del backend
    - Verificar que el estado de sesión se gestiona exclusivamente mediante JWT (sin sesiones en memoria del servidor).
    - Ejecutar los tests de integración con múltiples instancias del backend para confirmar que no hay estado compartido en proceso.
    - _Requisito: 15.4_

- [ ] 32. Revisar configuración de producción, seguridad final y documentación operativa
  - Revisar variables de entorno, certificados TLS, CORS, índices pgvector y configuración de Celery workers.
  - _Requisitos: 13.1 – 13.8, RNF-01, RNF-02, RNF-03, RNF-04_

  - [ ] 32.1 Revisar y endurecer la configuración de seguridad para producción
    - Verificar CORS con lista explícita de orígenes (sin comodín) en producción.
    - Verificar TLS 1.2+ en el backend; HSTS con `max-age=31536000; includeSubDomains`.
    - Configurar `pool_size=10`, `max_overflow=20` en SQLAlchemy async engine.
    - Crear índices pgvector `HNSW` via Alembic con `CREATE INDEX CONCURRENTLY`.
    - Configurar mínimo 2 Celery workers con colas separadas `ingest` y `export`.
    - _Requisitos: 13.1, 13.2, 13.4, 13.5, RNF-01, RNF-04_

  - [ ] 32.2 Verificar que el ejecutable Tauri cumple todos los requisitos corporativos de distribución
    - Confirmar que el instalador es compatible con SCCM / Intune para despliegue corporativo.
    - Confirmar ausencia de dependencias del runtime .NET en el ejecutable final.
    - _Requisitos: 12.1, 12.2, RNF-04.1, RNF-04.2_

- [ ] 33. Punto de control final — Validación integral del sistema
  - Ejecutar suite completa de pruebas: unitarias (Pytest + Hypothesis + Vitest + fast-check), integración y E2E (Playwright).
  - Verificar que las 12 propiedades de corrección pasan en sus respectivos tests de propiedad.
  - Verificar cobertura: backend services ≥ 90 %, backend routers ≥ 85 %, frontend componentes ≥ 80 %, frontend services ≥ 85 %.
  - Preguntar al usuario antes de declarar el sistema listo para producción.

---

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para entregas MVP más rápidas; todas las demás son obligatorias.
- Cada tarea referencia los requisitos específicos que implementa para garantizar trazabilidad completa.
- Los puntos de control intermedios (`2`, `7`, `14`, `20`, `25`, `30`, `33`) no están incluidos en el grafo de dependencias ya que son barreras de coordinación con el equipo, no tareas de codificación.
- Los tests de propiedad (sub-tareas PBT marcadas con `*`) deben ejecutarse con `hypothesis` database persistida entre runs para reproducibilidad (`--hypothesis-seed=0` en CI).
- Las propiedades 1, 2 y 3 pueden compartir el mismo archivo `tests/unit/test_security.py`; las propiedades 4 y 12 comparten `tests/unit/test_rbac.py` y `tests/integration/test_rag_chat.py` respectivamente.
- Los índices pgvector `HNSW` se crean con `CREATE INDEX CONCURRENTLY` para no bloquear la tabla durante la migración.

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.3", "1.4"]
    },
    {
      "id": 2,
      "tasks": ["1.5"]
    },
    {
      "id": 3,
      "tasks": ["3.1", "3.2", "3.3", "3.4"]
    },
    {
      "id": 4,
      "tasks": ["3.5"]
    },
    {
      "id": 5,
      "tasks": ["3.6", "4.1", "5.1", "5.2"]
    },
    {
      "id": 6,
      "tasks": ["4.2", "4.3", "4.4", "6.1"]
    },
    {
      "id": 7,
      "tasks": ["4.5", "4.6", "6.2"]
    },
    {
      "id": 8,
      "tasks": ["4.7", "6.3"]
    },
    {
      "id": 9,
      "tasks": ["8.1", "8.2", "11.1", "11.2"]
    },
    {
      "id": 10,
      "tasks": ["9.1", "9.2", "11.3", "11.4", "12.1"]
    },
    {
      "id": 11,
      "tasks": ["10.1", "11.5"]
    },
    {
      "id": 12,
      "tasks": ["10.2"]
    },
    {
      "id": 13,
      "tasks": ["13.1", "15.1"]
    },
    {
      "id": 14,
      "tasks": ["15.2"]
    },
    {
      "id": 15,
      "tasks": ["15.3", "15.4"]
    },
    {
      "id": 16,
      "tasks": ["16.1"]
    },
    {
      "id": 17,
      "tasks": ["16.2"]
    },
    {
      "id": 18,
      "tasks": ["16.3", "17.1", "18.1"]
    },
    {
      "id": 19,
      "tasks": ["17.2", "17.3", "18.2", "19.1", "19.2"]
    },
    {
      "id": 20,
      "tasks": ["21.1", "22.1"]
    },
    {
      "id": 21,
      "tasks": ["21.2", "21.3", "22.2"]
    },
    {
      "id": 22,
      "tasks": ["23.1", "24.1"]
    },
    {
      "id": 23,
      "tasks": ["23.2"]
    },
    {
      "id": 24,
      "tasks": ["26.1"]
    },
    {
      "id": 25,
      "tasks": ["26.2", "26.3", "27.1"]
    },
    {
      "id": 26,
      "tasks": ["27.2", "28.1"]
    },
    {
      "id": 27,
      "tasks": ["28.2", "29.1"]
    },
    {
      "id": 28,
      "tasks": ["31.1", "31.2", "32.1", "32.2"]
    }
  ]
}
```
