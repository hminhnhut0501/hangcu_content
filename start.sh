#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${WORKER_PID:-}" ]] && kill -0 "${WORKER_PID}" 2>/dev/null; then
    echo "[start] stopping worker pid=${WORKER_PID}"
    kill "${WORKER_PID}" 2>/dev/null || true
    wait "${WORKER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[start] launching worker..."
python -u worker.py &
WORKER_PID=$!
echo "[start] worker pid=${WORKER_PID}"

(
  if wait "${WORKER_PID}"; then
    echo "[start] worker exited with code 0"
  else
    code=$?
    echo "[start] worker exited with code ${code}"
  fi
) &

echo "[start] launching web..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
