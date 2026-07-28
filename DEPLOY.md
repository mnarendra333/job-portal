# Job Portal — Cloud Deployment Guide

Deploy the app in this order. You will get **two free URLs** first (frontend + API). After everything works, point your GoDaddy domain at them.

| Service | Provider | Free URL example |
|---------|----------|------------------|
| Database | [Neon](https://neon.tech) | (connection string only) |
| Backend API | [Render](https://render.com) | `https://job-portal-api.onrender.com` |
| Frontend | [Vercel](https://vercel.com) | `https://job-portal-xyz.vercel.app` |

**Alternative:** Railway instead of Render for backend — same env vars, use Dockerfile in `backend/`.

---

## Before you start

1. Create accounts (all have free tiers):
   - [GitHub](https://github.com)
   - [Neon](https://neon.tech)
   - [Render](https://render.com)
   - [Vercel](https://vercel.com)

2. Push this project to GitHub:

```bash
cd job-portal
git init
git add .
git commit -m "Initial job portal"
# Create empty repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/job-portal.git
git branch -M main
git push -u origin main
```

---

## Step 1 — PostgreSQL on Neon

1. Log in to [Neon](https://console.neon.tech) → **New Project** → name it `job-portal`.
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. Open **SQL Editor** → paste and run the full file:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
4. Confirm tables exist (users, jobs, resumes, etc.).

**Keep the connection string** — you need it for Render and for seeding.

---

## Step 2 — Seed demo data (one time)

From your laptop (with Python 3.12):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING"
# App auto-converts to postgresql+asyncpg://

PYTHONPATH=. python scripts/seed_demo.py --reset
```

You should see demo users and jobs created. Demo logins:

| Email | Password |
|-------|----------|
| seeker@demo.jobs | admin1234 |
| recruiter@demo.jobs | admin1234 |
| agency@demo.jobs | admin1234 |

---

## Step 3 — Backend on Render

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your **GitHub** repo `job-portal`.
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | `job-portal-api` |
   | Root Directory | `backend` |
   | Runtime | **Docker** |
   | Instance type | Free (or paid for always-on) |
4. **Environment variables** (Environment tab):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `SECRET_KEY` | Random 64+ chars ([generate](https://generate-secret.vercel.app/64)) |
   | `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` *(update after Step 4)* |
   | `UPLOAD_DIR` | `uploads` |
   | `ENVIRONMENT` | `production` |
   | `GOOGLE_CLIENT_ID` | *(optional, Step 6)* |
   | `GOOGLE_CLIENT_SECRET` | *(optional)* |
   | `LINKEDIN_CLIENT_ID` | *(optional)* |
   | `LINKEDIN_CLIENT_SECRET` | *(optional)* |

5. **Create Web Service** → wait for deploy (~5–10 min first time).
6. Test: open `https://YOUR-SERVICE.onrender.com/health` → should show `{"status":"ok"}`.
7. API docs: `https://YOUR-SERVICE.onrender.com/docs`

**Note:** Free Render sleeps after ~15 min idle; first request may take 30–60 seconds.

**Resume uploads on free tier:** Files live on the container disk and **may be lost on redeploy**. For production resume storage, add a Render persistent disk (paid) or S3/R2 later.

---

## Step 4 — Frontend on Vercel

1. [Vercel Dashboard](https://vercel.com/new) → Import Git repo `job-portal`.
2. Settings:
   | Field | Value |
   |-------|-------|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
3. **Environment variable** (required at build time):

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com/api/v1` |

4. Deploy → copy your URL, e.g. `https://job-portal-abc.vercel.app`.

---

## Step 5 — Connect frontend ↔ backend

1. **Render** → your web service → **Environment** → set:
   ```
   CORS_ORIGINS=https://job-portal-abc.vercel.app
   ```
   (Use your real Vercel URL; no trailing slash.)

2. **Manual Deploy** on Render (or wait for auto-redeploy).

3. **End-to-end test:**
   - Open Vercel URL → home page loads
   - **Browse Jobs** → jobs from seed data appear
   - **Sign in** as `seeker@demo.jobs` / `admin1234`
   - Apply to a job (upload resume)
   - Sign in as `recruiter@demo.jobs` → check Applications inbox

If jobs don’t load: check browser DevTools → Network → API calls failing → verify `VITE_API_URL` and CORS.

---

## Step 6 — OAuth (optional, after URLs work)

Update redirect URIs in provider consoles to use your **Vercel URL**:

**Google Cloud Console** → OAuth client → Authorized redirect URIs:
```
https://job-portal-abc.vercel.app/oauth/callback?provider=google
```

**LinkedIn Developer Portal** → Redirect URLs:
```
https://job-portal-abc.vercel.app/oauth/callback?provider=linkedin
```

Also add **Authorized JavaScript origins** (Google):
```
https://job-portal-abc.vercel.app
```

Put client IDs/secrets in Render env vars and redeploy.

---

## Step 7 — Custom domain (GoDaddy → Vercel + Render)

Do this **only after** the free URLs work end-to-end.

### Frontend (e.g. `www.yourdomain.com` or `app.yourdomain.com`)

1. **Vercel** → Project → **Settings** → **Domains** → Add `app.yourdomain.com`.
2. Vercel shows DNS records (usually `CNAME` → `cname.vercel-dns.com`).
3. **GoDaddy** → DNS → add that CNAME for subdomain `app`.
4. Wait for SSL (automatic on Vercel, ~minutes to hours).

### Backend API (e.g. `api.yourdomain.com`)

1. **Render** → Service → **Settings** → **Custom Domains** → Add `api.yourdomain.com`.
2. Render shows a **CNAME** target (e.g. `job-portal-api.onrender.com`).
3. **GoDaddy** → DNS → CNAME `api` → Render target.
4. Update env vars and redeploy:
   - Render: `CORS_ORIGINS=https://app.yourdomain.com`
   - Vercel: `VITE_API_URL=https://api.yourdomain.com/api/v1` → **Redeploy** frontend (build-time var).
5. Update OAuth redirect URIs to use `https://app.yourdomain.com/oauth/callback?provider=...`

### GoDaddy apex domain (`yourdomain.com`)

- Easiest: forward `yourdomain.com` → `https://app.yourdomain.com` in GoDaddy forwarding.
- Or use Vercel’s apex A records if you move DNS to Vercel nameservers.

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | `CORS_ORIGINS` must exactly match frontend URL (https, no trailing `/`) |
| API 502 / timeout | Free Render waking up — retry after 60s |
| Empty job list | Re-run seed script against Neon; check `DATABASE_URL` on Render |
| OAuth redirect mismatch | Redirect URI in Google/LinkedIn must match Vercel URL exactly |
| Resume gone after deploy | Expected on free Render — add persistent disk or S3 |

---

## Cost summary (starting out)

| Service | Free tier |
|---------|-----------|
| Neon | 0.5 GB storage, generous compute |
| Render | Free web service (sleeps when idle) |
| Vercel | Hobby free for personal projects |

Upgrade Render to **Starter ($7/mo)** for always-on API and optional persistent disk for uploads.

---

## Reference — all production env vars

**Backend (Render):**
```
DATABASE_URL=
SECRET_KEY=
CORS_ORIGINS=
UPLOAD_DIR=uploads
ENVIRONMENT=production
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

**Frontend (Vercel):**
```
VITE_API_URL=https://your-api-host/api/v1
```
