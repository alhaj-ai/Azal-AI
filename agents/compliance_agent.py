"""compliance_agent.py — Azal Store Financial & Supplier Compliance Agent.

Reads persisted invoice extractions from local storage, computes deterministic
monthly aggregates, and produces an executive narrative summary with vendor
breakdowns and invoice anomaly checks.
"""
import json
import sys
from pathlib import Path

# Make sibling packages importable when running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.llm_manager import chat_generate
from storage.aggregates import compute_monthly_aggregates, compare_to_prior_month
from storage.invoice_store import list_extractions_for_month

INSTRUCTIONS = """أنت المحلل المالي والرقابي لـ "متجر آزال للتجارة والتجزئة".
مهمتك تقديم تقرير تنفيذي موجز، دقيق، ومهني باللغة العربية الفصحى حول أداء فواتير التوريد والإنفاق الشهري، ونصيب الموردين، وتغيرات الإنفاق مقارنة بالشهر السابق.
اجعل تقريرك في نقاط مركزة ومفيدة لمدير المتجر."""


def run_compliance_agent(year: int, month: int) -> dict:
    """Run compliance reporting for a given period using local aggregates and LLM synthesis."""
    aggregates = compute_monthly_aggregates(year, month)
    comparison = compare_to_prior_month(year, month)

    if aggregates.get("is_empty"):
        return {
            "status": "ok",
            "structured": aggregates,
            "comparison": comparison,
            "narrative": f"لا توجد فواتير مسجلة في مستودع المتجر للفترة {year:04d}-{month:02d}."
        }

    # Prompt LLM to produce the Arabic executive summary
    prompt = f"""بيانات التقرير المالي لمتجر آزال لشهر ({aggregates.get('period')}):
- عدد الفواتير: {aggregates.get('invoice_count')}
- إجمالي الإنفاق: {aggregates.get('total_spend'):,}
- متوسط الفاتورة: {aggregates.get('median_invoice'):,}
- أكبر مورد: {aggregates.get('largest_invoice', {}).get('vendor_name', '—')} بمبلغ {aggregates.get('largest_invoice', {}).get('total', 0):,}
- تفصيل الموردين: {json.dumps(aggregates.get('vendor_breakdown', {}), ensure_ascii=False)}
- عدد المخالفات أو الفروقات: {len(aggregates.get('validation_failures', []))}
- المقارنة مع الشهر السابق: {json.dumps(comparison, ensure_ascii=False)}

المطلوب: اكتب ملخصاً تنفيذياً مهنياً وموجزاً (في 4 إلى 6 نقاط واضحة) لمدير متجر آزال يوضح أداء المشتريات والتوريد وحالة الامتثال المالي."""

    llm_narrative = chat_generate(INSTRUCTIONS, prompt)
    if not llm_narrative or llm_narrative.startswith("خطأ في الاتصال"):
        # Deterministic fallback narrative
        llm_narrative = f"""• بلغ إجمالي الإنفاق على مشتريات وتوريدات متجر آزال خلال شهر {aggregates.get('period')} مبلغ {aggregates.get('total_spend'):,} عبر {aggregates.get('invoice_count')} فواتير توريد.
• تصدر المورد ({aggregates.get('largest_invoice', {}).get('vendor_name')}) قائمة التوريدات بقيمة {aggregates.get('largest_invoice', {}).get('total', 0):,}.
• حالة الامتثال المالي: تم تدقيق العمليات الحسابية لكافة الفواتير ومطابقتها للمعايير التجارية بنجاح مع تسجيل {len(aggregates.get('validation_failures', []))} ملاحظات."""

    return {
        "status": "ok",
        "structured": aggregates,
        "comparison": comparison,
        "narrative": llm_narrative,
    }


if __name__ == "__main__":
    report = run_compliance_agent(2026, 1)
    print("Report Status:", report["status"])
    print("Narrative:\n", report.get("narrative"))
