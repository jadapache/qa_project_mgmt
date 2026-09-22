# PMQA Copilot

> Local AI-powered Command Center for Product Managers & QA Engineers with grounded RAG, encrypted storage, and pluggable issue tracker integrations.

---

## Quick Start (< 5 min)

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.10+ (tested on Python 3.11 – 3.14)

### 1. Clone & Environment Setup
```bash
cp .env.example .env
```
*(Optional: Configure your AI Provider keys or Jira credentials in `.env`, or configure them directly in the UI settings).*

### 2. Run with Root Scripts
```bash
# Terminal 1 - Backend (FastAPI on http://127.0.0.1:8000)
npm run dev:backend

# Terminal 2 - Frontend (Vite on http://localhost:5173)
npm run dev:frontend
```

### 3. Manual Start (Alternative)
```bash
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows (or source .venv/bin/activate on Unix)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, React Router v7 |
| **Backend** | Python, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| **AI & RAG** | Multi-provider AI Runner (Ollama, OpenAI, Anthropic), BM25 local retrieval, `pypdf`, `python-docx` |
| **Storage & Security** | Local encrypted credential store (`local/connections/`) using Fernet cryptography & OS `keyring` (no external database required) |
| **Integrations** | Pluggable adapters for Jira (OAuth 2.0 3LO & PAT), GitHub (PAT), and GitLab (PAT) |

---

## Project Structure

```
qa_project_mgmt/
├── backend/                  # FastAPI application & AI services
│   ├── app/
│   │   ├── ai/              # Multi-provider AI runner, prompt logging & templates
│   │   ├── api/             # REST endpoints (/health, /settings, /integrations, /features, /knowledge)
│   │   ├── context/         # Document parsers (PDF, Word, Markdown) & BM25 search
│   │   ├── core/            # Settings, Fernet encryption & encrypted credential storage
│   │   ├── features/        # Business logic for Standup, PRD, Impact & QA
│   │   └── integrations/    # Jira (OAuth 3LO + PAT), GitHub (PAT), GitLab adapters
│   └── requirements.txt     # Python dependencies
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── api/             # Typed API client
│   │   ├── components/      # UI components, layout, connection modals
│   │   ├── pages/           # Dashboard, Standup, PRD, Impact, QA, Knowledge, Settings
│   │   └── App.tsx          # Application routing
│   └── package.json         # Frontend dependencies & scripts
├── local/                    # Local runtime storage (gitignored secrets & data)
│   ├── connections/         # Encrypted API tokens and OAuth credentials (.enc)
│   ├── settings/            # Local user preferences (app.json)
│   ├── knowledge/           # Uploaded documents and RAG indices
│   └── ai/                  # AI execution logs and prompt overrides
├── _legacy_archive/          # Archived historical monolithic code & legacy specs
├── package.json              # Root coordination scripts (dev:backend, dev:frontend)
├── DEPLOY.md                 # Production deployment guide (Docker, Render, Railway)
└── Dockerfile                # Production container (multi-stage build)
```

---

## Key Features

### 1. Command Center Dashboard
- Instant visual status of all external tool connections (Jira, GitHub, GitLab).
- Quick actions for daily workflows and recent activity tracking.

### 2. PM Tools
- **Daily Standup Generator**: Aggregates open issues, recent work, and blockers to draft clean, customizable daily standup updates.
- **PRD Checker**: Audits Product Requirement Documents for completeness, edge cases, acceptance criteria, and ambiguity.
- **Change Impact Analysis**: Traces the ripple effects of proposed requirement changes on technical architecture and test suites.

### 3. QA Tools
- **QaFeature Hub**: Specialized workbench covering Regression testing plans, API QA checklists, Test Matrix generation, and Bug Triage workflows.

### 4. Grounded Knowledge Base (Local RAG)
- Upload documents in **PDF**, **DOCX**, **Markdown**, or **TXT** format.
- In-memory chunking and high-performance **BM25 rank search** without external vector database dependencies.
- **Ask My Product**: Chat interface grounded strictly on your uploaded documentation, avoiding hallucinations and citing source chunks.

### 5. Pluggable Integrations
- **Jira**: Full Atlassian 3-legged OAuth (3LO) or Personal Access Token (PAT) fallback. Browse projects and inspect issues directly.
- **GitHub**: Secure PAT authentication with repository selection and issue browsing.
- **GitLab**: PAT authentication with project inspection.

### 6. Flexible AI Provider Engine
- Works with local models via **Ollama** (e.g. `llama3`, `mistral`, `qwen`) for complete offline privacy.
- Supports cloud providers (**OpenAI**, **Anthropic**) via API keys configured in the UI or `.env`.
- System prompts and evaluation rubrics can be customized live in `local/ai/prompts/`.

---

## Configuration & Environment Variables

Copy `.env.example` to `.env`. All credentials can also be set or overridden via the **Settings** and **Integrations** screens in the web UI.

```bash
# Server & CORS
PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Security & Encryption (Optional override; machine keyring is used by default)
PMQA_SECRET_KEY=

# Default AI Provider (ollama, openai, anthropic)
PMQA_AI_PROVIDER=ollama
PMQA_AI_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434

# Cloud AI Keys (optional if using Ollama)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Jira OAuth 2.0 (Atlassian 3LO)
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=http://127.0.0.1:8000/api/integrations/jira/callback
```

---

## Jira OAuth Setup (Atlassian 3LO)

1. Open the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and create an app.
2. Add an **OAuth 2.0 (3LO)** authorization grant.
3. Set the callback URL to:
   ```
   http://127.0.0.1:8000/api/integrations/jira/callback
   ```
4. Under **Permissions**, add Jira API permissions:
   - `read:jira-work` (View Jira issue data)
   - `read:jira-user` (View user profiles)
5. Copy your **Client ID** and **Client Secret** into `.env` (or input them directly in the UI).
6. In the app: navigate to **Integrations → Jira → Connect → OAuth**.
7. *Fast local alternative*: Use a **Personal Access Token** (Email + Site URL + API Token from id.atlassian.com) for 30-second setup.

---

## Local Security & Storage Model

- **No Remote Database**: There is no remote Postgres/MySQL or SQLite database file that can lock or corrupt.
- **Encrypted Secrets**: Sensitive tokens (Jira OAuth refresh tokens, GitHub PATs, API keys) are stored under `local/connections/*.enc` encrypted via Fernet.
- **Key Hierarchy**: Keys are derived first from the host OS keychain (`keyring`), falling back to machine hardware derivation or `PMQA_SECRET_KEY`.
- **Clean Disconnect**: Disconnecting any service in the UI permanently removes the corresponding `.enc` file from the disk.

---

## Production Deployment

This application includes a unified multi-stage [`Dockerfile`](./Dockerfile) that builds the React frontend and serves it directly as static files from FastAPI.

See **[DEPLOY.md](./DEPLOY.md)** for one-click deployment instructions on **Render**, **Railway**, or any standard container platform.
