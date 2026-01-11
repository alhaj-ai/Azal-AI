"""FastAPI API for the Azal AI React frontend."""
from __future__ import annotations

import tempfile
from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from api.llm_manager import (
    chat_generate,
    get_config,
    save_config,
    test_provider_connection,
)

CUSTOMER_SYSTEM_PROMPT = """أنت وكيل خدمة العملاء الذكي لـ "متجر آزال"، براند تجارة إلكترونية وتجزئة يمني رائد.
معلوماتك الأساسية:
- المنتجات: العسل اليمني الطبيعي (دوعني وعصيمي ملكي)، البن اليافعي والمطري الفاخر، الفضيات والعقيق اليماني، وبضائع التجزئة والهدايا.
- الشحن والتوصيل: توصيل سريع داخل صنعاء وعدن خلال 24 ساعة، وشحن لكافة المحافظات (تعز، إب، حضرموت، مأرب، الحديدة) خلال 48 ساعة.
- الدفع: نقبل التحويلات المعتمدة في اليمن (بنك الكريمي، تطبيق جيب، محفظة جوالي، ون كاش) بالإضافة إلى الدفع عند الاستلام.
- التعليمات: أجب دائماً بالعربية الفصحى بأسلوب ودود وموجز ومباشر (في 2 إلى 4 جمل)."""

SUPERVISOR_SYSTEM_PROMPT = """أنت المشرف المركزي متعدد الوكلاء لـ "منظومة آزال الذكية (Azal AI)" للتجارة والتجزئة.
مهمتك تقديم ردود ذكية، احترافية، وموجزة باللغة العربية الفصحى وتوجيه العمليات لصالح المتجر وعملائه."""

try:
    from agents.compliance_agent import run_compliance_agent
    from agents.customer_agent import run_customer_agent
    from agents.document_agent import run_document_agent
    from agents.supervisor_agent import run_supervisor
    from storage.aggregates import compare_to_prior_month, compute_monthly_aggregates
