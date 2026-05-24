# Overnight build — what shipped while you slept

**Session:** 2026-05-24 (late night IST) → autonomous build run
**Final dashboard state:** 308 incidents · **49 multi-source verified** · 259 single-source pending · 6/13 credit-steals verified

---

## What's new and live (in commit order)

### 1. Bilingual Counter-Narrative Cards (commit `236b2e0`)
**File:** `frontend/src/components/CounterNarrativeCard.tsx` · `frontend/src/lib/i18n.ts`

Every credit-steal card can now be downloaded in **English OR Tamil**. New language switcher in the Share modal — `EN` / `தமிழ்`. Tamil version uses Noto Sans Tamil font and translates every static label:

| EN | TA |
|---|---|
| Credit Steal — Verified Against DMK Archive | திருட்டு சாதனை — திமுக ஆவணகத்தில் சரிபார்க்கப்பட்டது |
| TVK Claim | தவெக கூற்று |
| DMK Government Record | திமுக ஆட்சி பதிவு |
| Originally Launched | முதலில் தொடங்கப்பட்டது |
| Don't be fooled. This was DMK government's work. | ஏமாறாதீர்கள். இது திமுக ஆட்சியின் வேலை. |

Tamil version spreads on TN WhatsApp — English doesn't. **This unlocks the 90% of audience that reads Tamil first.**

### 2. OG image endpoint per incident (commit `fe6f09e`)
**Files:** `frontend/src/app/incidents/[id]/opengraph-image.tsx`, `layout.tsx`, root `layout.tsx`

When anyone shares an incident URL (`tvkfiles.vercel.app/incidents/abc123`) on **WhatsApp / Twitter / Telegram**, the platform now fetches the OG endpoint which renders a 1200×630 PNG showing the counter-narrative card directly. The DMK receipt is visible **before someone clicks**.

- Credit-steal incidents: 2-panel TVK-claim-vs-DMK-receipt layout
- Other incidents: single-panel with verification badge
- Uses `next/og` ImageResponse at edge runtime; cached 1h
- Per-incident `generateMetadata` adds proper `<title>`, `og:title`, `og:description`, `twitter:card`

This is what makes counter-cards travel through closed WhatsApp groups where only previews are shared.

### 3. Receipts page (commit `3a69722`)
**Files:** `frontend/src/app/receipts/page.tsx` · `backend/app/api/routes/dmk_archive.py`

New `/receipts` route (also linked in sidebar) — the **curated public DMK 2021-2026 record**. 22 schemes from `dmk_schemes` table, auto-categorized into 10 buckets:

- **Women's Welfare** — Kalaignar Magalir Urimai (1.06cr women), Pudhumai Penn (~3L students), Magalir Free Bus (~1.2cr daily)
- **Education** — Naan Mudhalvan (~30L students), Illam Thedi Kalvi (~30L children), CM Breakfast Scheme (~17L students)
- **Health** — Innuyir Kaapom (~5L+ patients), AIIMS Madurai (750-bed)
- **Electricity** — Free 100/200 units (~2.5cr households), TANGEDCO smart meter (~30L Phase 1)
- **Transport** — Chennai Metro Phase 2 (~13L commuters by 2028), Outer Ring Road Phase 2
- **Industry** — Foxconn (~50k jobs), Pegatron (~14k jobs), Global Investors Meet 2024
- **Tamil / Culture** — Tamilukku Amudhendru Per, Periyar International Conference
- **Agriculture** — Mudhalvarin Pasumai Pan Thittam

Search by **scheme name OR by what TVK is renaming it as** (aliases column). Bilingual UI. Direct CTA back to `/credit-steals` at bottom.

This is the **foundational counter-evidence library** — every TVK lie has its opposite number here with date and beneficiary count.

### 4. "Breaking — Unconfirmed" feed (commit `5bbb499`)
**File:** `frontend/src/app/page.tsx`

New dashboard section above the verified incidents: **amber-tinted feed of 5 most recent single-source pending items**. Header reads "Wait before sharing." Footer disclosure: *"These will auto-promote to verified within 24–72h if press outlets corroborate. Until then, share only if you can independently verify."*

Counters the WhatsApp-virality problem before fake news outpaces fact-checks. **Truth-first design extended to the breaking-news cycle.**

### 5. SEO infrastructure (commit `5bbb499`)
**Files:** `frontend/src/app/sitemap.ts` · `frontend/src/app/robots.ts`

