from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.schema_service import build_schema_reconcile


def main() -> int:
    report = build_schema_reconcile()
    suggestions = report.get("suggested_migrations") or []
    print("-- Schema reconciliation dry-run")
    print("-- Missing tables:", ", ".join(sorted((report.get("missing") or {}).keys())) or "none")
    print()
    if not suggestions:
        print("-- No migration SQL needed.")
        return 0

    for item in suggestions:
        table = item.get("table", "unknown")
        column = item.get("column", "unknown")
        sql = item.get("sql", "")
        print(f"-- {table}.{column}")
        print(sql)
        print()

    print("-- Full report JSON")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
