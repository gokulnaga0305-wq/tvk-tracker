"""Push ADMIN_SECRET to HF Space via API — no clicking in HF UI required.

Wraps the HF Hub REST API for Space secrets:
  POST https://huggingface.co/api/spaces/{namespace}/{name}/secrets
  body: {"key": "ADMIN_SECRET", "value": "<the secret>"}
  auth: Bearer <HF_TOKEN with write scope>

This solves the "cron-job.org headers and HF Spaces don't agree on
ADMIN_SECRET" problem by making the ADMIN_SECRET in backend/.env the
single source of truth and pushing it to BOTH endpoints automatically.

Run sequence
------------
1. Edit backend/.env so ADMIN_SECRET is whatever value you want
   (the placeholder tvk-files-admin-change-me-2026 is fine for now —
   it's not used for anything except admin auth on YOUR own endpoints).
2. Make sure HF_TOKEN env var is set (the same write-scope token you
   added to GitHub Secrets when setting up the auto-sync workflow):
       PowerShell:  $env:HF_TOKEN = "hf_xxx..."
       bash:        export HF_TOKEN="hf_xxx..."
3. Run:  python scripts/sync_admin_secret.py
4. The script sets ADMIN_SECRET on HF Spaces to match backend/.env.
5. HF will redeploy automatically (~2 min). After that the cron-job.org
   jobs created by setup_cronjob_org.py will authenticate successfully.

Optional: also sets OPENROUTER_API_KEY, APIFY_API_TOKEN, SUPABASE_* etc
if --all is passed. By default only ADMIN_SECRET is touched to keep the
operation focused.
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPACE = "goknaga/tvk-tracker-backend"  # namespace/name


def _load_env_file() -> dict[str, str]:
    """Parse backend/.env into a {key: value} dict."""
    env_path = ROOT / "backend" / ".env"
    if not env_path.exists():
        print(f"ERROR: {env_path} not found")
        sys.exit(1)
    out: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def _set_secret(token: str, key: str, value: str, description: str | None = None) -> None:
    """Upsert a secret on the HF Space.

    HF API: POST /api/spaces/{repo_id}/secrets with {key, value, description?}
    Auth:  Authorization: Bearer <token-with-write-scope>
    """
    url = f"https://huggingface.co/api/spaces/{SPACE}/secrets"
    body = {"key": key, "value": value}
    if description:
        body["description"] = description
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()  # discard
    except urllib.error.HTTPError as e:
        raw = e.read().decode()[:200]
        raise RuntimeError(f"HF API error setting {key}: HTTP {e.code} {raw}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="Push every secret in backend/.env to HF Spaces, "
                         "not just ADMIN_SECRET")
    ap.add_argument("--keys", type=str, default=None,
                    help="Comma-separated explicit keys to push "
                         "(overrides --all)")
    args = ap.parse_args()

    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        print("ERROR: HF_TOKEN env var is not set.")
        print("       Generate at https://huggingface.co/settings/tokens (Write scope).")
        return 1

    env = _load_env_file()

    if args.keys:
        keys = [k.strip() for k in args.keys.split(",") if k.strip()]
    elif args.all:
        # All secrets we know HF Spaces needs at runtime
        keys = [
            "ADMIN_SECRET",
            "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
            "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "APIFY_API_TOKEN",
            "GOOGLE_FACT_CHECK_API_KEY", "HUGGINGFACE_API_KEY",
        ]
    else:
        keys = ["ADMIN_SECRET"]

    pushed = 0
    skipped = 0
    failed: list[str] = []
    for key in keys:
        value = env.get(key)
        if value is None or value == "":
            print(f"  [skip] {key} (not present in backend/.env)")
            skipped += 1
            continue
        try:
            _set_secret(token, key, value)
            print(f"  [ok]   {key}")
            pushed += 1
        except Exception as e:
            print(f"  [err]  {key} -> {e}")
            failed.append(key)

    print()
    print(f"==== Summary: {pushed} pushed, {skipped} skipped, {len(failed)} failed ====")
    if pushed > 0:
        print()
        print(f"HF Space '{SPACE}' will auto-redeploy with the new secret(s) in ~2 minutes.")
        print("After that the cron-job.org jobs will authenticate successfully.")
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
