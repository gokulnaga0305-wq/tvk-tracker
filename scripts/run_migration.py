"""Run a SQL migration file against the Supabase Postgres.

Why not the Supabase Python SDK?  The SDK's PostgREST surface doesn't expose
arbitrary DDL — there's no "execute_sql" method.  Two reliable paths:

  1.  Direct psycopg2 connection to the underlying Postgres (host pulled from
      SUPABASE_URL).  Requires the DB password (different from the API key)
      and is the cleanest way.
  2.  Manually paste into the Supabase SQL editor.

This script tries (1) — psycopg2 + DATABASE_URL pulled from .env if set,
otherwise it builds the host from SUPABASE_URL and asks for the DB password.
If neither works it prints the SQL with copy-paste instructions for the
Supabase SQL editor as a fallback.

Usage:
    python scripts/run_migration.py database/009_economic_quarterly.sql

After it succeeds the new table is available immediately on the live HF
backend (Supabase is shared between local and prod).
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"


def _load_env(path: Path) -> dict[str, str]:
    """Minimal .env loader — avoids pulling in python-dotenv."""
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        v = v.strip().strip('"').strip("'")
        env[k.strip()] = v
    return env


def _print_manual_fallback(sql: str, msg: str) -> None:
    print(f"\n[!] {msg}\n")
    print("==== MANUAL FALLBACK ====")
    print("Paste this into the Supabase SQL editor:")
    print(f"  https://supabase.com/dashboard/project/_/sql/new")
    print("---- BEGIN SQL ----")
    print(sql)
    print("---- END SQL ----")


def main(sql_path: Path) -> int:
    if not sql_path.exists():
        print(f"[x] SQL file not found: {sql_path}")
        return 2

    sql = sql_path.read_text(encoding="utf-8")
    env = _load_env(BACKEND_ENV)

    supabase_url = env.get("SUPABASE_URL")
    db_url = env.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    db_password = env.get("SUPABASE_DB_PASSWORD") or os.environ.get("SUPABASE_DB_PASSWORD")

    if not supabase_url and not db_url:
        _print_manual_fallback(sql, "SUPABASE_URL missing from backend/.env")
        return 1

    try:
        import psycopg2  # type: ignore
    except ImportError:
        _print_manual_fallback(
            sql,
            "psycopg2 not installed (pip install psycopg2-binary), falling back to manual instructions."
        )
        return 1

    # Build the conn string if not explicitly provided
    if not db_url:
        if not db_password:
            _print_manual_fallback(
                sql,
                "Need DATABASE_URL or SUPABASE_DB_PASSWORD in backend/.env to connect via psycopg2.\n"
                "Find your DB password at: Supabase dashboard -> Project Settings -> Database -> Connection string.\n"
                "Either:\n"
                "  (a) add SUPABASE_DB_PASSWORD=<password> to backend/.env  OR\n"
                "  (b) add DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"
            )
            return 1
        u = urlparse(supabase_url)  # e.g. https://abcd.supabase.co
        host = u.netloc.replace("https://", "").replace("http://", "")
        # Supabase Postgres host pattern: db.<projectref>.supabase.co
        if host.endswith(".supabase.co"):
            ref = host.split(".")[0]
            host = f"db.{ref}.supabase.co"
        db_url = f"postgresql://postgres:{db_password}@{host}:5432/postgres"

    print(f"[i] Connecting to Postgres at {urlparse(db_url).netloc} ...")
    try:
        conn = psycopg2.connect(db_url, sslmode="require")
    except Exception as e:
        _print_manual_fallback(sql, f"psycopg2 connect failed: {e}")
        return 1

    print(f"[i] Running migration: {sql_path.name}")
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql)
        print("[OK] Migration applied successfully.")
    except Exception as e:
        _print_manual_fallback(sql, f"Execution failed: {e}")
        return 1
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/run_migration.py <path-to.sql>")
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
