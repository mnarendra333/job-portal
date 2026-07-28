#!/usr/bin/env bash
# Run demo seed with the project venv (avoids shell `python` aliases pointing at system Python).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Virtualenv not found. Run from backend/:"
  echo "  python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL (Neon connection string or local Docker URL)."
  exit 1
fi

export PYTHONPATH="$ROOT"
exec "$ROOT/.venv/bin/python" "$ROOT/scripts/seed_demo.py" "$@"
