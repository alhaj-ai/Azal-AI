"""validate_vat.py — General Store Invoice & Tax Verification Engine.

Validates commercial supplier invoices, mathematical integrity, line items,
and tax compliance for Azal Store and modern retail operations.
Supports customizable tax rates (0% exempt, 5%, 15%) and dynamic currencies.
"""
from typing import Optional

RATE_TOLERANCE = 0.005    # ±0.5% allowed for rounding
AMOUNT_TOLERANCE = 0.50   # tolerance allowed on arithmetic rounding


def validate_vat(
    subtotal: float,
    vat_amount: Optional[float],
    total: float,
    expected_rate: Optional[float] = None,
    currency: str = "ر.ي",
) -> dict:
    """Verify commercial invoice arithmetic and tax calculation.

    Args:
        subtotal: Amount before tax/surcharges.
        vat_amount: Tax or VAT charged (can be 0.0 or None for exempt/direct invoices).
        total: Final amount printed on the invoice.
        expected_rate: Expected tax rate as decimal (e.g. 0.15 or 0.0). If None, rate is not enforced strictly.
        currency: Store currency label (e.g. "ر.ي", "ر.س", "$").

    Returns:
        {
            "valid": bool,
            "issues": list of human-readable issue strings,
            "calculated_rate": float,
            "expected_total": float,
        }
    """
    issues = []

    # Defensive check on subtotal
    if subtotal is None or subtotal <= 0:
        return {
            "valid": False,
            "issues": ["لا يمكن التحقق من الفاتورة بدون قيمة المجموع قبل الضريبة (قيمة المجموع مفقودة أو غير صالحة)"],
            "calculated_rate": None,
            "expected_total": None,
        }

    # Tax verification
    if vat_amount is None:
        calculated_rate = 0.0
    else:
        calculated_rate = vat_amount / subtotal if subtotal > 0 else 0.0
        if expected_rate is not None:
            if abs(calculated_rate - expected_rate) > RATE_TOLERANCE:
                issues.append(
                    f"نسبة الضريبة المحسوبة ({calculated_rate*100:.1f}%) تختلف عن النسبة المعتمدة ({expected_rate*100:.1f}%)"
                )

    # Arithmetic check: subtotal + vat == total
    if total is None:
        issues.append("قيمة الإجمالي النهائي غير موجودة على الفاتورة")
        expected_total = None
    else:
        actual_vat = vat_amount if vat_amount is not None else 0.0
        expected_total = subtotal + actual_vat
        if abs(total - expected_total) > AMOUNT_TOLERANCE:
            diff = total - expected_total
            issues.append(
                f"خطأ حسابي في الفاتورة: الإجمالي المتوقع {expected_total:,.2f} {currency} لكن المطبوع {total:,.2f} {currency} (فرق {diff:+,.2f} {currency})"
            )

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "calculated_rate": round(calculated_rate, 4),
        "expected_total": round(expected_total, 2) if expected_total is not None else None,
    }


if __name__ == "__main__":
    # Test valid wholesale Azal invoice
    print("Azal Wholesale Invoice (Tax-free/Wholesale):")
    print(validate_vat(2850000.0, 0.0, 2850000.0, expected_rate=0.0, currency="ر.ي"))

    # Test arithmetic error
    print("\nArithmetic error test:")
    print(validate_vat(50000.0, 0.0, 55000.0, currency="ر.ي"))
