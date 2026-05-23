"""Public read-only API over the DMK announcements archive.

The 387 dmk.in achievements + 2177 CMO/DIPR tweets form a date-indexed
record of what the DMK government did 2021-2026. This is the substrate
for the credit-steal cross-reference AND the "DMK timeline" page on
the frontend.
"""
from fastapi import APIRouter, Query
from app.database import get_db
from typing import Optional

router = APIRouter(prefix="/dmk-archive", tags=["dmk-archive"])


@router.get("/timeline")
async def timeline(
    source: Optional[str] = None,       # dmk_website / cmo_tamil_nadu / tn_dipr / manual
    tag: Optional[str] = None,           # 'women_empowerment', 'roadways', 'governance' ...
    q: Optional[str] = None,             # free-text search in title/content
    year: Optional[int] = None,          # 2021..2026
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """Paginated list of DMK announcements. Default sort: newest first."""
    db = get_db()
    query = db.table("dmk_announcements").select(
        "id, source, source_url, announcement_date, title, content, "
        "media_urls, tags, scheme_name_hint"
    )

    if source:
        query = query.eq("source", source)
    if tag:
        query = query.contains("tags", [tag])
    if q:
        query = query.or_(f"title.ilike.*{q}*,content.ilike.*{q}*")
    if year:
        query = query.gte("announcement_date", f"{year}-01-01")
        query = query.lte("announcement_date", f"{year}-12-31")

    res = (
        query.order("announcement_date", desc=True)
             .range(offset, offset + limit - 1)
             .execute()
    )
    return res.data or []


@router.get("/stats")
async def archive_stats():
    """High-level numbers for the timeline page header."""
    db = get_db()
    out = {}
    for source in ("dmk_website", "cmo_tamil_nadu", "tn_dipr", "manual"):
        res = (
            db.table("dmk_announcements")
            .select("id", count="exact")
            .eq("source", source)
            .execute()
        )
        out[source] = res.count or 0

    # Top tags across all sources
    res = db.table("dmk_announcements").select("tags").limit(2000).execute()
    from collections import Counter
    tag_count: Counter = Counter()
    for row in res.data or []:
        for t in row.get("tags") or []:
            if t:
                tag_count[t] += 1
    out["top_tags"] = tag_count.most_common(20)
    out["total"] = sum(out[s] for s in ("dmk_website", "cmo_tamil_nadu", "tn_dipr", "manual"))
    return out
