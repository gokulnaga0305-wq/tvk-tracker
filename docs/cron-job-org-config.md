# cron-job.org migration — copy-paste config

Migration replaces the GitHub Actions scheduled workflows (which got
throttled 3-5h past their configured times on the free tier) with
cron-job.org jobs that hit `/api/cron/*` endpoints on the backend.

### Quick reference — all 8 jobs (account timezone = Asia/Kolkata)

| # | Job | Schedule (IST) | Auth |
|---|---|---|---|
| 1 | keep HF warm | every 5 min | none |
| 2 | monitor handles | every 1 hour | secret |
| 3 | trickle verify | every 30 min | secret |
| 4 | **nightly full sweep** | **06:00** (after Groq reset) | secret |
| 5 | meter snapshot | 23:30 | secret |
| 6 | promise audit | 00:00 | secret |
| 7 | **press RSS ingest** (new) | every 30 min | secret |
| 8 | **ingestion watchdog** (new) | every 3 hours | secret |


**Cost delta: zero.** cron-job.org is free unlimited. Apify scrapes
cost the same as before (~$0.50/month). HF Spaces handles the work
on free tier (kept warm by the new `/api/cron/keep-warm` job itself).

**Reliability gain: 3-5h drift → ~5 min drift.**

---

## ⚠️ TIMEZONE — read this first

cron-job.org runs every job in **your account's timezone**
(Settings → Account → Timezone), NOT in UTC. So a job you enter as
"06:00" fires at 6 AM in whatever zone your account is set to.