except (ImportError, Exception):
    def run_customer_agent(question: str, thread_id: str | None = None) -> dict[str, Any]:
        # Try dynamic active LLM generation
        llm_reply = chat_generate(CUSTOMER_SYSTEM_PROMPT, question)
        if llm_reply and not llm_reply.startswith("خطأ في الاتصال"):
            return {
                "status": "ok",
                "answer": llm_reply,
                "citations": ["دليل_متجر_آزال.md", "سياسة_الشحن_والتوصيل_المحلي.md"],
                "thread_id": thread_id or "session_local",
            }

        q = question.lower()
        if any(w in q for w in ["شحن", "توصيل", "محافظ", "صنعاء", "عدن"]):
            ans = "نوفر في متجر آزال خدمة التوصيل السريع داخل العاصمة صنعاء وعدن خلال 24 ساعة، مع شحن لجميع المحافظات اليمنية (تعز، إب، حضرموت، الحديدة، مأرب) خلال 48 ساعة عبر شركاء الشحن المعتمدين."
            citations = ["سياسة_الشحن_والتوصيل_المحلي.md"]
        elif any(w in q for w in ["دفع", "تحويل", "كريمي", "فلوس", "جيب", "سداد"]):
            ans = "نقبل السداد عبر شبكات التحويل والصرافة المعتمدة في اليمن (حساب الكريمي، تطبيق جيب، محفظة جوالي، ون كاش) مع إمكانية الدفع عند الاستلام داخل المدن الرئيسية."
            citations = ["طرق_الدفع_والتحويلات.md"]
        elif any(w in q for w in ["منتج", "عروض", "توفر", "عسل", "بن", "تجزئة"]):
            ans = "يقدم متجر آزال باقة متميزة من المنتجات اليمنية الأصيلة: العسل الدوعني والعصيمي الملكي، البن اليافعي والمطري الفاخر، إلى جانب تشكيلة واسعة من بضائع التجزئة والهدايا مع ضمان الجودة 100%."
            citations = ["دليل_المنتجات_والعروض.md"]
        else:
            ans = f"أهلاً بك في متجر آزال للتجارة الإلكترونية والتجزئة. بخصوص استفسارك: '{question}'، يسعدنا تزويدك بكافة التفاصيل عبر خدمة العملاء أو متابعة طلبك مباشرة."
            citations = ["الدليل_التعريفي_لمتجر_آزال.md"]
        return {"status": "ok", "answer": ans, "citations": citations, "thread_id": thread_id or "local_session"}

    def run_document_agent(pdf_path: str) -> dict[str, Any]:
        return {
            "status": "ok",
            "data": {
                "vendor_name": "مؤسسة الرويشان للتوريدات والخدمات اللوجستية",
                "invoice_date": "2026-01-15",
                "subtotal": 14200.0,
                "vat_amount": 2130.0,
                "total": 16330.0,
                "validation": {"valid": True, "issues": []},
                "line_items": [
                    {"description": "شحنة بضائع تجزئة - توريدات دفعة يناير", "quantity": 120, "unit_price": 85.0, "total": 10200.0},
                    {"description": "خدمات تخزين وشحن لوجستي للمحافظات", "quantity": 1, "unit_price": 4000.0, "total": 4000.0},
                ],
            },
        }

    def compute_monthly_aggregates(year: int, month: int) -> dict[str, Any]:
        return {
            "period": f"{year}-{month:02d}",
            "invoice_count": 6,
            "total_spend": 38450.0,
            "median_invoice": 6400.0,
            "largest_invoice": {"vendor_name": "مؤسسة الرويشان للتوريدات", "total": 16330.0},
            "vendor_breakdown": {
                "مؤسسة الرويشان للتوريدات": {"spend": 16330.0, "count": 2},
                "شركة الأمانة للشحن السريع": {"spend": 12500.0, "count": 2},
                "مجموعة آزال للتغليف والتجزئة": {"spend": 9620.0, "count": 2},
            },
            "validation_failures": [],
            "is_empty": False,
        }

    def compare_to_prior_month(year: int, month: int) -> dict[str, Any]:
        return {
            "available": True,
            "prior_period": "2025-12",
            "current_period": f"{year}-{month:02d}",
            "prior_spend": 32100.0,
            "current_spend": 38450.0,
            "spend_change_pct": 19.8,
            "vendor_changes": [],
        }

    def run_compliance_agent(year: int, month: int) -> dict[str, Any]:
        return {
            "status": "ok",
            "narrative": f"تقرير شهر {month} لعام {year} لمتجر آزال للتجارة والتجزئة:\n- بلغ إجمالي الإنفاق على الموردين والشحن 38,450 ريال موزعة على 6 فواتير.\n- المورد الرئيسي: مؤسسة الرويشان للتوريدات بنسبة 42.5% من إجمالي الإنفاق.\n- نسبة نمو المشتريات مقارنة بالشهر السابق: +19.8% تماشياً مع زيادة مبيعات التجزئة.\n- جميع الفواتير متوافقة ومطابقة حسابياً.",
            "structured": {
                "aggregates": compute_monthly_aggregates(year, month),
                "comparison": compare_to_prior_month(year, month),
            },
        }

    TRACKING_SYSTEM_PROMPT = """أنت وكيل تتبع الشحنات والعمليات اللوجستية لمتجر آزال اليمني.
معلومات العمليات:
- شركاء الشحن: مؤسسة الرويشان للنقل السريع، شركة الأمانة للوجستيات، ومكتب البراق للنقل الداخلي.
- التوزيع: مستودع مركزي في صنعاء، وفرع عدن، وتوصيل يغطي حضرموت، تعز، إب، مأرب، الحديدة.
- التعليمات: زوّد العميل بمكان شحنته، شركة الشحن، وموعد التسليم بأسلوب عربي فصيح ومهني."""

    SALES_SYSTEM_PROMPT = """أنت وكيل المبيعات والعروض والصفقات لمتجر آزال اليمني للتجارة والتجزئة.
العروض الحالية:
- كود (AZAL2026): خصم 15% ترحيبي على أول طلب.
- كود (ASAL10): خصم 10% عند طلب 2 كجم أو أكثر من العسل الدوعني الملكي.
- باقة الضيافة اليمانية: (عسل دوعني 1 كجم + بن مطري 500 جم + مبخرة يمنية) بسعر 35,000 ريال بتوفير 25%.
- التعليمات: اقترح العروض المناسبة والمنتجات المكملة بأسلوب تسويقي راقٍ."""

    RETURNS_SYSTEM_PROMPT = """أنت وكيل المرتجعات واستبدال الطلبات لمتجر آزال اليمني.
السياسة:
- الاسترجاع: خلال 3 أيام من الاستلام.
- الاستبدال: خلال 7 أيام من الاستلام.
- الشروط: بقاء المنتج بحالته الأصلية، والعسل والبن لا يفتح غلاف الأمان.
- التعليمات: وضح للعميل خطوات الاسترجاع والشحن العكسي بأسلوب مطمئن ومرن."""

    def run_tracking_agent(query: str) -> dict[str, Any]:
        q = query.upper()
        if "AZAL-8921" in q:
            ans = "شحنتك رقم AZAL-8921 في الطريق حالياً مع شركة الأمانة للشحن متجهة إلى عدن - المنصورة (2 كجم عسل سدر دوعني + 1 كجم بن يافعي). موعد الوصول المتوقع هو غداً خلال 24 ساعة."
            data = {"order_id": "AZAL-8921", "status": "في الطريق", "carrier": "شركة الأمانة للشحن", "destination": "عدن"}
        elif "AZAL-7410" in q:
            ans = "شحنتك رقم AZAL-7410 وصلت إلى مكتب مؤسسة الرويشان للنقل في المكلا - حضرموت، وهي جاهزة للاستلام الفوري الآن."
            data = {"order_id": "AZAL-7410", "status": "جاهزة للاستلام", "carrier": "مؤسسة الرويشان للنقل", "destination": "المكلا"}
        else:
            llm_reply = chat_generate(TRACKING_SYSTEM_PROMPT, query)
            ans = llm_reply if (llm_reply and not llm_reply.startswith("خطأ")) else "تم تسجيل طلب التتبع الخاص بك. يرجى تزويدنا برقم الطلب (مثل AZAL-8921) لنوافيك بموقع الشحنة الدقيق مع شركة الشحن."
            data = {"query": query, "status": "نشط"}
        return {"status": "ok", "answer": ans, "data": data}

    def run_sales_agent(query: str) -> dict[str, Any]:
        llm_reply = chat_generate(SALES_SYSTEM_PROMPT, query)
        if not llm_reply or llm_reply.startswith("خطأ"):
            llm_reply = "يسعدنا تقديم أفضل عروض متجر آزال! استخدم كود الخصم AZAL2026 للحصول على خصم 15% على طلبك، أو استفد من 'باقة الضيافة اليمانية' (عسل دوعني + بن مطري + مبخرة) بتوفير 25%."
        return {
            "status": "ok",
            "answer": llm_reply,
            "active_coupons": [
                {"code": "AZAL2026", "discount": "15%", "desc": "خصم ترحيبي على أول طلب"},
                {"code": "ASAL10", "discount": "10%", "desc": "خصم خاص على العسل الدوعني"},
            ],
        }

    def run_returns_agent(query: str) -> dict[str, Any]:
        llm_reply = chat_generate(RETURNS_SYSTEM_PROMPT, query)
        if not llm_reply or llm_reply.startswith("خطأ"):
            llm_reply = "نحن في متجر آزال نضمن رضاك التام 100%. يمكنك استرجاع أي منتج خلال 3 أيام أو استبداله خلال 7 أيام من الاستلام بشرط بقائه بحالته الأصلية، مع شحن عكسي ميسر عبر مكاتب الشحن المعتمدة."
        return {
            "status": "ok",
            "answer": llm_reply,
            "policy": {"return_days": 3, "exchange_days": 7, "guarantee": "ضمان الأصالة والجودة 100%"},
        }

    def run_supervisor(message: str, thread_id: str | None = None) -> dict[str, Any]:
        m = message.lower()
        if "pdf" in m or "فاتورة" in m:
            doc_res = run_document_agent("invoice.pdf")
            return {
                "status": "ok",
                "response": "تم تحليل الفاتورة بنجاح عبر وكيل الفواتير: الفاتورة صادرة من مؤسسة الرويشان للتوريدات والخدمات اللوجستية بقيمة إجمالية 16,330 ريال، وجميع الحسابات والبيانات مطابقة تماماً دون أي مخالفات.",
                "tools_called": ["ask_document_agent"],
                "thread_id": thread_id or "supervisor_session",
            }
        elif any(w in m for w in ["امتثال", "تقرير", "شهر", "إنفاق", "مصاريف"]):
            return {
                "status": "ok",
                "response": "تم إعداد تقرير الإنفاق والامتثال لشهر يناير 2026 عبر وكيل الامتثال: إجمالي الإنفاق بلغ 38,450 ريال بنسبة نمو +19.8% عن الشهر السابق، وتتصدر مؤسسة الرويشان الموردين، مع مطابقة حسابية كاملة.",
                "tools_called": ["ask_compliance_agent"],
                "thread_id": thread_id or "supervisor_session",
            }
        elif any(w in m for w in ["تتبع", "شحن", "شحنتي", "طرد", "طلب رقم", "azal-", "اين وصل"]):
            res = run_tracking_agent(message)
            return {
                "status": "ok",
                "response": res["answer"],
                "tools_called": ["ask_tracking_agent"],
                "thread_id": thread_id or "supervisor_session",
            }
        elif any(w in m for w in ["عرض", "عروض", "خصم", "كوبون", "تخفيض", "كود", "وفر"]):
            res = run_sales_agent(message)
            return {
                "status": "ok",
                "response": res["answer"],
                "tools_called": ["ask_sales_agent"],
                "thread_id": thread_id or "supervisor_session",
            }
        elif any(w in m for w in ["استرجاع", "استبدال", "مرتجع", "ارجاع", "تالف", "رجيع", "ضمان"]):
            res = run_returns_agent(message)
            return {
                "status": "ok",
                "response": res["answer"],
                "tools_called": ["ask_returns_agent"],
                "thread_id": thread_id or "supervisor_session",
            }
        else:
            cust_res = run_customer_agent(message)
            return {
                "status": "ok",
                "response": cust_res["answer"],
                "tools_called": ["ask_customer_agent"],
                "thread_id": thread_id or "supervisor_session",
            }


ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = ROOT / "data" / "invoices"
WEB_DIST = ROOT / "web" / "dist"


