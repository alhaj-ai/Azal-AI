"""supervisor_agent.py — Central Multi-Agent Orchestrator for Azal Store.

Coordinates requests and routes user inquiries to specialist agents:
1. Customer Agent (store info, products, shipping, payment)
2. Document Agent (invoice parsing & arithmetic verification)
3. Compliance Agent (monthly spend & vendor compliance)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.compliance_agent import run_compliance_agent
from agents.customer_agent import run_customer_agent
from api.llm_manager import chat_generate

SUPERVISOR_INSTRUCTIONS = """أنت المشرف المركزي متعدد الوكلاء لـ "منظومة آزال الذكية للتجارة والتجزئة (Azal AI)".
لديك ثلاثة وكلاء متخصصين:
1. وكيل خدمة العملاء: للاستفسار عن منتجات المتجر، خيارات الشحن لجميع المحافظات اليمنية، طرق الدفع المعتمدة (الكريمي، جيب، جوالي)، والعروض.
2. وكيل الفواتير والمستندات: لتدقيق فواتير التوريد واستخراج بياناتها.
3. وكيل الامتثال والتقارير المالية: لملخص الإنفاق الشهري ومتابعة الموردين.

مهمتك فهم رسالة المستخدم وتوجيهها بدقة، وتقديم الرد بلغة عربية فصحى موجزة ومهنية."""


def run_supervisor(message: str, thread_id: str | None = None) -> dict:
    """Intelligently route incoming query or synthesize response using Azal Store agents."""
    msg = message.strip().lower()

    # Detect compliance/monthly spend query
    if any(w in msg for w in ["امتثال", "تقرير شهري", "إنفاق", "الموردين", "مشتريات", "إجمالي الإنفاق"]):
        year = 2026
        month = 1
        m_match = re.search(r"شهر\s*(\d{1,2})", msg)
        if m_match:
            try:
                month = int(m_match.group(1))
            except Exception:
                pass
        comp_res = run_compliance_agent(year, month)
        return {
            "status": "ok",
            "response": comp_res.get("narrative") or "تم توليد تقرير الامتثال بنجاح.",
            "tools_called": ["ask_compliance_agent"],
            "thread_id": thread_id or "supervisor_session",
            "data": comp_res.get("structured"),
        }

    # Detect invoice/document query
    if any(w in msg for w in ["فاتورة", "فواتير", "pdf", "تدقيق فاتورة", "تحليل مستند"]):
        cust_res = run_customer_agent(message, thread_id)
        return {
            "status": "ok",
            "response": cust_res.get("answer"),
            "tools_called": ["ask_document_agent"],
            "thread_id": thread_id or "supervisor_session",
        }

    # Customer service & general assistance (Default)
    cust_res = run_customer_agent(message, thread_id)
    return {
        "status": "ok",
        "response": cust_res.get("answer"),
        "tools_called": ["ask_customer_agent"],
        "thread_id": thread_id or "supervisor_session",
    }


if __name__ == "__main__":
    reply = run_supervisor("هل يمكنني الدفع عبر بنك الكريمي؟")
    print("Supervisor reply:", reply)
