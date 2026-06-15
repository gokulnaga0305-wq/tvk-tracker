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
import time
import traceback

SPACE = "goknaga/tvk-tracker-backend"
UPLOAD_RETRIES = 4          # total attempts before giving up
RETRY_BACKOFF_SECONDS = 20  # 20s, 40s, 80s between attempts


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

    # Retry the upload: the HF upload step fails intermittently on transient
    # API/network hiccups (the #1 source of false "workflow failed" emails).
    # A few backed-off retries lets a transient blip self-heal instead of
    # paging the maintainer. Only the FINAL attempt failing is a real failure.
    last_exc = None
    for attempt in range(1, UPLOAD_RETRIES + 1):
        try:
            commit = api.upload_folder(
                repo_id=SPACE,
                repo_type="space",
                folder_path="backend",
                commit_message="CI sync from GitHub main",
                ignore_patterns=["**/__pycache__/**", "**/*.pyc", ".env", ".venv/**", "*.log"],
            )
            oid = getattr(commit, "oid", commit)
            print(f"::notice::Synced backend/ -> HF Space {SPACE} "
                  f"(attempt {attempt}/{UPLOAD_RETRIES}). Commit: {oid}", flush=True)
            return 0
        except Exception as e:
            last_exc = e
            if attempt < UPLOAD_RETRIES:
                wait = RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))
                print(f"::warning::upload attempt {attempt}/{UPLOAD_RETRIES} failed "
                      f"({type(e).__name__}); retrying in {wait}s…", flush=True)
                time.sleep(wait)
            else:
                print(f"::error::upload_folder to {SPACE} failed after "
                      f"{UPLOAD_RETRIES} attempts:", flush=True)
                traceback.print_exc()
    return 1


if __name__ == "__main__":
    sys.exit(main())