**All daily times in this doc are given in BOTH UTC and IST.** Set your
cron-job.org account timezone to `Asia/Kolkata`, then enter the **IST**
times below. (Interval jobs — "every 5 min", "every 30 min", "every
hour" — ignore timezone entirely; they just fire on the interval.)

### The one timing that actually matters: the Groq token reset

The free AI budget (Groq tokens-per-day) resets at **00:00 UTC = 5:30 AM
IST**. Any heavy AI job (the nightly full verification sweep) MUST run
*after* that reset, or it hits the previous day's exhausted budget and
does nothing. That's why the nightly sweep below is at **06:00 IST**,
not 03:30 IST.

---

## Step 1 — Sign up

1. Go to https://cron-job.org/en/
2. Sign up with email (free)
3. Verify email
4. **Settings → Account → Timezone → set to `Asia/Kolkata` (IST)**
5. Dashboard → "Create cronjob"

## Step 2 — Create eight jobs

For each row below: click "Create cronjob", fill in the fields, save.
(Was six — Jobs 7 & 8 are new: steady gated RSS ingestion + the
Telegram stall-alert watchdog.)

### Job 1 — Keep HF Spaces warm

| Field | Value |
|---|---|
| Title | `TVK · keep HF warm` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/keep-warm` |
| Schedule | Every 5 minutes |
| HTTP method | GET |
| Headers | (none — public endpoint) |
| Notifications on failure | ✅ (free) |

### Job 2 — Tamil press + govt-handle monitor

| Field | Value |
|---|---|
| Title | `TVK · monitor handles` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/monitor-handles?hours_back=6&max_per_handle=50` |
| Schedule | Every 1 hour |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Request body | (empty) |
| Timeout | 60s |

### Job 3 — Trickle-sweep verification

| Field | Value |
|---|---|
| Title | `TVK · trickle verify` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/sweep-verify?limit=10&max_age_days=45` |
| Schedule | Every 30 minutes |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 4 — Nightly full corroboration sweep ⚠️ RESET-ALIGNED

| Field | Value |
|---|---|
| Title | `TVK · nightly full sweep` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/sweep-verify?limit=500&max_age_days=45` |
| Schedule | **Daily at 06:00 IST** (00:30 UTC) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

> **Why 06:00 IST, not 03:30:** the Groq daily token budget resets at
> 00:00 UTC = 5:30 AM IST. Running the heavy AI sweep at 03:30 IST would
> hit the *previous* day's exhausted budget. 06:00 IST runs it 30 min
> after a fresh reset — full token budget, maximum throughput.

### Job 5 — Daily meter snapshot

| Field | Value |
|---|---|
| Title | `TVK · meter snapshot` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/meter-snapshot` |
| Schedule | Daily at 23:30 IST (18:00 UTC) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 6 — Daily promise audit

| Field | Value |
|---|---|
| Title | `TVK · promise audit` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/promise-audit` |
| Schedule | Daily at 00:00 IST (18:30 UTC) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 7 — Press / Reddit / Google-News RSS ingestion — ⛔ DISABLE THIS

**Status (2026-06): RETIRED. Disable / delete this cron-job.org job.**

RSS ingestion is now owned solely by the GitHub Actions workflow
`rss-ingest.yml` (every 30 min, full rotating loop on a real runner with a
~16-min soft time budget). The cron-job.org version triggered the same
ingestion inside an HF FastAPI BackgroundTask that gets killed partway —
so it added little but **doubled the free-tier AI spend** (every item was
gated+extracted twice). Running both is what kept exhausting the Groq/Gemini
daily pools. **Turn this job OFF in cron-job.org** and let GitHub Actions be
the single owner.

| Field | Value |
|---|---|
| Title | `TVK · press RSS ingest` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/scrape-press-rss?max_items_per_source=25` |
| Schedule | ~~Every 30 minutes~~ → **disabled** |
| Owner now | GitHub Actions `rss-ingest.yml` |

### Job 8 — Ingestion watchdog → Telegram alert (NEW)

Checks every few hours: did any incidents land recently? is an AI
provider alive? is OpenRouter funded? If anything is wrong it pings
you on Telegram with the exact problem — so you never again have to
manually check whether ingestion stalled.

| Field | Value |
|---|---|
| Title | `TVK · ingestion watchdog` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/ingestion-watchdog?stale_hours=4` |
| Schedule | Every 3 hours |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 30s |

> Requires the Telegram bot to be configured (TELEGRAM_BOT_TOKEN +
> TELEGRAM_ALLOWED_CHAT_IDS on the HF Space — already set). Alerts go
> to every allowed chat id.

### Job 9 — Weekly promise evidence sweep (NEW, 2026-06-11)

Proactively searches Google News for delivery evidence per open promise
(deadline-bearing first). Attaches evidence_url on confident matches and
upgrades pending→partial only — never auto-kept, never auto-broken.
Currently also scheduled on GH Actions (weekly tolerates drift); set it
up here too only if you want to retire that workflow.

| Field | Value |
|---|---|
| Title | `TVK · promise evidence` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/promise-evidence-sweep?limit=50` |
| Schedule | Weekly, Monday 06:30 IST (after Groq reset) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 10 — Monthly district backfill (NEW, 2026-06-11)

Backfills missing district tags (dictionary first, AI for unknown
locations). Only touches rows where district IS NULL, so it's safe to
run any time. New incidents get districts at ingestion — this just
catches strays.

| Field | Value |
|---|---|
| Title | `TVK · district backfill` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/district-backfill?limit=500&use_ai=true` |
| Schedule | Monthly, 1st at 06:30 IST |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 11 — Weekly de-duplication (NEW, 2026-06-15)

Merges incidents that are the SAME event logged 2-3 times (the location-variant
gap: "Gummidipoondi" vs "Thiruvallur" vs blank → 3 rows). Title-similarity
guarded so distinct events never merge; generic-title categories (power cuts)
excluded; merges are reversible (dups → rejected + audit, visible on
/corrections). The live ingestion gate prevents most new dups, but a few drift
in over a day — this weekly pass keeps the counts honest.

| Field | Value |
|---|---|
| Title | `TVK · weekly dedup` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/dedup-incidents?days=14` |
| Schedule | Weekly, Sunday 04:00 IST |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

> Tip: to preview before it ever merges, hit the same URL with `&dry_run=true`
> — it returns the clusters it *would* merge without touching anything.

---

## Step 3 — Get your ADMIN_SECRET

The value is already in your HF Space's environment variables and your
GitHub repo secrets. To retrieve it:

- HF Spaces dashboard → your Space → Settings → Variables and secrets → ADMIN_SECRET
- OR run locally: `grep ADMIN_SECRET backend/.env`

Paste this value into the `x-admin-secret` header field for each job
above (except Job 1 — keep-warm is intentionally no-auth). Jobs 2-8 all
use the same secret.

---

## Step 4 — Verify each job ran

After saving each job, click it in the cron-job.org dashboard and check:
- "Status" column should show ✅ green next to the next-run timestamp
- "History" tab shows the last few executions with HTTP status codes
- Backend returns `202 {"status": "queued"}` for all POST jobs
- /api/cron/keep-warm returns `200 {"status": "warm", "govt_day": N}` for GET

Then watch the dashboard's "Tracking N incidents" counter — within a few
hours of the first monitor-handles fire you should see N tick up as fresh
press tweets land.

---

## Why the GH workflows weren't deleted

Each YAML now has its `schedule:` block commented out and only
`workflow_dispatch:` remains. They stay in the repo as belt-and-suspenders:
if cron-job.org has an outage you can still manually trigger any of them
from the Actions tab. After 2-3 weeks of stable cron-job.org runs you can
delete the workflow files entirely.

The `economic-release-watcher.yml` workflow still runs on GH Actions (weekly,
no urgency, throttling drift is irrelevant for a weekly job).

---

## Cost summary

| Service | Was | Now |
|---|---|---|
| GitHub Actions minutes | ~120/month | ~0/month |
| cron-job.org | 0 | 0 |
| Apify | ~$0.50/month | ~$0.50/month |
| HF Spaces | $0 | $0 |
| **Total infra** | **~$0.50/month** | **~$0.50/month** |

Cadence drift: was 3-5h on GH free tier, now ~30s on cron-job.org.
