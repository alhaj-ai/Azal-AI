# test_storage.py
"""Smoke & unit test for storage/invoice_store.py — verifies round-trip save and list."""
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from storage.invoice_store import save_extraction, list_extractions_for_month


def test_storage_round_trip():
    fake_extraction = {
        "invoice_id": "TEST-0001",
        "vendor_name": "مناحل وادي دوعن",
        "vendor_tax_id": "700102030",
        "currency": "YER",
        "invoice_date": "2025-11-15",
        "subtotal": 100.00,
        "vat_amount": 0.00,
        "total": 100.00,
        "line_items": [
            {"description": "عسل دوعني سدر ملكي", "quantity": 1, "unit_price": 100.00}
        ],
    }
    blob_path = save_extraction(
        invoice_id="TEST-0001",
        extraction=fake_extraction,
        invoice_date="2025-11-15",
    )
    assert blob_path is not None
    extractions = list_extractions_for_month(2025, 11)
    test_ext = next((e for e in extractions if e["invoice_id"] == "TEST-0001"), None)
    assert test_ext is not None
    assert test_ext["vendor_name"] == "مناحل وادي دوعن"
    assert test_ext["total"] == 100.00


def main():
    test_storage_round_trip()
    print("✓ Arabic vendor name and numeric fields preserved (UTF-8 round-trip works)")


if __name__ == "__main__":
    main()
