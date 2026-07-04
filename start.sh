#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${WORKER_PID:-}" ]] && kill -0 "${WORKER_PID}" 2>/dev/null; then
    echo "[start] stopping worker pid=${WORKER_PID}"
    kill "${WORKER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if ! command -v python >/dev/null 2>&1; then
  echo "[start] python not found"
  exit 127
fi

echo "[start] launching worker..."
python -u worker.py &
WORKER_PID=$!
export WORKER_PID
echo "[start] worker pid=${WORKER_PID}"

python - <<'PY' &
import os
import time

pid = int(os.environ["WORKER_PID"])
while True:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        print("[start] worker exited")
        break
    time.sleep(5)
PY

echo "[start] launching web..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
