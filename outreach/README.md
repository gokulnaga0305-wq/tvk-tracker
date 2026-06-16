# Outreach source packs (for NotebookLM)

This folder is the **bridge** between the dashboard's verified data and NotebookLM.

NotebookLM has no API to wire into the app, so we don't "integrate" it — instead we
export the dashboard's **verified, primary-sourced** evidence into clean briefing
documents here. You upload those into a NotebookLM notebook, and it generates the
shareable outputs (audio overviews, FAQs, study guides, briefings) **grounded in our
receipts**, with citations.

## Workflow
1. Create a NotebookLM notebook per theme (e.g. "TASMAC truth", "Power/EB", "Credit steals").
2. Upload the matching `*-briefing.md` from this folder as the **source(s)**.
   (You can also add the original primary sources — the links inside each doc — so
   NotebookLM cites them directly.)
3. Generate the output you want: **Audio Overview** (it supports Tamil), **FAQ**,
   **Study guide**, or **Briefing doc**.
4. **Human-review the output before sharing.** NotebookLM is faithful to its sources
   but can still mis-summarise — check every claim against the doc.
5. Share (WhatsApp / YouTube / X), and keep the source link handy for anyone who asks.

## The honesty rules (non-negotiable — they're why this is un-debunkable)
- **Only feed it docs from this folder** (or the primary sources they cite).
  **Never** feed it partisan cards (tnstats infographics, Sun News graphics, fan reels) —
  NotebookLM will faithfully launder their framing. Garbage in, garbage out.
- Every claim in these briefing docs **carries a source**. The framing is deliberately
  **even-handed** (it states the counter-arguments too) — keep it that way; that's what
  survives scrutiny.
- If NotebookLM's output overstates something, fix it or drop it. The dashboard's
  credibility is the whole asset.

## Why this also helps your constraints
- NotebookLM runs on Google's compute, so heavy synthesis **does not touch your free
  Groq/Gemini AI pool** (your binding constraint). It offloads the content work.
- $0: the free NotebookLM tier is enough for this.

## Source packs available
- `tasmac-truth-briefing.md` — Does Tamil Nadu "run on" TASMAC/liquor money?
- `power-eb-briefing.md` — EB bills under DMK: who really decides the annual hike?
- `credit-steals-briefing.md` — Credit-steals & propaganda misattributions (Adani
  smart-meter, farmer-waiver U-turn, Yogi Babu).
- `investments-briefing.md` — Investment scorecard: MoU ≠ money delivered.
- _(ask and I'll generate:)_ DMK 2021-26 achievements baseline.

These also power the **Share Studio** (`/studio`) in the dashboard — pick a topic to
download a branded, sourced image + a ready caption, with a link back to the matching
pack here for the audio/video route.
