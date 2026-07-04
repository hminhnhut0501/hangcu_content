#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${WORKER_PID:-}" ]] && kill -0 "${WORKER_PID}" 2>/dev/null; then
    kill "${WORKER_PID}" 2>/dev/null || true
    wait "${WORKER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

python worker.py &
WORKER_PID=$!

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
