# Deploy PMQA Copilot (full live app)

This app is **React + FastAPI (Python)**. It does **not** run as a normal PHP site on shared cPanel.

Use **Railway**, **Render**, or a **VPS**. Cloning into cPanel Git alone will not start the API.

## Recommended: Railway (simplest)

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project → Deploy from GitHub repo** → select `arsemadd/pmqa-copilot`.
3. Railway detects the `Dockerfile` and builds the full app (frontend + backend in one service).
4. After deploy, open the public HTTPS URL Railway gives you (e.g. `https://pmqa-copilot-production.up.railway.app`).

### Environment variables (Railway → Variables)

Set these to your **live URL** (replace with your real Railway domain):

```
PMQA_FRONTEND_URL=https://YOUR-APP.up.railway.app
PMQA_BACKEND_URL=https://YOUR-APP.up.railway.app
PMQA_SECRET_KEY=pick-a-long-random-string
```

For AI on the live server (Ollama will not be available in the cloud by default):

```
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

Or:

```
AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-haiku-latest
ANTHROPIC_API_KEY=sk-ant-...
```

### Jira / GitHub OAuth on live

Update redirect URIs in the provider consoles to match the live host, e.g.:

```
https://YOUR-APP.up.railway.app/api/integrations/jira/callback
https://YOUR-APP.up.railway.app/api/integrations/github/callback
https://YOUR-APP.up.railway.app/api/integrations/gitlab/callback
```

Also set:

```
JIRA_REDIRECT_URI=https://YOUR-APP.up.railway.app/api/integrations/jira/callback
GITHUB_REDIRECT_URI=https://YOUR-APP.up.railway.app/api/integrations/github/callback
GITLAB_REDIRECT_URI=https://YOUR-APP.up.railway.app/api/integrations/gitlab/callback
```

### Persist uploads & credentials (important)

Railway ephemeral disks lose `local/` data on redeploy unless you add a **volume** mounted at `/app/local`.

Without a volume: reconnect integrations and re-upload docs after each redeploy.

## Alternative: Render

1. [render.com](https://render.com) → New → Blueprint → connect `arsemadd/pmqa-copilot` (uses `render.yaml`),  
   **or** New Web Service → Docker → same repo.
2. Set the same env vars as above, using your `onrender.com` URL.
3. Health check path: `/api/health`.

## What about pixelwel / cPanel?

| Goal | Works on shared cPanel? |
| --- | --- |
| Full PMQA Copilot (API + AI + integrations) | **No** — needs a long-running Python process |
| Static HTML showcase only | Yes (upload a single `.html` file) |
| MySQL database | **Not required** for this app |

Keep using cPanel for WordPress / PHP sites. Put PMQA Copilot on Railway/Render.

## Local production smoke test

```bash
cd frontend
npm ci
npm run build

cd ../backend
.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000 — the React UI is served by FastAPI from `frontend/dist`.

## GitHub repo

https://github.com/arsemadd/pmqa-copilot
