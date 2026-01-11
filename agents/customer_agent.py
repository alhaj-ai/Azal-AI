"""customer_agent.py — Azal Store Customer Service Agent with Local/Cloud LLM.

Responds to customer queries about authentic Yemeni products (Royal Do'ani honey,
Yafai/Matari coffee, silver crafts), shipping to all Yemeni governorates,
and local payment methods (Kuraimi, Jeeb, Jawwali, OneCash, Cash on Delivery).
"""
import re
import sys
from pathlib import Path
from threading import Lock

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.llm_manager import chat_generate

INSTRUCTIONS = """أنت مساعد خدمة عملاء لـ "متجر آزال"، براند تجارة إلكترونية وتجزئة يمني رائد.

قواعدك:
- أجب باللغة العربية الفصحى دائماً، بأسلوب ودود ومهني ومحترم.
- المنتجات: العسل الطبيعي المضمون (دوعني، عصيمي)، البن اليمني الفاخر (يافعي، مطري، حرازي)، الفضيات والعقيق، وسلال الهدايا.
- الشحن: توصيل سريع داخل صنعاء وعدن خلال 24 ساعة، وشحن لكافة المحافظات خلال 48 ساعة.
- الدفع: بنك الكريمي، محفظة جيب، جوالي، ون كاش، والدفع عند الاستلام.
- إذا لم تجد إجابة واضحة، اقترح على العميل التواصل مع خدمة عملاء متجر آزال عبر الواتساب: +967 770 000 000.
- اجعل إجاباتك موجزة ومباشرة في 2 إلى 4 جمل."""

_agent_lock = Lock()


def run_customer_agent(question: str, thread_id: str | None = None) -> dict:
    """Run the Azal customer agent using the configured local/cloud LLM."""
    # First try dynamic generation through LLM Manager (e.g. LM Studio / Local GPU / Cloud)
    llm_reply = chat_generate(INSTRUCTIONS, question)
    if llm_reply and not llm_reply.startswith("خطأ في الاتصال"):
        return {
            "status": "ok",
            "answer": llm_reply,
            "citations": ["دليل_متجر_آزال.md", "سياسة_الشحن_والتوصيل_المحلي.md"],
            "thread_id": thread_id or "session_local",
        }

    # Fallback to local rule-based answers
    q = question.lower()
    if any(w in q for w in ["شحن", "توصيل", "محافظ", "صنعاء", "عدن", "حضرموت", "مأرب"]):
        ans = "نوفر في متجر آزال خدمة التوصيل السريع داخل العاصمة صنعاء وعدن خلال 24 ساعة، مع شحن لجميع المحافظات اليمنية (تعز، إب، حضرموت، الحديدة، مأرب) خلال 48 ساعة عبر شركاء الشحن المعتمدين."
        citations = ["سياسة_الشحن_والتوصيل_المحلي.md"]
    elif any(w in q for w in ["دفع", "تحويل", "كريمي", "فلوس", "جيب", "سداد", "كاش"]):
        ans = "نقبل السداد عبر شبكات التحويل والصرافة المعتمدة في اليمن (حساب الكريمي، تطبيق جيب، محفظة جوالي، ون كاش) مع إمكانية الدفع عند الاستلام داخل المدن الرئيسية."
        citations = ["طرق_الدفع_والتحويلات.md"]
    elif any(w in q for w in ["عسل", "بن", "يافعي", "دوعني", "منتج", "عروض", "سلة"]):
        ans = "يقدم متجر آزال باقة متميزة من المنتجات اليمنية الأصيلة: العسل الدوعني والعصيمي الملكي، البن اليافعي والمطري الفاخر، إلى جانب تشكيلة واسعة من بضائع التجزئة والهدايا مع ضمان الجودة 100%."
        citations = ["دليل_المنتجات_والعروض.md"]
    else:
        ans = f"أهلاً بك في متجر آزال للتجارة الإلكترونية والتجزئة. بخصوص استفسارك: '{question}'، يسعدنا تزويدك بكافة التفاصيل عبر خدمة العملاء أو متابعة طلبك مباشرة."
        citations = ["دليل_متجر_آزال.md"]

    return {
        "status": "ok",
        "answer": ans,
        "citations": citations,
        "thread_id": thread_id or "session_local",
    }
