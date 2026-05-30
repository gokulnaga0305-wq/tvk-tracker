"""Provider-cost / usage diagnostics endpoint.

Exposes a single endpoint summarising:
  - Apify wallet balance + usage this billing cycle
  - Groq daily quota state (estimated from recent activity)
  - Provider chain currently configured

Used by the admin dashboard + a future low-balance alert cron. The
goal is to never again hit a silent free-tier exhaustion mid-day —
the user can see exactly how much runway is left.

No auth required for reads (no secrets in payload). Endpoint surface
intentionally read-only.
"""
from __future__ import annotations
import json
import logging
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


def _safe_call(url: str, timeout: int = 10) -> Optional[dict]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return {"_error": True, "code": e.code, "body": e.read().decode()[:200]}
        except Exception:
            return {"_error": True, "code": e.code}
    except Exception as e:
        return {"_error": True, "msg": f"{type(e).__name__}: {str(e)[:120]}"}


@router.get("/usage")
async def usage_summary() -> dict[str, Any]:
    """Top-line view of every paid/quota'd dependency.

    Returns a uniform shape so the admin dashboard widget can render
    a colored chip per provider (green=plenty, amber=running low,
    red=exhausted).
    """
    out: dict[str, Any] = {"checked_at": datetime.now(timezone.utc).isoformat()}

    # ---- Apify ---------------------------------------------------------
    apify_status: dict[str, Any] = {"configured": bool(settings.apify_api_token)}
    if settings.apify_api_token:
        me = _safe_call(
            f"https://api.apify.com/v2/users/me?token={settings.apify_api_token}"
        )
        if me and not me.get("_error"):
            data = me.get("data") or {}
            plan = data.get("plan") or {}
            apify_status.update({
                "username": data.get("username"),
                "plan": plan.get("id"),
                "paid": plan.get("id") != "FREE",
            })
            # Usage cycle — may 404 on FREE accounts
            cycle = _safe_call(
                f"https://api.apify.com/v2/users/me/limits?token={settings.apify_api_token}"
            )
            if cycle and not cycle.get("_error"):
                cdata = cycle.get("data") or {}
                apify_status["limits"] = {
                    "current_billing_period": cdata.get("currentBillingPeriod"),
                    "monthly_usage_credit_usd": cdata.get("monthlyUsageCreditUsd"),
                    "current_usage_usd": cdata.get("currentUsageUsd"),
                }
        else:
            apify_status["error"] = me

    out["apify"] = apify_status

    # ---- Groq (no usage endpoint — but we can record key presence) ----
    out["groq"] = {
        "configured": bool(settings.groq_api_key),
        "tier": "free (14,400 req/day, llama-3.3-70b-versatile)",
    }

    # ---- OpenRouter ---------------------------------------------------
    or_status: dict[str, Any] = {"configured": bool(settings.openrouter_api_key)}
    if settings.openrouter_api_key:
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/credits",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                body = json.loads(r.read())
                data = body.get("data") or {}
                or_status["credits_total_usd"] = data.get("total_credits")
                or_status["credits_used_usd"] = data.get("total_usage")
                if data.get("total_credits") is not None and data.get("total_usage") is not None:
                    or_status["credits_remaining_usd"] = round(
                        float(data["total_credits"]) - float(data["total_usage"]), 4
                    )
        except Exception as e:
            or_status["error"] = f"{type(e).__name__}: {str(e)[:120]}"

    out["openrouter"] = or_status

    # ---- Anthropic (no public usage API; just key presence) ----------
    out["anthropic_direct"] = {
        "configured": bool(settings.anthropic_api_key),
        "tier": "pay-as-you-go (no usage API exposed)",
    }

    # ---- Twitter-to-RSS bridge reachability from HF runtime ----------
    # Diagnoses why Nitter sources aren't producing output. If HF can
    # reach the bridges that work locally, the issue is parsing.
    # If HF cannot reach them, we need a different route.
    bridge_probes: dict[str, Any] = {}
    test_urls = [
        ("nitter.net",                 "https://nitter.net/sunnewstamil/rss"),
        ("nitter.privacydev.net",      "https://nitter.privacydev.net/sunnewstamil/rss"),
        ("nitter.poast.org",           "https://nitter.poast.org/sunnewstamil/rss"),
        ("rsshub.app",                 "https://rsshub.app/twitter/user/sunnewstamil"),
        ("twiiit.com",                 "https://twiiit.com/sunnewstamil/rss"),
        # Baseline — confirms outbound HTTP works at all
        ("github.com (baseline)",      "https://github.com"),
    ]
    import urllib.request as _ur, urllib.error as _ue
    for label, url in test_urls:
        try:
            req = _ur.Request(url, headers={"User-Agent": "TVKTracker/1.0"})
            with _ur.urlopen(req, timeout=8) as r:
                body = r.read(2000)
                bridge_probes[label] = {
                    "status": r.status,
                    "bytes":  len(body),
                    "is_feed": b"<rss" in body[:200].lower() or b"<feed" in body[:200].lower(),
                }
        except _ue.HTTPError as e:
            bridge_probes[label] = {"http_error": e.code}
        except Exception as e:
            bridge_probes[label] = {"error": f"{type(e).__name__}: {str(e)[:90]}"}
    out["twitter_rss_bridges"] = bridge_probes

    # ---- AI chain currently in use -----------------------------------
    from app.ingestion.ai_processor import _get_client_chain
    chain = _get_client_chain()
    out["ai_chain"] = [
        {"provider_index": i, "model": m, "base_url": str(c.base_url).rstrip("/")}
        for i, (c, m) in enumerate(chain)
    ]
    out["ai_chain_count"] = len(chain)

    return out
