#!/bin/sh
set -e
mkdir -p "${UPLOAD_DIR:-uploads}"
export PYTHONPATH=/app
python scripts/ensure_seed_resumes.py || echo "Warning: could not ensure resume files on disk"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
