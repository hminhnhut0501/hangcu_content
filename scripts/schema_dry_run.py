from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.schema_service import build_schema_reconcile


def _build_sql(report: dict) -> str:
    lines: list[str] = []
    lines.append("-- Schema reconciliation dry-run")
    lines.append("-- Missing tables: " + (", ".join(sorted((report.get("missing") or {}).keys())) or "none"))
    lines.append("")
    suggestions = report.get("suggested_migrations") or []
    if not suggestions:
        lines.append("-- No migration SQL needed.")
    else:
        for item in suggestions:
            table = item.get("table", "unknown")
            column = item.get("column", "unknown")
            sql = item.get("sql", "")
            lines.append(f"-- {table}.{column}")
            lines.append(sql)
            lines.append("")
    lines.append("-- Full report JSON")
    lines.append(json.dumps(report, indent=2, ensure_ascii=False))
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    report = build_schema_reconcile()
    output = _build_sql(report)
    out_path = ROOT / "schema_dry_run.sql"
    out_path.write_text(output, encoding="utf-8")
    print(output)
    print(f"-- Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
