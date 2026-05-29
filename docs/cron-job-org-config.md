# cron-job.org migration — copy-paste config

Migration replaces 6 GitHub Actions scheduled workflows (which got
throttled 3-5h past their configured times on the free tier) with
cron-job.org jobs that hit new `/api/cron/*` endpoints on the backend.

**Cost delta: zero.** cron-job.org is free unlimited. Apify scrapes
cost the same as before (~$0.50/month). HF Spaces handles the work
on free tier (kept warm by the new `/api/cron/keep-warm` job itself).

**Reliability gain: 3-5h drift → ~5 min drift.**

---

## Step 1 — Sign up

1. Go to https://cron-job.org/en/
2. Sign up with email (free)
3. Verify email
4. Dashboard → "Create cronjob"

## Step 2 — Create six jobs

For each row below: click "Create cronjob", fill in the fields, save.

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

### Job 4 — Nightly full corroboration sweep

| Field | Value |
|---|---|
| Title | `TVK · nightly full sweep` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/sweep-verify?limit=500&max_age_days=45` |
| Schedule | Daily at 22:00 UTC (03:30 IST) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 5 — Daily meter snapshot

| Field | Value |
|---|---|
| Title | `TVK · meter snapshot` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/meter-snapshot` |
| Schedule | Daily at 18:00 UTC (23:30 IST) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

### Job 6 — Daily promise audit

| Field | Value |
|---|---|
| Title | `TVK · promise audit` |
| URL | `https://goknaga-tvk-tracker-backend.hf.space/api/cron/promise-audit` |
| Schedule | Daily at 18:30 UTC (24:00 IST) |
| HTTP method | POST |
| Headers | `x-admin-secret: <YOUR_ADMIN_SECRET>` |
| Timeout | 60s |

---

## Step 3 — Get your ADMIN_SECRET

The value is already in your HF Space's environment variables and your
GitHub repo secrets. To retrieve it:

- HF Spaces dashboard → your Space → Settings → Variables and secrets → ADMIN_SECRET
- OR run locally: `grep ADMIN_SECRET backend/.env`

Paste this value into the `x-admin-secret` header field for each job
above (except Job 1 — keep-warm is intentionally no-auth).

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
