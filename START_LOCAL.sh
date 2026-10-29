#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install -q -r backend/requirements.txt
exec .venv/bin/python -m uvicorn backend.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}"
