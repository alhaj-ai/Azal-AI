# storage/aggregates.py
"""Deterministic monthly aggregates over persisted invoice extractions.

This module does no LLM reasoning — pure Python over the JSON blobs
written by batch_extract. ComplianceAgent consumes the output as a
function tool. Separating the math here makes it independently testable
and keeps the agent's job to narrative generation.
"""
import unicodedata
from collections import Counter, defaultdict
from statistics import median

from storage.invoice_store import list_extractions_for_month


# Map Persian/Urdu-script variants that often appear in Arabic OCR/PDF pipelines
# back to their canonical Arabic forms. This is the standard normalization set
# for Arabic NLP — same characters MS Word's Arabic spellchecker normalizes.
ARABIC_NORMALIZATION = {
    "\u06CC": "\u064A",  # Persian Yeh ی → Arabic Yeh ي
    "\u06A9": "\u0643",  # Persian Kaf ک → Arabic Kaf ك
    "\u0649": "\u064A",  # Alef Maksura ى → Yeh ي  (controversial; keeps grouping clean)
    "\u0640": "",        # Tatweel (kashida) ـ → remove
}


def normalize_arabic(text):
    """Normalize Arabic text for grouping: Persian variants → Arabic, NFKC.

    This is purely for matching/aggregation. Original strings remain in
    the underlying blob data unchanged — we just compare on the normalized
    form when bucketing by vendor.
    """
    if not isinstance(text, str):
        return text
    # Apply character substitutions
    for src, dst in ARABIC_NORMALIZATION.items():
        text = text.replace(src, dst)
    # Unicode NFKC handles ligatures, presentation forms, etc.
    text = unicodedata.normalize("NFKC", text)
    # Collapse whitespace
    text = " ".join(text.split())
    return text


def compute_monthly_aggregates(year: int, month: int) -> dict:
    """Compute aggregate statistics for a given month's invoices.

    Returns a dict with:
        period:              "YYYY-MM"
        invoice_count:       int
        total_spend:         float (sum of totals, SAR)
        vendor_breakdown:    {vendor_name: {count, spend}}
        validation_failures: list of {invoice_id, issues}
        median_invoice:      float (median total, SAR)
        largest_invoice:     {invoice_id, vendor_name, total}
        is_empty:            bool (true if no invoices found)
    """
    extractions = list_extractions_for_month(year, month)
    period = f"{year:04d}-{month:02d}"

    if not extractions:
        return {
            "period": period,
            "invoice_count": 0,
            "total_spend": 0.0,
            "vendor_breakdown": {},
            "validation_failures": [],
            "median_invoice": 0.0,
            "largest_invoice": None,
            "is_empty": True,
        }

    # Per-vendor accumulation
    vendor_spend = defaultdict(float)
    vendor_count = Counter()
    totals = []
    failures = []
    largest = {"invoice_id": None, "vendor_name": None, "total": 0.0}

    for ext in extractions:
        raw_vendor = ext.get("vendor_name") or "غير معروف"
        vendor = normalize_arabic(raw_vendor)
        total = float(ext.get("total") or ext.get("total_amount") or 0.0)

        vendor_spend[vendor] += total
        vendor_count[vendor] += 1
        totals.append(total)

        if total > largest["total"]:
            largest = {
                "invoice_id": ext.get("source_invoice_id") or ext.get("invoice_id"),  # clean ID
                "vendor_name": vendor,
                "total": total,
            }

        validation = ext.get("validation") or ext.get("vat_validation") or {}
        if not validation.get("valid", True):
            failures.append({
                "invoice_id": ext.get("source_invoice_id") or ext.get("invoice_id"),
                "vendor_name": vendor,
                "issues": validation.get("issues", []),
            })

    vendor_breakdown = {
        vendor: {
            "count": vendor_count[vendor],
            "spend": round(spend, 2),
        }
        for vendor, spend in vendor_spend.items()
    }

    return {
        "period": period,
        "invoice_count": len(extractions),
        "total_spend": round(sum(totals), 2),
        "vendor_breakdown": vendor_breakdown,
        "validation_failures": failures,
        "median_invoice": round(median(totals), 2),
        "largest_invoice": largest,
        "is_empty": False,
    }


def compare_to_prior_month(year: int, month: int) -> dict:
    """Compare a month's aggregates to the immediately prior month.

    Returns a comparison dict, or {available: False} if the prior month
    has no data (so the agent knows not to mention deltas).
    """
    current = compute_monthly_aggregates(year, month)
    if current["is_empty"]:
        return {"available": False, "reason": "current_month_empty"}

    prior_year, prior_month = (year - 1, 12) if month == 1 else (year, month - 1)
    prior = compute_monthly_aggregates(prior_year, prior_month)
    if prior["is_empty"]:
        return {"available": False, "reason": "prior_month_empty"}

    spend_delta = current["total_spend"] - prior["total_spend"]
    spend_pct = (spend_delta / prior["total_spend"] * 100) if prior["total_spend"] else 0.0

    # Vendor-level deltas
    vendor_changes = []
    all_vendors = set(current["vendor_breakdown"]) | set(prior["vendor_breakdown"])
    for vendor in all_vendors:
        cur_spend = current["vendor_breakdown"].get(vendor, {}).get("spend", 0.0)
        prior_spend = prior["vendor_breakdown"].get(vendor, {}).get("spend", 0.0)
        delta = cur_spend - prior_spend
        if prior_spend == 0 and cur_spend > 0:
            change_pct = None  # new vendor
            status = "new"
        elif cur_spend == 0 and prior_spend > 0:
            change_pct = None  # vendor dropped
            status = "dropped"
        else:
            change_pct = (delta / prior_spend * 100) if prior_spend else 0.0
            status = "changed"
        vendor_changes.append({
            "vendor_name": vendor,
            "prior_spend": round(prior_spend, 2),
            "current_spend": round(cur_spend, 2),
            "delta": round(delta, 2),
            "change_pct": round(change_pct, 1) if change_pct is not None else None,
            "status": status,
        })

    return {
        "available": True,
        "prior_period": prior["period"],
        "current_period": current["period"],
        "prior_spend": prior["total_spend"],
        "current_spend": current["total_spend"],
        "spend_delta": round(spend_delta, 2),
        "spend_change_pct": round(spend_pct, 1),
        "prior_invoice_count": prior["invoice_count"],
        "current_invoice_count": current["invoice_count"],
        "vendor_changes": vendor_changes,
    }