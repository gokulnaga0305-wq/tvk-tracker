"""One-shot Telegram bot setup. Run from your laptop.

What it does
------------
1. Verifies the bot token (via getMe)
2. Reads getUpdates to find your chat ID (you must have sent /start
   to the bot from Telegram first)
3. Sets the webhook on Telegram to point at the HF backend, with the
   admin secret as the secret_token header
4. Verifies the webhook is configured (via getWebhookInfo)
5. Tests the HF backend health endpoint to confirm round-trip works
6. Prints the 3 secrets you need to add to HF Spaces

Usage
-----
  $env:TELEGRAM_BOT_TOKEN = "<the-real-token>"   # PS
  python scripts/setup_telegram_bot.py

The script does NOT echo the bot token back to stdout, so even if you
screenshot the output, the token doesn't leak.
"""
from __future__ import annotations
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / "backend" / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

BACKEND = "https://goknaga-tvk-tracker-backend.hf.space"
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "").strip()


def _tg(method: str, payload: dict | None = None) -> dict:
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(
        url,
        method="POST" if payload else "GET",
        data=data,
        headers={"Content-Type": "application/json"} if payload else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error": True, "code": e.code, "body": e.read().decode()[:200]}
    except Exception as e:
        return {"_error": True, "msg": f"{type(e).__name__}: {str(e)[:120]}"}


def main() -> int:
    if not TOKEN:
        print("ERROR: set $env:TELEGRAM_BOT_TOKEN before running this script")
        return 1
    if not ADMIN_SECRET:
        print("ERROR: ADMIN_SECRET not in backend/.env")
        return 1

    # 1. Verify token
    print("Step 1: Verify token via getMe")
    me = _tg("getMe")
    if me.get("_error"):
        print(f"  TOKEN INVALID: {me}")
        print("  Get a fresh token: @BotFather -> /token -> select your bot")
        return 1
    bot = me["result"]
    print(f"  username: @{bot['username']}")
    print(f"  bot_id:   {bot['id']}")
    print()

    # 2. Get chat IDs from getUpdates
    print("Step 2: Discover chat IDs (chats that have messaged the bot)")
    ups = _tg("getUpdates")
    if ups.get("_error"):
        print(f"  getUpdates failed: {ups}")
        return 1
    chat_ids: set[int] = set()
    for u in ups.get("result", []):
        msg = u.get("message") or u.get("channel_post") or {}
        chat = msg.get("chat") or {}
        cid = chat.get("id")
        if cid:
            chat_ids.add(cid)
            kind = chat.get("type", "?")
            label = chat.get("first_name") or chat.get("title") or "unknown"
            print(f"  chat_id={cid}  type={kind}  name={label}")
    if not chat_ids:
        print("  NO CHATS FOUND.")
        print("  -> Open the bot in Telegram and send /start, then re-run this script.")
        return 1
    chat_ids_csv = ",".join(str(c) for c in sorted(chat_ids))
    print()

    # 3. Set webhook
    print(f"Step 3: Configure Telegram to webhook our backend")
    print(f"  URL: {BACKEND}/api/webhook/telegram")
    res = _tg("setWebhook", {
        "url": f"{BACKEND}/api/webhook/telegram",
        "secret_token": ADMIN_SECRET,
        "allowed_updates": ["message", "channel_post"],
    })
    if res.get("_error") or not res.get("ok"):
        print(f"  setWebhook failed: {res}")
        return 1
    print(f"  setWebhook: ok=True")
    print()

    # 4. Verify webhook
    print("Step 4: Verify webhook")
    info = _tg("getWebhookInfo")
    if info.get("_error"):
        print(f"  getWebhookInfo failed: {info}")
    else:
        ri = info["result"]
        print(f"  url:                {ri.get('url')}")
        print(f"  pending_updates:    {ri.get('pending_update_count')}")
        print(f"  last_error:         {ri.get('last_error_message', '-')}")
        print(f"  ip_address:         {ri.get('ip_address', '-')}")
    print()

    # 5. Test backend health
    print("Step 5: Verify backend webhook endpoint")
    try:
        r = urllib.request.urlopen(f"{BACKEND}/api/webhook/telegram/health", timeout=12)
        h = json.loads(r.read())
        print(f"  configured:           {h.get('configured')}")
        print(f"  allowed_chats_count:  {h.get('allowed_chats_count')}")
        print(f"  ocr_configured:       {h.get('ocr_configured')}")
        if not h.get("configured"):
            print("  WARN: TELEGRAM_BOT_TOKEN not set on HF Spaces yet — add it (see step 6).")
        if h.get("allowed_chats_count", 0) == 0:
            print("  WARN: TELEGRAM_ALLOWED_CHAT_IDS not set on HF Spaces yet — add it.")
        if not h.get("ocr_configured"):
            print("  WARN: GOOGLE_VISION_API_KEY not set on HF Spaces yet — OCR will be disabled.")
    except Exception as e:
        print(f"  health check failed: {e}")
    print()

    # 6. Final instructions
    print("=" * 60)
    print("ALMOST DONE. Add these 3 secrets to HF Space:")
    print()
    print("  https://huggingface.co/spaces/goknaga/tvk-tracker-backend/settings")
    print()
    print(f"  TELEGRAM_BOT_TOKEN          <the value of $env:TELEGRAM_BOT_TOKEN>")
    print(f"  TELEGRAM_ALLOWED_CHAT_IDS   {chat_ids_csv}")
    print(f"  GOOGLE_VISION_API_KEY       <get from console.cloud.google.com>")
    print()
    print("HF will redeploy automatically after you save (~2 min).")
    print("Then send /start to the bot in Telegram — should reply with welcome.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
