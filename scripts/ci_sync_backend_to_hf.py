"""CI entrypoint: sync backend/ to the HF Space via huggingface_hub.

Called by .github/workflows/sync-backend-to-hf.yml. Kept as a committed
file (not an inline heredoc) so:
  - no YAML/heredoc indentation ambiguity
  - full tracebacks surface in the Actions log on failure
  - it can be run locally for debugging: HF_TOKEN=... python scripts/ci_sync_backend_to_hf.py

Requires env HF_TOKEN with WRITE scope on goknaga/tvk-tracker-backend.
"""
from __future__ import annotations
import os
import sys
import traceback

SPACE = "goknaga/tvk-tracker-backend"


def main() -> int:
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        print("::error::HF_TOKEN not set (needs WRITE scope).", flush=True)
        return 1

    try:
        from huggingface_hub import HfApi
    except Exception:
        print("::error::huggingface_hub not importable", flush=True)
        traceback.print_exc()
        return 1

    api = HfApi(token=token)

    # Sanity: confirm the token can see the repo + has write access.
    try:
        who = api.whoami()
        print(f"Authenticated as: {who.get('name')} "
              f"(token role: {who.get('auth', {}).get('accessToken', {}).get('role', '?')})",
              flush=True)
    except Exception:
        print("::error::whoami() failed — token likely invalid or expired.", flush=True)
        traceback.print_exc()
        return 1

    try:
        commit = api.upload_folder(
            repo_id=SPACE,
            repo_type="space",
            folder_path="backend",
            commit_message="CI sync from GitHub main",
            ignore_patterns=["**/__pycache__/**", "**/*.pyc", ".env", ".venv/**", "*.log"],
        )
        oid = getattr(commit, "oid", commit)
        print(f"::notice::Synced backend/ -> HF Space {SPACE}. Commit: {oid}", flush=True)
        return 0
    except Exception:
        print(f"::error::upload_folder to {SPACE} failed:", flush=True)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
