"""Coordinate-based Form 20 parser for the borderless template + auto-offset.

The borderless Form 20 template has no line-borders, so pdfplumber's line-based
table parser produces phantom columns. We instead reconstruct the grid from the
positions of the numeric words:
  1. find DATA rows (>= 8 numbers, leftmost is a booth serial) on every page —
     ignoring header/title pages that would pollute column detection,
  2. cluster their x-centres into columns (consistent across all pages),
  3. map each data row's words into those columns.
Then candidate_block() finds the candidate span by the rule that the Total-Valid
column equals the sum of the contiguous vote columns before it — choosing the
WIDEST such span, so it locks onto candidates (12 cols) not the totals (2 cols),
and skips the leading serial / duplicate-serial columns automatically.
"""
from __future__ import annotations
from collections import defaultdict
import pdfplumber


def _is_num(t):
    t = t.replace(",", "").strip()
    return t.lstrip("-").isdigit()


def _is_header(vals):
    """A candidate-numbering header row: values run 1,2,3,... (diff of +1)."""
    seq = sum(1 for i in range(1, min(8, len(vals))) if vals[i] == vals[i - 1] + 1)
    return seq >= 5


def parse_coord(path):
    """-> list[(booth_no, [col0, col1, ...])]. Columns clustered by word RIGHT
    EDGE (numbers are right-aligned, so widths don't fragment columns)."""
    data_rows = []
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            rows = defaultdict(list)
            for w in pg.extract_words():
                if _is_num(w["text"]):
                    rows[round(w["top"] / 4.0)].append(w)
            for rw in rows.values():
                rw = sorted(rw, key=lambda w: w["x1"])
                if len(rw) < 8:
                    continue
                vals = [int(w["text"].replace(",", "")) for w in rw]
                if not (1 <= vals[0] <= 5000) or _is_header(vals):
                    continue
                data_rows.append([(w["x1"], v) for w, v in zip(rw, vals)])
    if not data_rows:
        return []
    # global column right-edges from data rows only
    xs = sorted(x for r in data_rows for x, _ in r)
    edges, cur = [], [xs[0]]
    for x in xs[1:]:
        if x - cur[-1] > 9:
            edges.append(sum(cur) / len(cur)); cur = [x]
        else:
            cur.append(x)
    edges.append(sum(cur) / len(cur))

    out, seen = [], set()
    for r in data_rows:
        vec = [0] * len(edges)
        for x, val in r:
            ci = min(range(len(edges)), key=lambda i: abs(edges[i] - x))
            if vec[ci] == 0:
                vec[ci] = val
        bn = vec[0]
        if 1 <= bn <= 5000 and bn not in seen and sum(vec[1:]) > 0:
            seen.add(bn); out.append((bn, vec))
    return out


def candidate_block(col_sums, min_width=2):
    """(start, total_valid_col): total-valid == sum of the contiguous vote
    columns before it; pick the WIDEST span at least `min_width` columns wide.
    Pass min_width=ncand to reject narrow 'totals' blocks (valid+rejected=total)."""
    n = len(col_sums)
    best = None
    for t in range(n - 1, 1, -1):
        if col_sums[t] <= 0:
            continue
        s = 0
        for k in range(t - 1, -1, -1):
            s += col_sums[k]
            if s == col_sums[t] and t - k >= min_width:
                if best is None or (t - k) > (best[1] - best[0]):
                    best = (k, t)
                break
            if s > col_sums[t]:
                break
    return best
