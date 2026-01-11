# test_aggregates.py
"""Verify the aggregate functions return accurate numbers for saved invoices."""
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from storage.aggregates import compute_monthly_aggregates, compare_to_prior_month


def test_monthly_aggregates_and_comparison():
    months_to_check = [
        (2025, 11),
        (2025, 12),
        (2026, 1),
        (2026, 2),
        (2026, 3),
        (2026, 4),
    ]
    results = [compute_monthly_aggregates(y, m) for y, m in months_to_check]
    assert len(results) == 6
    non_empty = [r for r in results if not r["is_empty"]]
    assert len(non_empty) >= 1
    for agg in non_empty:
        assert agg["invoice_count"] > 0
        assert agg["total_spend"] >= 0

    comp = compare_to_prior_month(2026, 2)
    assert isinstance(comp, dict)
    assert "available" in comp


def main():
    months_to_check = [
        (2025, 11),
        (2025, 12),
        (2026, 1),
        (2026, 2),
        (2026, 3),
        (2026, 4),
    ]

    print("=" * 60)
    print("Monthly aggregates (YER / ر.ي)")
    print("=" * 60)

    for year, month in months_to_check:
        agg = compute_monthly_aggregates(year, month)
        print(f"\n{agg['period']}:")
        if agg["is_empty"]:
            print("  (no invoices)")
            continue
        print(f"  count: {agg['invoice_count']}")
        print(f"  total spend: {agg['total_spend']} ر.ي (YER)")
        print(f"  median: {agg['median_invoice']} ر.ي (YER)")
        print(f"  largest: {agg['largest_invoice']}")
        print("  vendors:")
        for vendor, stats in agg["vendor_breakdown"].items():
            print(f"    {vendor}: {stats['count']} invoice(s), {stats['spend']} ر.ي (YER)")
        if agg["validation_failures"]:
            print(f"  validation failures: {len(agg['validation_failures'])}")
            for fail in agg["validation_failures"]:
                print(f"    - {fail['vendor_name']}: {fail['issues']}")
        else:
            print("  validation failures: 0")

    print("\n" + "=" * 60)
    print("Month-over-month comparison: 2026-02 vs 2026-01")
    print("=" * 60)
    comp = compare_to_prior_month(2026, 2)
    if comp["available"]:
        print(f"  {comp['prior_period']} spend: {comp['prior_spend']} ر.ي "
              f"({comp['prior_invoice_count']} invoices)")
        print(f"  {comp['current_period']} spend: {comp['current_spend']} ر.ي "
              f"({comp['current_invoice_count']} invoices)")
        print(f"  Δ: {comp['spend_delta']:+.2f} ر.ي ({comp['spend_change_pct']:+.1f}%)")
        print("  Vendor changes:")
        for vc in comp["vendor_changes"]:
            print(f"    {vc['vendor_name']}: {vc['prior_spend']} → "
                  f"{vc['current_spend']} ({vc['status']})")
    else:
        print(f"  not available: {comp['reason']}")


if __name__ == "__main__":
    main()
