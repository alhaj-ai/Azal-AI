# batch_extract.py
"""Run the Document Agent over all invoice PDFs and persist results to local storage.

Reads:  data/invoices/*.pdf
Writes: storage/invoices_extracted/{YYYY}/{MM}/{invoice_id}.json

Per-invoice failures (rejected PII, extraction errors) are logged and skipped;
the batch continues. A final summary reports successes, refusals, and errors.
"""
import datetime as dt
import sys
import traceback
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Make sibling packages importable
sys.path.insert(0, str(Path(__file__).parent))
from agents.document_agent import run_document_agent
from storage.invoice_store import save_extraction

INVOICE_DIR = Path("data/invoices")


def _to_iso_date(value) -> str:
    """Coerce Content Understanding's invoice_date into an ISO string.

    Handles datetime.date, datetime.datetime, and already-ISO strings.
    """
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat() if isinstance(value, dt.datetime) else value.isoformat()
    if isinstance(value, str):
        # Trust it if it parses; raise loudly if it doesn't.
        dt.date.fromisoformat(value[:10])
        return value
    raise TypeError(f"Cannot coerce {type(value).__name__} to ISO date: {value!r}")


def main():
    pdfs = sorted(INVOICE_DIR.glob("invoice_*.pdf"))
    if not pdfs:
        print(f"No invoices found in {INVOICE_DIR}")
        sys.exit(1)

    print(f"Found {len(pdfs)} invoice(s). Starting batch...\n")

    successes = []
    refusals = []
    errors = []

    for pdf_path in pdfs:
        invoice_id = pdf_path.stem  # "invoice_01" from "invoice_01.pdf"
        print(f"→ {pdf_path.name}")

        try:
            result = run_document_agent(pdf_path)
        except Exception as e:
            errors.append((invoice_id, f"agent crashed: {e}"))
            traceback.print_exc()
            print()
            continue

        if result["status"] == "rejected_pii":
            refusals.append((invoice_id, result["reason"]))
            print(f"   ⛔ refused (PII): {result['reason']}\n")
            continue

        extracted = result["data"]
        extracted["source_invoice_id"] = invoice_id  # clean ID for downstream consumers

        try:
            iso_date = _to_iso_date(extracted["invoice_date"])
            
        except (KeyError, TypeError, ValueError) as e:
            errors.append((invoice_id, f"date coercion failed: {e}"))
            print(f"   ✗ date error: {e}\n")
            continue

        try:
            blob_path = save_extraction(
                invoice_id=invoice_id,
                extraction=extracted,
                invoice_date=iso_date,
            )
        except Exception as e:
            errors.append((invoice_id, f"blob write failed: {e}"))
            print(f"   ✗ storage error: {e}\n")
            continue

        successes.append((invoice_id, blob_path))
        val_status = "PASS" if extracted["validation"]["valid"] else "FAIL"
        print(f"   ✓ saved → {blob_path}   (VAT: {val_status})\n")

    # --- Summary ---
    print("=" * 60)
    print(f"Batch complete: "
          f"{len(successes)} saved, "
          f"{len(refusals)} refused, "
          f"{len(errors)} errors")
    print("=" * 60)

    if refusals:
        print("\nRefusals:")
        for inv_id, reason in refusals:
            print(f"  • {inv_id}: {reason}")

    if errors:
        print("\nErrors:")
        for inv_id, msg in errors:
            print(f"  • {inv_id}: {msg}")


if __name__ == "__main__":
    main()