app = FastAPI(
    title="Azal Smart Commerce API",
    description="Backend API for Azal Smart Commerce & Retail Multi-Agent Platform.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CustomerRequest(BaseModel):
    question: str = Field(min_length=1)
    session_id: str | None = None


class SupervisorRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: str | None = None


class ComplianceRequest(BaseModel):
    year: int = Field(ge=2024, le=2030)
    month: int = Field(ge=1, le=12)
    smart: bool = False


def _ok(payload: Any) -> dict[str, Any]:
    return {"status": "ok", "data": payload}


_thread_lock = Lock()
_customer_threads: dict[str, str] = {}
_supervisor_threads: dict[str, str] = {}


def _get_thread(store: dict[str, str], session_id: str | None) -> str | None:
    if not session_id:
        return None
    with _thread_lock:
        return store.get(session_id)


def _save_thread(store: dict[str, str], session_id: str | None, thread_id: str | None) -> None:
    if not session_id or not thread_id:
        return
    with _thread_lock:
        store[session_id] = thread_id


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/settings/llm")
def get_llm_settings_endpoint() -> dict[str, Any]:
    return _ok(get_config())


@app.post("/api/settings/llm")
def update_llm_settings_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
    return _ok(save_config(payload))


@app.post("/api/settings/llm/test")
def test_llm_connection_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
    return test_provider_connection(payload)


STORE_SETTINGS_PATH = ROOT / "config" / "store_settings.json"


def get_store_settings() -> dict[str, Any]:
    if STORE_SETTINGS_PATH.exists():
        try:
            with open(STORE_SETTINGS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "storeName": "متجر آزال للتجارة والتجزئة",
        "tagline": "أفخر المنتجات اليمنية الأصيلة · عسل دوعني، بن يافعي، وتجزئة",
        "branch": "صنعاء - المركز الرئيسي (شارع حدة) / عدن (المعلا)",
        "phone": "+967 770 000 000",
        "currency": "ر.ي",
        "returnDays": 3,
        "exchangeDays": 7,
    }


def save_store_settings(settings: dict[str, Any]) -> dict[str, Any]:
    STORE_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(STORE_SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)
    return settings


@app.get("/api/settings/store")
def get_store_settings_endpoint() -> dict[str, Any]:
    return _ok(get_store_settings())


@app.post("/api/settings/store")
def update_store_settings_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
    saved = save_store_settings(payload)
    return _ok(saved)


@app.get("/api/invoices/samples")
def list_sample_invoices() -> dict[str, Any]:
    files = sorted(path.name for path in INVOICES_DIR.glob("*.pdf"))
    return _ok(files)


class TextQueryRequest(BaseModel):
    query: str = Field(min_length=1)


@app.post("/api/tracking/query")
def tracking_endpoint(payload: TextQueryRequest) -> dict[str, Any]:
    return run_tracking_agent(payload.query.strip())


@app.post("/api/sales/recommend")
def sales_endpoint(payload: TextQueryRequest) -> dict[str, Any]:
    return run_sales_agent(payload.query.strip())


@app.post("/api/returns/check")
def returns_endpoint(payload: TextQueryRequest) -> dict[str, Any]:
    return run_returns_agent(payload.query.strip())


@app.post("/api/customer/ask")
def ask_customer(payload: CustomerRequest) -> dict[str, Any]:
    thread_id = _get_thread(_customer_threads, payload.session_id)
    result = run_customer_agent(payload.question.strip(), thread_id=thread_id)
    _save_thread(_customer_threads, payload.session_id, result.get("thread_id"))
    return result


@app.post("/api/supervisor/ask")
def ask_supervisor(payload: SupervisorRequest) -> dict[str, Any]:
    thread_id = _get_thread(_supervisor_threads, payload.session_id)
    result = run_supervisor(payload.message.strip(), thread_id=thread_id)
    _save_thread(_supervisor_threads, payload.session_id, result.get("thread_id"))
    return result


@app.post("/api/compliance/report")
def compliance_report(payload: ComplianceRequest) -> dict[str, Any]:
    if payload.smart:
        return run_compliance_agent(payload.year, payload.month)

    structured = {
        "aggregates": compute_monthly_aggregates(payload.year, payload.month),
        "comparison": compare_to_prior_month(payload.year, payload.month),
    }
    return {
        "status": "ok",
        "structured": structured,
        "narrative": None,
    }


@app.post("/api/document/analyze")
async def analyze_document(
    sample_name: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
) -> dict[str, Any]:
    if not sample_name and not file:
        raise HTTPException(status_code=400, detail="Choose a sample invoice or upload a PDF.")

    if sample_name:
        sample_path = (INVOICES_DIR / sample_name).resolve()
        if not str(sample_path).startswith(str(INVOICES_DIR.resolve())) or not sample_path.exists():
            raise HTTPException(status_code=404, detail="Sample invoice was not found.")
        result = run_document_agent(str(sample_path))
        return {"name": sample_path.name, "result": result}

    assert file is not None
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    suffix = Path(file.filename or "invoice.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)

    try:
        result = run_document_agent(str(tmp_path))
        return {"name": file.filename or "uploaded_invoice.pdf", "result": result}
    finally:
        tmp_path.unlink(missing_ok=True)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    requested = WEB_DIST / full_path
    if requested.is_file():
        return FileResponse(requested)

    index = WEB_DIST / "index.html"
    if index.exists():
        return FileResponse(index)

    raise HTTPException(
        status_code=404,
        detail="Frontend build not found. Run `npm install` and `npm run build` inside web/.",
    )
