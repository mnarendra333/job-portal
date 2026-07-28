#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting Postgres (Docker)..."
docker compose up -d db
until docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

echo "==> Applying schema..."
if ! docker compose exec -T db psql -U postgres -d job_portal -tAc "SELECT 1 FROM organizations LIMIT 1" 2>/dev/null | grep -q 1; then
  docker compose exec -T db psql -U postgres -d job_portal -v ON_ERROR_STOP=1 \
    < supabase/migrations/001_initial_schema.sql
else
  echo "    Schema already present, skipping."
fi

echo "==> Seeding demo data..."
cd backend
if [ ! -d .venv ]; then
  python3.12 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
cp -n .env.example .env 2>/dev/null || true
PYTHONPATH=. .venv/bin/python scripts/seed_demo.py --reset

echo ""
echo "Done! Start the app:"
echo "  Backend:  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8002"
echo "  Frontend: cd frontend && npm install && npm run dev"
echo ""
echo "Demo logins:"
echo "  Admin:     admin@demo.jobs / admin1234"
echo "  Recruiter: recruiter@demo.jobs / admin1234"
echo "  Agency:    agency@demo.jobs / admin1234"
echo "  Seeker:    seeker@demo.jobs / admin1234"
