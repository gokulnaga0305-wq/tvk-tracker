# TVK Files — Fact-Check Protocol

The standard every debunk on the dashboard must meet. The whole point is to be
**un-debunkable**: a verdict ships only when the evidence supports it, the other
side's true points are conceded, and what-would-change-our-mind is stated.

Backend: the canonical store is the `fact_checks` table (migration 025). Every
debunk — whether it comes from YouTurn, a watched handle, the Copilot, or a
manual add — is normalised into one `fact_checks` row that carries this protocol.

---

## A. Verdict ladder (exactly one per claim)

| Verdict | Meaning |
|---|---|
| `true` | The claim holds up. |
| `mostly_true` | Substantially true with a minor caveat. |
| `misleading` | Literally true but framed to deceive; needs context. |
| `false` | The claim is false. |
| `unproven` | Alleged, but no evidence either way — *not* the same as false. |
| `credit_steal` | Real work, wrongly attributed (DMK-era work claimed as TVK's). |
| `manufactured_first` | A false "first / only" superlative. |
| `fabricated` | Doctored media, fake quote, or invented event. |

A claim we *cannot* tie to evidence is `unproven` — we never upgrade it to
`false` just because we doubt it (and never to `true` because we like it).

## B. Evidence tier (1 = strongest) — gates publication

| Tier | Evidence | Publish? |
|---|---|---|
| **1** | Primary source — govt GO / official document / audited data | ✅ |
| **2** | A named official on the record | ✅ |
| **3** | Two or more established outlets | ✅ |
| **4** | A single outlet | ⚠️ publish only with the tier stated |
| **5** | Social-media post only (a lone screenshot/claim) | ❌ hold — corroborate first |

Worked examples:
- *"Hostel non-veg meals are a new TVK scheme"* → the 2022 & 2023 GOs are **Tier 1** → `credit_steal`, publish.
- *A lone screenshot of an approval list rebutting Vembu* → **Tier 5** → hold; do not publish as a verdict until corroborated.

## C. The honest-caveat rule (mandatory on every row)

1. **`concedes`** — state the other side's true points / what's genuine. (A debunk that concedes nothing is a red flag.)
2. **`what_would_change`** — what evidence would flip the verdict. Required for `unproven`; encouraged for all.
3. Never hide an inconvenient fact; surface it and explain why it doesn't change the verdict.

## D. Confidence

`confidence` (0–1) is a function of the evidence tier and corroboration. Shown on
every card so readers calibrate. Tier 1–2 ≈ 0.85–0.97; Tier 3 ≈ 0.7–0.85;
Tier 4 ≈ 0.5–0.7; Tier 5 is held, not published.

## E. Workflow

```
claim captured ─▶ status='new'
   (YouTurn import · watched-handle candidate · Copilot draft · manual)
        │ assign verdict + evidence_tier + sources + concedes + what_would_change
        ▼
   status='verified'  ── meets Tier 1–4 and the caveat rule? ──▶ status='published'
        │ no (Tier 5 / fails caveat rule)
        ▼
   stays 'new' / 'rejected' — never shown publicly
```

The Copilot (`app/factcheck/pipeline.py`) is the **drafting** tool: it proposes a
verdict + evidence; a human signs off before `published`. Nothing auto-publishes
at Tier 5.

## F. Provenance

Every row records `origin` (`youturn` / `tweet_watch` / `copilot` / `propaganda_event`
/ `credit_steal` / `manual`) and `origin_id`, so each verdict traces to its source
and the sync stays idempotent.

## G. The claim ladder (which *kind* of statement is this?)

Adapted from booth-level election-forensics discipline. Before publishing, name
the rung — most bad-faith arguments work by silently promoting a lower rung to a
higher one ("the numbers moved" → "they rigged it").

| Rung | Statement | Publish as |
|---|---|---|
| 1 · **Observed** | Directly in the source (a GO exists, a figure in the audited report, a quote on record). | A fact. Tier 1–2. |
| 2 · **Inferred** | A pattern the data *supports* but doesn't state (a correlation, an ecological estimate). | Only when labelled as inference — never as fact. |
| 3 · **Causal** | "X *caused* Y." | Only with a named decision/actor + a plausible mechanism. Co-occurrence ≠ cause. |
| 4 · **Speculation** | Plausible, motivated, unevidenced. | Never — it decides what to *investigate*, nothing more. |

Two enforcing rules:
- **Adversarial review** — argue the strongest case *against* your own conclusion
  before it ships (this is the `what_would_change` field, used as a red-team step).
- **Scripts compute, humans decide** — no automated score (image detector,
  fact-check match, anomaly flag) is published as a finding on its own.

Worked application: *"the 2026 result was rigged"* is rung 3–4 with no primary
evidence in hand → **not published**. *"DMK's vote share fell most in X"* is
rung 1 (observed) → fine. The method tells us where to stop.
