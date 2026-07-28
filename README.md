# Job Portal — Phase 1

Job distribution and resume collection portal. Employers post jobs; job seekers apply directly; agencies bulk-upload candidate resumes per job.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind |
| Backend | FastAPI, SQLAlchemy 2 async, Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT + optional Google/LinkedIn OAuth |

## Local setup

**Prerequisites:** Docker Desktop, Python 3.12, Node.js 18+

```bash
cd job-portal
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

Start dev servers:

```bash
# Terminal 1 — Backend (port 8002)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8002

# Terminal 2 — Frontend (port 5175)
cd frontend && npm install && npm run dev
```

Open http://localhost:5175

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@demo.jobs | admin1234 | Admin |
| recruiter@demo.jobs | admin1234 | Employer recruiter |
| agency@demo.jobs | admin1234 | Agency |
| seeker@demo.jobs | admin1234 | Job seeker |

## Cloud deployment

**Full step-by-step guide:** see **[DEPLOY.md](./DEPLOY.md)** (Neon + Render + Vercel, then GoDaddy custom domain).

Quick stack:
- **Database:** Neon PostgreSQL
- **Backend:** Render (Docker, `backend/Dockerfile`)
- **Frontend:** Vercel (`frontend/`, set `VITE_API_URL`)

Resume files use local disk on the API server; on free Render they may reset on redeploy — see DEPLOY.md for persistent storage options.

## OAuth setup

**Google:** [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client → redirect URI: `http://localhost:5175/oauth/callback?provider=google`

**LinkedIn:** [LinkedIn Developer Portal](https://www.linkedin.com/developers/) → redirect URI: `http://localhost:5175/oauth/callback?provider=linkedin`

Set credentials in `backend/.env`.

## API docs

http://localhost:8002/docs

## Phase 1 features

- Email/password registration (recruiter, agency, job seeker)
- Google + LinkedIn OAuth (when configured)
- Employer job posting (draft / publish / close)
- Public job board and job detail pages
- Direct candidate apply with resume
- Agency bulk resume upload (up to 20 files per batch)
- Recruiter applications inbox with status pipeline
- Role-specific dashboards
