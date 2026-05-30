# Telegram bot — admin image-upload pipeline

Upload a news article / tweet / WhatsApp forward screenshot to a
Telegram chat. The bot OCRs it, AI-extracts the incident, dedups
against the dashboard, and either adds it as an admin-verified
incident or tells you it's already captured. All free.

## What you'll get

- **Upload image** → ~10s later, bot replies in chat:
  - `NEW INCIDENT ADDED\nTitle: ...\nView: tvk-tracker.vercel.app/incidents/abc123`
  - OR `ℹ️ Already on dashboard (87% match):\n"existing title"\nView: ...`
- Optional caption with source URL: the bot uses your URL as the source
- Tamil + English OCR (Google Vision API — best Tamil quality on free tier)
- Title-fuzzy-match dedup against last 30 days of approved incidents

## One-time setup (3 steps, ~10 minutes)

### Step 1 — Create the bot

1. Open Telegram, search `@BotFather`, start chat
2. Send `/newbot`
3. Pick a name (e.g. `TVK Tracker Admin`)
4. Pick a username ending in `bot` (e.g. `tvktracker_admin_bot`)
5. **Copy the bot token** BotFather gives you (looks like `7234567890:AAH...`)

### Step 2 — Get your chat ID

You need the chat ID of the chat the bot will read from. Two options:

**Option A (private chat — easiest):** the bot reads only YOUR direct messages.

1. Search your new bot in Telegram, start a chat with it
2. Send `/start` to the bot
3. Open in browser: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":<NUMBER>,...}` — that's your chat ID

**Option B (private group):** add the bot to a group with just you + the bot.

1. Create a Telegram group, add the bot
2. **In group privacy settings, give the bot admin role + permission to read messages**
3. Send any message in the group
4. Browser: `https://api.telegram.org/bot<TOKEN>/getUpdates` → grab the group chat ID (will be a negative number like `-1009876543210`)

### Step 3 — Get a Google Vision API key (for Tamil OCR)

1. Open https://console.cloud.google.com/
2. Create a project (or use existing). Name doesn't matter.
3. Search "Cloud Vision API" → Enable
4. APIs & Services → Credentials → Create credentials → API key
5. **Copy the key**
6. (Optional but recommended) restrict the key to "Cloud Vision API" only

Free tier: 1000 OCR calls/month. Admin upload volume is ~10-30/month, comfortably inside.

## Wire it up to the backend

Add three HF Space secrets (HF Space Settings → Variables and secrets):

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | The token from BotFather |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated chat IDs you got from step 2 (e.g. `123456789` or `-1009876543210`) |
| `GOOGLE_VISION_API_KEY` | The Google Vision API key from step 3 |

Wait ~2 min for HF to redeploy.

## Tell Telegram where to send updates

One curl/python command — sets the webhook URL on Telegram's side:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://goknaga-tvk-tracker-backend.hf.space/api/webhook/telegram",
    "secret_token": "<YOUR_ADMIN_SECRET>",
    "allowed_updates": ["message", "channel_post"]
  }'
```

Replace `<YOUR_BOT_TOKEN>` and `<YOUR_ADMIN_SECRET>` (the same `ADMIN_SECRET` you have in `backend/.env`).

Expected response: `{"ok":true,"result":true,"description":"Webhook was set"}`

## Verify it's wired

1. In your Telegram chat with the bot, send `/start` — bot should reply with a welcome message
2. Hit `https://goknaga-tvk-tracker-backend.hf.space/api/webhook/telegram/health` — should return `{"configured": true, "allowed_chats_count": 1, "ocr_configured": true}`

## Daily usage

Just upload screenshots to the chat. Examples:

- News article screenshot → bot extracts the incident
- Tweet screenshot → bot extracts; if you include the tweet URL in caption, that's saved as source
- Multiple images of the same article → upload one at a time; the dedup catches the 2nd/3rd

If you upload something the dashboard already has, bot replies `ℹ️ Already on dashboard...` so you know you can ignore that upload. No action needed from you.

## Security notes

- Bot only responds to chat IDs in `TELEGRAM_ALLOWED_CHAT_IDS`. Random people who find the bot get silence — no acknowledgement.
- Webhook is authenticated via `secret_token` header — Telegram is the only entity that knows the value.
- All inserted incidents are tagged `verification_status=admin_verified` and `ai_raw.telegram_source=true` so they're auditable.

## Rotating tokens later

- New bot token: `@BotFather` → `/token` → revoke and regenerate. Update `TELEGRAM_BOT_TOKEN` on HF + re-run `setWebhook`.
- New Vision key: Google Cloud Credentials → regenerate. Update `GOOGLE_VISION_API_KEY` on HF.
- New chat: just edit `TELEGRAM_ALLOWED_CHAT_IDS` on HF (comma-separated).

## What it can't do (yet)

- URL-only ingestion (you said paste a URL, no image) — currently prompts for image. If you want this, ask and I'll wire it.
- Multi-image-as-one-incident (e.g. 3 screenshots of one long article) — currently treated as 3 separate incidents (dedup catches the duplicates). Could add a `/group` command.
- Voice notes / video — text-only via OCR.

## Cost

| | Monthly |
|---|---|
| Telegram bot | $0 |
| Google Vision (1000 free OCR/mo) | $0 |
| Groq AI extraction | $0 |
| HF Spaces hosting | $0 |
| **Total** | **$0** |