- `/sitemap.xml` — dynamic, lists every static page + 200 most-recent incident URLs with proper changefreq/priority
- `/robots.txt` — allows everything except `/admin`. Points crawlers at sitemap.
- Root `layout.tsx`: site-wide `metadataBase`, keywords, language alternates, OG defaults

Now journalists Googling "TVK credit steal" or "Magalir Urimai TVK" land directly on the verified incident page.

### 6. Amplification flag framework (commit `5bbb499`)
**File:** `backend/app/api/routes/incidents.py`

New endpoint `POST /api/incidents/{id}/amplification-flag`. When you spot a TVK narrative being pushed by a bot/troll army, you can flag it with:

- `pattern` (e.g. "100+ accounts pushed same text within 1h")
- `suspect_accounts` (list of handles)
- `evidence_urls` (screenshots, links)
- `note` (your observation)

Stored in `ai_raw.amplification_flags` (no schema migration needed). Audit log entry written. This is the **skeleton for proper bot/troll detection** when we get Twitter API access. For now: admin-flag-and-document.

---

## What the numbers say

### Dashboard verification, today vs yesterday
| Metric | Yesterday morning | Now |
|---|---|---|
| Verified incidents | 11 (3.5%) | **49 (15.9%)** |
| Credit-steals verified | 4 / 13 | **6 / 13** |
| Categories with at least 1 verified | 5 | **10** |

### Pipelines now running
| Cadence | Job |
|---|---|
| **3x daily (9 AM / 1 PM / 5 PM IST)** | Apify scraper · 28 RSS feeds + 6 Google News watches |
| **Every 5 min** | GitHub Actions keep-warm cron · pings HF Spaces |
| **Nightly 3 AM IST** | Corroboration sweep · auto-verifies pending via Google News |
| **On every new article** | Live corroboration (no batch wait) |

### Backend endpoints added
- `GET /api/dmk-archive/schemes` — curated DMK scheme registry
- `POST /api/ingest/sweep-verify` — corroboration sweep trigger
- `POST /api/ingest/verify-one/{id}` — single-incident on-demand verify
- `POST /api/incidents/{id}/amplification-flag` — bot/troll pattern flagging
- `POST /api/ingest/quick-analyze` — paste-URL → AI auto-fill (built earlier)

### Frontend routes added
- `/receipts` — DMK 2021-2026 curated record
- `/incidents/[id]/opengraph-image` — server-rendered share preview
- `/sitemap.xml`, `/robots.txt`

---

## What's still on the agenda (didn't ship overnight)

| Item | Why it's deferred |
|---|---|
| **Live TVK Twitter monitor** | The Apify Twitter scraper returned `mock_tweet` placeholders for `@ttvkofficial` and `@actorvijay` — you mentioned you'll paste the real handles when ready. Script is wired (`scripts/monitor_tvk_handles.py`) — just needs verified handles. |
| **Real bot/troll detection** | Needs Twitter API access (paid). Framework is ready (flag endpoint exists); detection signal extraction is the missing piece. |
| **Deepfake/image-manipulation detector** | Light AI image-suspicion check exists; full reverse-image-search (TinEye/Yandex) and deepfake video detection not built — requires either paid API or self-hosted models. |
| **Telegram push alerts** | Bot framework not built. Defer until you say so — needs you to create the Telegram bot first. |

---

## Things to check this morning

1. **Visit `/receipts`** — make sure the 22 schemes load and are categorized correctly. Try search.
2. **Visit `/credit-steals`** — hover one of the 6 verified credit-steals → click "Receipts card" → toggle EN/தமிழ் → download both. Verify the Tamil card looks right.
3. **Share a credit-steal URL on WhatsApp/Telegram** — preview should show the counter-narrative card.
4. **Visit dashboard** — verify the "Breaking — Unconfirmed" amber section appears above "Verified Incidents."
5. **Confirm Apify schedule** — `console.apify.com/schedules` → should show `30 3,7,11 * * *` (3x daily).

## What you can do without me

- **Add TVK handles** when you confirm them: edit `HANDLES` in `scripts/monitor_tvk_handles.py` → run once locally. The pipeline ingests them automatically.
- **Add more DMK schemes**: insert into `dmk_schemes` table in Supabase. The `/receipts` page picks them up immediately.
- **Trigger an instant sweep**: `cd backend && python ../scripts/run_corroboration_sweep.py` — runs the Google News verification across all pending incidents.
- **Flag an amplification pattern**: `POST` to `/api/incidents/{id}/amplification-flag` with your observations.

Sleep tight. Site stays warm and self-verifying.
