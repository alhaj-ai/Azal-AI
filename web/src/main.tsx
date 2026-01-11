import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Command,
  Copy,
  Cpu,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HelpCircle,
  Key,
  Layers,
  LayoutDashboard,
  Loader2,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  analyzeDocument,
  askCustomer,
  askSupervisor,
  checkReturns,
  getComplianceReport,
  getBackendStoreSettings,
  saveBackendStoreSettings,
  getLLMSettings,
  saveLLMSettings,
  testLLMConnection,
  listSamples,
  queryTracking,
  type ComplianceResponse,
  type CustomerResponse,
  type DocumentResponse,
  type SupervisorResponse,
  type LLMConfig,
  type LLMProviderInfo,
} from "./api";
import { formatCurrency, months, normalizeNarrative, toolLabel } from "./utils";
import "./styles.css";

// ==========================================
// STORE CUSTOMIZATION (USER SETTINGS)
// ==========================================
export interface StoreCustomization {
  storeName: string;
  tagline: string;
  branch: string;
  phone: string;
  currency: string;
  returnDays: number;
  exchangeDays: number;
}

const DEFAULT_STORE: StoreCustomization = {
  storeName: "متجر آزال للتجارة والتجزئة",
  tagline: "أفخر المنتجات اليمنية الأصيلة · عسل دوعني، بن يافعي، وتجزئة",
  branch: "صنعاء - المركز الرئيسي",
  phone: "+967 770 000 000",
  currency: "ر.ي",
  returnDays: 3,
  exchangeDays: 7,
};

type Theme = "light" | "dark";

type Page =
  | "dashboard"
  | "assistant"
  | "customer"
  | "tracking"
  | "sales"
  | "returns"
  | "documents"
  | "compliance"
  | "providers"
  | "customization";

export interface Shipment {
  id: string;
  customer: string;
  dest: string;
  carrier: string;
  status: "في الطريق" | "تم التسليم" | "قيد التجهيز";
  items: string;
}

export interface Coupon {
  code: string;
  discount: string;
  desc: string;
}

function getInitialStore(): StoreCustomization {
  try {
    const raw = localStorage.getItem("azal_store_settings");
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STORE;
}

function getInitialShipments(): Shipment[] {
  try {
    const raw = localStorage.getItem("azal_real_shipments");
    if (raw) return JSON.parse(raw);
  } catch {}
  // Real initial starter shipments
  return [
    { id: "AZAL-8921", customer: "أحمد باوزير", dest: "عدن - المنصورة", carrier: "شركة الأمانة للشحن", status: "في الطريق", items: "2 كجم عسل سدر دوعني ملكي" },
    { id: "AZAL-7410", customer: "فهد العريقي", dest: "صنعاء - حدة", carrier: "مؤسسة الرويشان", status: "تم التسليم", items: "باقة الضيافة اليمانية" },
  ];
}

function getInitialCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem("azal_real_coupons");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { code: "AZAL2026", discount: "15% خصم", desc: "خصم ترحيبي لجميع العملاء الجدد" },
    { code: "ASAL10", discount: "10% خصم", desc: "خصم حصري على العسل الدوعني الملكي" },
  ];
}

// ==========================================
// UX ENHANCEMENT COMPONENTS
// ==========================================

function AgentFlowVisualizer({ loading }: { loading: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!loading) {
      setActiveStep(0);
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => s + 0.1);
    }, 100);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, [loading]);

  if (!loading) return null;

  const steps = [
    { num: 1, label: "تحليل القصد والمفردات" },
    { num: 2, label: "استدعاء الوكيل المختص" },
    { num: 3, label: "تدقيق الضوابط التجارية" },
    { num: 4, label: "صياغة الرد بالعربية الفصحى" },
  ];

  return (
    <div className="agent-flow-box">
      <div className="agent-flow-header">
        <div className="agent-flow-title">
          <Sparkles size={16} style={{ color: "var(--brand-blue)" }} />
          <span>جاري المعالجة عبر وكلاء منظومة آزال...</span>
        </div>
        <span className="agent-flow-timer">{seconds.toFixed(1)} ثانية</span>
      </div>
      <div className="agent-flow-steps">
        {steps.map((st, i) => (
          <div
            key={st.num}
            className={`agent-flow-step ${i === activeStep ? "active" : i < activeStep ? "completed" : ""}`}
          >
            <div className="agent-flow-step-num">
              {i < activeStep ? <CheckCircle2 size={12} /> : st.num}
            </div>
            <div className="agent-flow-step-label">{st.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommandPalette({
  isOpen,
  onClose,
  navigate,
  toggleTheme,
  theme,
  shipments,
  coupons,
}: {
  isOpen: boolean;
  onClose: () => void;
  navigate: (page: Page) => void;
  toggleTheme: () => void;
  theme: Theme;
  shipments: Shipment[];
  coupons: Coupon[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  type Command = {
    id: string;
    category: "صفحات" | "إجراءات سريعة" | "شحنات" | "عروض";
    title: string;
    description: string;
    icon: React.ReactNode;
    action: () => void;
  };

  const commands: Command[] = [
    // Navigation
    { id: "nav-dash", category: "صفحات", title: "لوحة التحكم الرئيسية", description: "المؤشرات العامة وملخص النشاط", icon: <LayoutDashboard size={16} />, action: () => navigate("dashboard") },
    { id: "nav-asst", category: "صفحات", title: "المساعد الذكي (المشرف العام)", description: "محادثة ذكية وتوجيه الوكلاء", icon: <Bot size={16} />, action: () => navigate("assistant") },
    { id: "nav-cust", category: "صفحات", title: "خدمة العملاء والرد الآلي", description: "استفسارات الشحن والدفع والمحافظات", icon: <MessageCircle size={16} />, action: () => navigate("customer") },
    { id: "nav-track", category: "صفحات", title: "إدارة الشحنات واللوجستيات", description: "متابعة الطرود وتحديث الحالات", icon: <Truck size={16} />, action: () => navigate("tracking") },
    { id: "nav-sales", category: "صفحات", title: "محرك العروض والخصومات", description: "كوبونات الخصم والترويج", icon: <Tag size={16} />, action: () => navigate("sales") },
    { id: "nav-returns", category: "صفحات", title: "مكتب الاستبدال والاسترجاع", description: "تدقيق طلبات الإرجاع والشروط", icon: <RotateCcw size={16} />, action: () => navigate("returns") },
    { id: "nav-docs", category: "صفحات", title: "مدقق فواتير التوريد", description: "فحص فواتير PDF واستخراج البنود", icon: <ReceiptText size={16} />, action: () => navigate("documents") },
    { id: "nav-comp", category: "صفحات", title: "التقارير المالية والامتثال", description: "تحليلات الإنفاق ومشتريات الموردين", icon: <BarChart3 size={16} />, action: () => navigate("compliance") },
    { id: "nav-prov", category: "صفحات", title: "مزودات الذكاء الاصطناعي (LLMs)", description: "إدارة 9 مزودات وربط API والمحلي", icon: <Cpu size={16} />, action: () => navigate("providers") },
    { id: "nav-store", category: "صفحات", title: "تخصيص هوية المتجر", description: "الاسم، العملة، الفروع، وسياسات المتجر", icon: <Settings size={16} />, action: () => navigate("customization") },
    // Quick Actions
    { id: "act-theme", category: "إجراءات سريعة", title: theme === "light" ? "تفعيل الثيم الداكن (OLED)" : "تفعيل الثيم الفاتح", description: "تبديل المظهر البصري للمنظومة", icon: theme === "light" ? <Moon size={16} /> : <Sun size={16} />, action: toggleTheme },
    { id: "act-new-ship", category: "إجراءات سريعة", title: "تسجيل شحنة جديدة", description: "إضافة بوليصة شحن لعميل جديد", icon: <Plus size={16} />, action: () => navigate("tracking") },
    { id: "act-audit-inv", category: "إجراءات سريعة", title: "تدقيق فاتورة مورد PDF", description: "تحليل ومطابقة البنود الحسابية", icon: <ReceiptText size={16} />, action: () => navigate("documents") },
    { id: "act-create-coup", category: "إجراءات سريعة", title: "إنشاء كود خصم جديد", description: "توليد كود خصم لحملة ترويجية", icon: <Tag size={16} />, action: () => navigate("sales") },
  ];

  shipments.forEach((s) => {
    commands.push({
      id: `ship-${s.id}`,
      category: "شحنات",
      title: `${s.id} - ${s.customer}`,
      description: `${s.dest} (${s.carrier}) · ${s.status}`,
      icon: <Package size={16} />,
      action: () => navigate("tracking"),
    });
  });

  coupons.forEach((c) => {
    commands.push({
      id: `coup-${c.code}`,
      category: "عروض",
      title: `كود ${c.code} (${c.discount})`,
      description: `${c.desc}`,
      icon: <Tag size={16} />,
      action: () => navigate("sales"),
    });
  });

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="saas-command-overlay" onClick={onClose}>
      <div className="saas-command-modal" onClick={(e) => e.stopPropagation()}>
        <div className="saas-command-header">
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <input
            autoFocus
            className="saas-command-input"
            placeholder="ابحث عن صفحة، شحنة، كوبون، أو إجراء سريع..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="saas-kbd">ESC</kbd>
        </div>

        <div className="saas-command-list">
          {filtered.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              لا توجد نتائج مطابقة لـ "{query}"
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`saas-command-item ${idx === selectedIndex ? "selected" : ""}`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="saas-command-item-left">
                  <div style={{ color: "var(--brand-blue)" }}>{cmd.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{cmd.title}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{cmd.description}</div>
                  </div>
                </div>
                <span className="saas-command-item-badge">{cmd.category}</span>
              </div>
            ))
          )}
        </div>

        <div className="saas-command-footer">
          <div className="saas-command-shortcuts">
            <span><kbd className="saas-kbd">↑</kbd> <kbd className="saas-kbd">↓</kbd> للتنقل</span>
            <span><kbd className="saas-kbd">↵</kbd> للاختيار</span>
          </div>
          <span>منظومة آزال الذكية (Azal AI)</span>
        </div>
      </div>
    </div>
  );
}

function PrintableWaybillModal({
  shipment,
  store,
  onClose,
}: {
  shipment: Shipment;
  store: StoreCustomization;
  onClose: () => void;
}) {
  return (
    <div className="print-modal-overlay" onClick={onClose}>
      <div className="print-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="print-modal-actions">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
            <Printer size={18} style={{ color: "var(--brand-blue)" }} />
            <span>بوليصة شحن رسمية جاهزة للطباعة</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="saas-btn-primary" onClick={() => window.print()}>
              <Printer size={15} />
              طباعة البوليصة
            </button>
            <button className="saas-btn-ghost" onClick={onClose}>
              <X size={15} />
              إغلاق
            </button>
          </div>
        </div>

        <div className="waybill-sheet">
          <div className="waybill-header">
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>{store.storeName}</h2>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#666" }}>
                {store.branch} · هاتف: {store.phone}
              </p>
              <div className="waybill-barcode">* {shipment.id} *</div>
            </div>
            <div className="waybill-qr-box">
              <QrCode size={48} />
              <span>فحص فوري</span>
            </div>
          </div>

          <div className="waybill-grid">
            <div className="waybill-box">
              <div className="waybill-box-title">بيانات المستلم والوجهة</div>
              <div style={{ fontSize: "1rem", fontWeight: 900, marginBottom: "0.25rem" }}>{shipment.customer}</div>
              <div style={{ fontSize: "0.88rem" }}>المدينة / المحافظة: <strong>{shipment.dest}</strong></div>
              <div style={{ fontSize: "0.85rem", color: "#555" }}>شركة النقل والشحن: {shipment.carrier}</div>
            </div>

            <div className="waybill-box">
              <div className="waybill-box-title">تفاصيل الإرسالية والتحصيل</div>
              <div style={{ fontSize: "0.88rem" }}>رقم التتبع: <strong>{shipment.id}</strong></div>
              <div style={{ fontSize: "0.88rem" }}>حالة الشحنة: <strong>{shipment.status}</strong></div>
              <div style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>طريقة الدفع: <strong>تحصيل عند الاستلام (COD)</strong></div>
            </div>
          </div>

          <div className="waybill-box" style={{ marginBottom: "1.25rem" }}>
            <div className="waybill-box-title">محتويات الطرد</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>{shipment.items}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "2rem", borderTop: "1px dashed #bbb", paddingTop: "1rem", fontSize: "0.82rem" }}>
            <div>توقيع واستلام الناقل: ____________________</div>
            <div>توقيع واستلام العميل: ____________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintableExecutiveReportModal({
  store,
  aggregates,
  narrative,
  onClose,
}: {
  store: StoreCustomization;
  aggregates: any;
  narrative?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="print-modal-overlay" onClick={onClose}>
      <div className="print-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="print-modal-actions">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
            <FileText size={18} style={{ color: "var(--brand-emerald)" }} />
            <span>التقرير المالي التنفيذي الرسمي</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="saas-btn-primary" onClick={() => window.print()}>
              <Printer size={15} />
              طباعة التقرير
            </button>
            <button className="saas-btn-ghost" onClick={onClose}>
              <X size={15} />
              إغلاق
            </button>
          </div>
        </div>

        <div className="waybill-sheet">
          <div className="waybill-header">
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>{store.storeName}</h2>
              <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#666" }}>
                الإدارة المالية والتدقيق المحاسبي · الفترة: الربع الأول 2026
              </p>
            </div>
            <div style={{ textAlign: "left", fontSize: "0.82rem", color: "#555" }}>
              <div>تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</div>
              <div>العملة المعتمدة: {store.currency}</div>
            </div>
          </div>

          <div className="waybill-grid">
            <div className="waybill-box">
              <div className="waybill-box-title">إجمالي المشتريات والإنفاق</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#059669 !important" }}>
                {aggregates?.total_spend?.toLocaleString()} {store.currency}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#666" }}>عدد الفواتير المدققة: {aggregates?.invoice_count}</div>
            </div>

            <div className="waybill-box">
              <div className="waybill-box-title">أكبر مورد مسجل</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 900 }}>
                {aggregates?.largest_invoice?.vendor_name || "مناحل وادي دوعن للعسل الملكي"}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#666" }}>
                قيمة الفاتورة: {aggregates?.largest_invoice?.total?.toLocaleString()} {store.currency}
              </div>
            </div>
          </div>

          {narrative && (
            <div className="waybill-box" style={{ marginBottom: "1.5rem" }}>
              <div className="waybill-box-title">التحليل التنفيذي والتوصيات المحاسبية</div>
              <div style={{ fontSize: "0.9rem", lineHeight: 1.8 }}>
                {normalizeNarrative(narrative).map((line, idx) => (
                  <p key={idx} style={{ margin: "0.35rem 0" }}>• {line}</p>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3rem", borderTop: "2px solid #000", paddingTop: "1rem", fontSize: "0.85rem" }}>
            <div>المدير المالي: ___________________</div>
            <div>ختم الاعتماد الرسمي للمتجر</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ page, navigate }: { page: Page; navigate: (p: Page) => void }) {
  const items: { p: Page; label: string; icon: React.ReactNode }[] = [
    { p: "dashboard", label: "الرئيسية", icon: <LayoutDashboard size={18} /> },
    { p: "assistant", label: "المساعد", icon: <Bot size={18} /> },
    { p: "tracking", label: "الشحنات", icon: <Truck size={18} /> },
    { p: "documents", label: "الفواتير", icon: <ReceiptText size={18} /> },
    { p: "providers", label: "الذكاء", icon: <Cpu size={18} /> },
  ];

  return (
    <nav className="saas-bottom-nav">
      {items.map((it) => (
        <button
          key={it.p}
          className={`saas-bottom-item ${page === it.p ? "active" : ""}`}
          onClick={() => navigate(it.p)}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
function App() {
  const [page, setPage] = useState<Page>(() => (location.hash.replace("#", "") as Page) || "dashboard");
  const [store, setStore] = useState<StoreCustomization>(getInitialStore);
  const [shipments, setShipments] = useState<Shipment[]>(getInitialShipments);
  const [coupons, setCoupons] = useState<Coupon[]>(getInitialCoupons);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("azal_theme") as Theme) || "light");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem("azal_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPage((location.hash.replace("#", "") as Page) || "dashboard");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  // Sync store settings with backend on mount
  useEffect(() => {
    getBackendStoreSettings()
      .then((res) => {
        if (res?.data?.storeName) {
          setStore(res.data);
          localStorage.setItem("azal_store_settings", JSON.stringify(res.data));
        }
      })
      .catch(() => {});
  }, []);

  const navigate = (next: Page) => {
    location.hash = next === "dashboard" ? "" : next;
    setPage(next);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateStore = (next: StoreCustomization) => {
    setStore(next);
    localStorage.setItem("azal_store_settings", JSON.stringify(next));
    saveBackendStoreSettings(next).catch(() => {});
    showToast("تم حفظ إعدادات وهوية المتجر وتحديث الذكاء الاصطناعي بنجاح!");
  };

  const saveShipments = (list: Shipment[]) => {
    setShipments(list);
    localStorage.setItem("azal_real_shipments", JSON.stringify(list));
  };

  const saveCoupons = (list: Coupon[]) => {
    setCoupons(list);
    localStorage.setItem("azal_real_coupons", JSON.stringify(list));
  };

  return (
    <div className="saas-container">
      {/* Sidebar */}
      <Sidebar page={page} navigate={navigate} store={store} shipmentsCount={shipments.length} />

      {/* Main Content Area */}
      <div className="saas-main">
        <Header
          page={page}
          navigate={navigate}
          store={store}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main className="saas-viewport">
          {page === "dashboard" && (
            <DashboardOverview
              navigate={navigate}
              store={store}
              shipments={shipments}
              coupons={coupons}
              showToast={showToast}
            />
          )}

          {page === "assistant" && <AssistantCopilot store={store} showToast={showToast} />}

          {page === "customer" && <CustomerDesk store={store} showToast={showToast} />}

          {page === "tracking" && (
            <LogisticsHub
              store={store}
              shipments={shipments}
              saveShipments={saveShipments}
              showToast={showToast}
            />
          )}

          {page === "sales" && (
            <SalesEngine
              store={store}
              coupons={coupons}
              saveCoupons={saveCoupons}
              showToast={showToast}
            />
          )}

          {page === "returns" && <ReturnsDesk store={store} showToast={showToast} />}

          {page === "documents" && <InvoiceAuditor store={store} showToast={showToast} />}

          {page === "compliance" && <ComplianceAnalytics store={store} showToast={showToast} />}

          {page === "providers" && <ProvidersHub showToast={showToast} />}

          {page === "customization" && <CustomizationHub store={store} updateStore={updateStore} />}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="saas-toast" role="status">
          <CheckCircle2 size={18} style={{ color: "var(--brand-emerald)" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav page={page} navigate={navigate} />

      {/* Omni Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        navigate={navigate}
        toggleTheme={toggleTheme}
        theme={theme}
        shipments={shipments}
        coupons={coupons}
      />
    </div>
  );
}

// ==========================================
// SIDEBAR COMPONENT
// ==========================================
function Sidebar({
  page,
  navigate,
  store,
  shipmentsCount,
}: {
  page: Page;
  navigate: (p: Page) => void;
  store: StoreCustomization;
  shipmentsCount: number;
}) {
  return (
    <aside className="saas-sidebar">
      {/* Brand Header */}
      <div className="saas-sidebar-header">
        <div className="saas-brand-logo" onClick={() => navigate("dashboard")} style={{ cursor: "pointer" }}>
          <div className="saas-brand-icon">
            <ShoppingBag size={20} />
          </div>
          <div className="saas-brand-title">
            <span>منظومة آزال الذكية</span>
            <span>{store.storeName}</span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="saas-sidebar-nav">
        {/* Core */}
        <div className="saas-nav-group">
          <div className="saas-nav-label">الرئيسية</div>
          <button
            className={`saas-nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => navigate("dashboard")}
          >
            <div className="saas-nav-item-content">
              <LayoutDashboard size={18} />
              <span>لوحة القيادة والمؤشرات</span>
            </div>
          </button>
        </div>

        {/* Smart Operations */}
        <div className="saas-nav-group">
          <div className="saas-nav-label">العمليات والمساعد</div>
          <button
            className={`saas-nav-item ${page === "assistant" ? "active" : ""}`}
            onClick={() => navigate("assistant")}
          >
            <div className="saas-nav-item-content">
              <Bot size={18} />
              <span>المساعد الذكي الشامل</span>
            </div>
            <span className="saas-nav-badge">فوري</span>
          </button>

          <button
            className={`saas-nav-item ${page === "customer" ? "active" : ""}`}
            onClick={() => navigate("customer")}
          >
            <div className="saas-nav-item-content">
              <MessageCircle size={18} />
              <span>خدمة العملاء والردود</span>
            </div>
          </button>

          <button
            className={`saas-nav-item ${page === "tracking" ? "active" : ""}`}
            onClick={() => navigate("tracking")}
          >
            <div className="saas-nav-item-content">
              <Truck size={18} />
              <span>إدارة وتتبع الشحنات</span>
            </div>
            <span className="saas-nav-badge">{shipmentsCount}</span>
          </button>
        </div>

        {/* Commerce */}
        <div className="saas-nav-group">
          <div className="saas-nav-label">المبيعات والتجارة</div>
          <button
            className={`saas-nav-item ${page === "sales" ? "active" : ""}`}
            onClick={() => navigate("sales")}
          >
            <div className="saas-nav-item-content">
              <Tag size={18} />
              <span>كوبونات الخصم والعروض</span>
            </div>
          </button>

          <button
            className={`saas-nav-item ${page === "returns" ? "active" : ""}`}
            onClick={() => navigate("returns")}
          >
            <div className="saas-nav-item-content">
              <RotateCcw size={18} />
              <span>فحص المرتجعات والضمان</span>
            </div>
          </button>
        </div>

        {/* Finance */}
        <div className="saas-nav-group">
          <div className="saas-nav-label">المالية والتدقيق</div>
          <button
            className={`saas-nav-item ${page === "documents" ? "active" : ""}`}
            onClick={() => navigate("documents")}
          >
            <div className="saas-nav-item-content">
              <ReceiptText size={18} />
              <span>تدقيق فواتير التوريد</span>
            </div>
          </button>

          <button
            className={`saas-nav-item ${page === "compliance" ? "active" : ""}`}
            onClick={() => navigate("compliance")}
          >
            <div className="saas-nav-item-content">
              <BarChart3 size={18} />
              <span>تقارير الإنفاق الشهري</span>
            </div>
          </button>
        </div>

        {/* Customization & Settings */}
        <div className="saas-nav-group">
          <div className="saas-nav-label">الإعدادات والذكاء</div>
          <button
            className={`saas-nav-item ${page === "providers" ? "active" : ""}`}
            onClick={() => navigate("providers")}
          >
            <div className="saas-nav-item-content">
              <Cpu size={18} />
              <span>مزودات الذكاء (LLM & API)</span>
            </div>
            <span className="saas-nav-badge">10</span>
          </button>

          <button
            className={`saas-nav-item ${page === "customization" ? "active" : ""}`}
            onClick={() => navigate("customization")}
          >
            <div className="saas-nav-item-content">
              <Settings size={18} />
              <span>تخصيص وهوية المتجر</span>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Status */}
      <div className="saas-sidebar-footer">
        <div className="saas-engine-card">
          <div className="saas-engine-top">
            <span className="saas-engine-status">
              <span className="saas-ping-dot" />
              النظام متصل ونشط
            </span>
            <span style={{ fontSize: "0.74rem", fontWeight: 700 }}>24/7</span>
          </div>
          <div className="saas-engine-meta">المساعد الذكي جاهز لخدمة متجرك</div>
        </div>
      </div>
    </aside>
  );
}

// ==========================================
// TOP HEADER WITH THEME TOGGLE
// ==========================================
function Header({
  page,
  navigate,
  store,
  theme,
  toggleTheme,
  onOpenCommand,
}: {
  page: Page;
  navigate: (p: Page) => void;
  store: StoreCustomization;
  theme: Theme;
  toggleTheme: () => void;
  onOpenCommand: () => void;
}) {
  return (
    <header className="saas-header">
      <div className="saas-header-left">
        {/* Workspace Pill */}
        <div
          className="saas-workspace-pill"
          onClick={() => navigate("customization")}
          style={{ cursor: "pointer" }}
          title="اضغط لتعديل بيانات المتجر"
        >
          <Building size={16} />
          <span>{store.storeName} ({store.branch})</span>
          <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
        </div>

        {/* Omni Command Search Trigger */}
        <button
          className="saas-search-trigger"
          onClick={onOpenCommand}
          title="شريط الأوامر والبحث السريع (Ctrl + K)"
        >
          <Search size={15} />
          <span>بحث أو أمر...</span>
          <kbd className="saas-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div className="saas-header-right">
        {/* LLM Providers Shortcut */}
        <button
          className="saas-icon-btn"
          onClick={() => navigate("providers")}
          title="مزودات الذكاء الاصطناعي و API"
        >
          <Cpu size={18} />
        </button>

        {/* Theme Toggle Button */}
        <button
          className="saas-icon-btn"
          onClick={toggleTheme}
          title={theme === "light" ? "التبديل إلى الثيم الداكن" : "التبديل إلى الثيم الفاتح"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Quick Assistant Action */}
        <button className="saas-btn-primary" onClick={() => navigate("assistant")}>
          <Bot size={16} />
          المساعد الذكي
        </button>

        {/* Profile Pill */}
        <div className="saas-workspace-pill" style={{ padding: "0.4rem 0.8rem", gap: "0.5rem" }}>
          <User size={15} />
          <span style={{ fontSize: "0.86rem" }}>العملة: {store.currency}</span>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// 1. EXECUTIVE DASHBOARD (TIED TO REAL DATA)
// ==========================================
function DashboardOverview({
  navigate,
  store,
  shipments,
  coupons,
  showToast,
}: {
  navigate: (p: Page) => void;
  store: StoreCustomization;
  shipments: Shipment[];
  coupons: Coupon[];
  showToast: (m: string) => void;
}) {
  const inTransitCount = shipments.filter((s) => s.status === "في الطريق").length;
  const deliveredCount = shipments.filter((s) => s.status === "تم التسليم").length;

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <LayoutDashboard size={14} />
            لوحة الإدارة والمؤشرات
          </span>
          <h1 className="saas-page-title">{store.storeName}</h1>
          <p className="saas-page-subtitle">{store.tagline}</p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-secondary" onClick={() => navigate("tracking")}>
            <Truck size={15} />
            إدارة الشحنات
          </button>
          <button className="saas-btn-primary" onClick={() => navigate("customization")}>
            <Edit3 size={15} />
            تخصيص المتجر
          </button>
        </div>
      </div>

      {/* Real KPIs Cards */}
      <div className="saas-kpi-grid">
        <div className="saas-kpi-card">
          <div className="saas-kpi-header">
            <span className="saas-kpi-label">إجمالي الشحنات المسجلة</span>
            <div className="saas-kpi-icon"><Truck size={18} /></div>
          </div>
          <div className="saas-kpi-value-row">
            <span className="saas-kpi-value">{shipments.length} شحنة</span>
            <span className="saas-kpi-trend positive">حقيقي</span>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {inTransitCount} قيد النقل · {deliveredCount} تم تسليمها
          </div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-header">
            <span className="saas-kpi-label">الكوبونات الترويجية النشطة</span>
            <div className="saas-kpi-icon"><Tag size={18} /></div>
          </div>
          <div className="saas-kpi-value-row">
            <span className="saas-kpi-value">{coupons.length} كوبونات</span>
            <span className="saas-kpi-trend positive">فعّالة</span>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>جاهزة للاستخدام في المتجر</div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-header">
            <span className="saas-kpi-label">سياسة الاسترجاع والاستبدال</span>
            <div className="saas-kpi-icon"><RotateCcw size={18} /></div>
          </div>
          <div className="saas-kpi-value-row">
            <span className="saas-kpi-value">{store.returnDays} / {store.exchangeDays} أيام</span>
            <span className="saas-kpi-trend neutral">معتمد</span>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {store.returnDays} أيام للاسترجاع و {store.exchangeDays} للاستبدال
          </div>
        </div>

        <div className="saas-kpi-card">
          <div className="saas-kpi-header">
            <span className="saas-kpi-label">خدمة العملاء والردود</span>
            <div className="saas-kpi-icon"><Bot size={18} /></div>
          </div>
          <div className="saas-kpi-value-row">
            <span className="saas-kpi-value" style={{ color: "var(--brand-emerald)" }}>متصل</span>
            <span className="saas-kpi-trend positive">جاهز</span>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>إجابة فورية على استفسارات الزوار</div>
        </div>
      </div>

      {/* Real Shipments Section */}
      <div className="saas-panel">
        <div className="saas-panel-header">
          <div>
            <h3 className="saas-panel-title">
              <Truck size={18} />
              أحدث الشحنات المسجلة في متجرك
            </h3>
            <p className="saas-panel-desc">متابعة فورية للطلبات الحقيقية التي سجلتها في النظام</p>
          </div>
          <button className="saas-btn-primary" onClick={() => navigate("tracking")}>
            <Plus size={15} />
            إضافة شحنة جديدة
          </button>
        </div>

        {shipments.length === 0 ? (
          <div className="saas-empty-state">
            <div className="saas-empty-icon"><Package size={26} /></div>
            <h4 className="saas-empty-title">لا توجد شحنات مسجلة بعد</h4>
            <p className="saas-empty-desc">
              سجّل شحنتك الأولى لتبدأ بمتابعة حالة التوصيل مع شركات النقل وإطلاع عملائك فوراً.
            </p>
            <button className="saas-btn-primary" onClick={() => navigate("tracking")}>
              إضافة أول شحنة الآن
            </button>
          </div>
        ) : (
          <div className="saas-table-wrap">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>رقم الشحنة</th>
                  <th>العميل</th>
                  <th>الوجهة</th>
                  <th>شركة الشحن</th>
                  <th>المحتويات</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 4).map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800 }}>{s.id}</td>
                    <td>{s.customer}</td>
                    <td>{s.dest}</td>
                    <td>{s.carrier}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{s.items}</td>
                    <td>
                      <span className={`saas-status-pill ${s.status === "تم التسليم" ? "success" : "info"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. ASSISTANT COPILOT (CLEAN CHAT)
// ==========================================
function AssistantCopilot({ store, showToast }: { store: StoreCustomization; showToast: (m: string) => void }) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ message: string; result: SupervisorResponse }[]>([]);
  const [loading, setLoading] = useState(false);

  const starters = [
    `أين وصلت شحنتي رقم AZAL-8921 في عدن؟`,
    `ما هي كوبونات الخصم المتوفرة في المتجر اليوم؟`,
    `كيف يمكنني سداد قيمة الطلب عبر بنك الكريمي أو تطبيق جيب؟`,
    `ما هي سياسة استرجاع واستبدال المنتجات لديكم؟`,
  ];

  const submit = async (text = message) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await askSupervisor(text.trim());
      setHistory((prev) => [...prev, { message: text.trim(), result }]);
      setMessage("");
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          message: text.trim(),
          result: {
            status: "failed",
            response: `⚠️ تعذّر الاتصال بالمساعد: ${err?.message || "يرجى التحقق من اتصال الخادم"}.`,
            tools_called: [],
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <Bot size={14} />
            المساعد الذكي
          </span>
          <h1 className="saas-page-title">المساعد الذكي لـ {store.storeName}</h1>
          <p className="saas-page-subtitle">
            اسأل عن أي شحنة، استفسر عن المنتجات، راجع الشروط والسياسات، وسيجيبك المساعد فوراً.
          </p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-ghost" onClick={() => setHistory([])}>
            <RefreshCw size={15} />
            محادثة جديدة
          </button>
        </div>
      </div>

      {history.length === 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {starters.map((s, idx) => (
            <button
              key={idx}
              className="saas-btn-ghost"
              style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", borderRadius: "999px" }}
              onClick={() => submit(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="saas-chat-pane">
        <div className="saas-chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="saas-ping-dot" />
            <strong style={{ fontSize: "0.95rem" }}>المساعد متصل ومستعد للخدمة</strong>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{store.branch}</span>
        </div>

        <div className="saas-chat-scroll">
          {history.length === 0 ? (
            <div className="saas-empty-state" style={{ padding: "4rem 1rem" }}>
              <div className="saas-empty-icon"><Bot size={30} /></div>
              <h3 className="saas-empty-title">كيف يمكنني مساعدتك اليوم؟</h3>
              <p className="saas-empty-desc">
                اكتب أي استفسار باللغة العربية أو اختر أحد الأسئلة المقترحة أعلاه للبدء.
              </p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} style={{ display: "grid", gap: "0.9rem" }}>
                <div className="saas-msg-row user">
                  <div className="saas-msg-avatar user"><User size={16} /></div>
                  <div className="saas-msg-bubble user">{item.message}</div>
                </div>

                <div className="saas-msg-row assistant">
                  <div className="saas-msg-avatar assistant"><Bot size={16} /></div>
                  <div>
                    {item.result.tools_called?.length ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.6rem", background: "var(--bg-hover)", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                        <Zap size={12} />
                        تمت المتابعة عبر: {item.result.tools_called.map(toolLabel).join(" · ")}
                      </div>
                    ) : null}
                    <div className="saas-msg-bubble assistant">
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.result.response || item.result.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ marginTop: "0.5rem" }}>
              <AgentFlowVisualizer loading={loading} />
              <div className="saas-msg-row assistant" style={{ marginTop: "0.5rem" }}>
                <div className="saas-msg-avatar assistant"><Loader2 size={16} className="spin" /></div>
                <div className="saas-skeleton" style={{ width: "340px", height: "50px", borderRadius: "14px" }} />
              </div>
            </div>
          )}
        </div>

        <div className="saas-chat-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="saas-input-box"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب استفسارك للمساعد الذكي..."
              disabled={loading}
            />
            <button className="saas-btn-primary" disabled={loading || !message.trim()}>
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. CUSTOMER DESK
// ==========================================
function CustomerDesk({ store, showToast }: { store: StoreCustomization; showToast: (m: string) => void }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const chips = [
    `ما هي خيارات الشحن لمدينة عدن، تعز، وحضرموت؟`,
    `كيف يتم السداد عبر بنك الكريمي وتطبيق جيب؟`,
    `ما هو ضمان جودة عسل السدر الدوعني الملكي؟`,
  ];

  const submit = async (q = question) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await askCustomer(q.trim());
      setHistory((prev) => [...prev, { question: q.trim(), answer: res.answer || "تمت الإجابة." }]);
      setQuestion("");
    } catch (err: any) {
      setHistory((prev) => [...prev, { question: q.trim(), answer: `⚠️ تعذّر الاتصال: ${err?.message || "خطأ"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <MessageCircle size={14} />
            خدمة العملاء
          </span>
          <h1 className="saas-page-title">خدمة العملاء والردود الذكية</h1>
          <p className="saas-page-subtitle">
            الردود المعتمدة لعملاء {store.storeName} حول المنتجات وسياسات التوصيل والدفع.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {chips.map((c, i) => (
          <button
            key={i}
            className="saas-btn-ghost"
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", borderRadius: "999px" }}
            onClick={() => submit(c)}
            disabled={loading}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="saas-chat-pane" style={{ minHeight: "480px" }}>
        <div className="saas-chat-scroll">
          {history.length === 0 ? (
            <div className="saas-empty-state" style={{ padding: "3rem 1rem" }}>
              <div className="saas-empty-icon"><MessageCircle size={28} /></div>
              <h4 className="saas-empty-title">خدمة العملاء جاهزة</h4>
              <p className="saas-empty-desc">اطرح سؤال العميل أو اختر أحد النماذج أعلاه.</p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} style={{ display: "grid", gap: "0.8rem" }}>
                <div className="saas-msg-row user">
                  <div className="saas-msg-avatar user"><User size={16} /></div>
                  <div className="saas-msg-bubble user">{item.question}</div>
                </div>
                <div className="saas-msg-row assistant">
                  <div className="saas-msg-avatar assistant"><Bot size={16} /></div>
                  <div className="saas-msg-bubble assistant">{item.answer}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="saas-chat-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="saas-input-box"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اكتب استفسار العميل هنا..."
              disabled={loading}
            />
            <button className="saas-btn-primary" disabled={loading || !question.trim()}>
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. LOGISTICS & REAL SHIPMENTS
// ==========================================
function LogisticsHub({
  store,
  shipments,
  saveShipments,
  showToast,
}: {
  store: StoreCustomization;
  shipments: Shipment[];
  saveShipments: (s: Shipment[]) => void;
  showToast: (m: string) => void;
}) {
  const [orderQuery, setOrderQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedForWaybill, setSelectedForWaybill] = useState<Shipment | null>(null);

  // New Shipment State
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState(`AZAL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newCustomer, setNewCustomer] = useState("");
  const [newDest, setNewDest] = useState("صنعاء");
  const [newCarrier, setNewCarrier] = useState("شركة الأمانة للشحن");
  const [newItems, setNewItems] = useState("");

  const handleTrack = async (id = orderQuery) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await queryTracking(id.trim());
      setResult(res);
    } catch {
      // Look up in real user shipments
      const found = shipments.find((s) => s.id.toUpperCase() === id.trim().toUpperCase());
      if (found) {
        setResult({
          status: "ok",
          answer: `شحنة العميل ${found.customer} رقم (${found.id}) متجهة إلى ${found.dest} عبر ${found.carrier} (${found.items}). الحالة الحالية: ${found.status}.`,
          data: { order_id: found.id, carrier: found.carrier, destination: found.dest, status: found.status },
        });
      } else {
        setResult({ status: "failed", answer: `لم يتم العثور على شحنة بالرقم ${id}. يرجى مراجعة الجدول أدناه أو إضافة الشحنة أولاً.` });
      }
    } finally {
      setLoading(false);
    }
  };

  const addShipment = (e: FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newItems.trim()) return;

    const created: Shipment = {
      id: newId.trim().toUpperCase(),
      customer: newCustomer.trim(),
      dest: newDest.trim(),
      carrier: newCarrier.trim(),
      status: "في الطريق",
      items: newItems.trim(),
    };

    saveShipments([created, ...shipments]);
    setShowAdd(false);
    setNewCustomer("");
    setNewItems("");
    setNewId(`AZAL-${Math.floor(1000 + Math.random() * 9000)}`);
    showToast(`تمت إضافة الشحنة (${created.id}) بنجاح!`);
    handleTrack(created.id);
  };

  const deleteShipment = (id: string) => {
    saveShipments(shipments.filter((s) => s.id !== id));
    showToast(`تم حذف الشحنة (${id})`);
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <Truck size={14} />
            العمليات والشحنات
          </span>
          <h1 className="saas-page-title">إدارة وتتبع الشحنات الحقيقية</h1>
          <p className="saas-page-subtitle">
            سجّل طلباتك الفعلية، تابع حالة النقل مع شركات الشحن، واستعلم عن أي شحنة فوراً.
          </p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            إضافة شحنة جديدة
          </button>
        </div>
      </div>

      {/* Add Shipment Form */}
      {showAdd && (
        <div className="saas-panel">
          <div className="saas-panel-header">
            <h3 className="saas-panel-title">تسجيل شحنة جديدة في المتجر</h3>
            <button className="saas-btn-ghost" onClick={() => setShowAdd(false)}>إلغاء</button>
          </div>
          <form onSubmit={addShipment} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>رقم الشحنة</label>
              <input value={newId} onChange={(e) => setNewId(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>اسم العميل</label>
              <input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="مثال: يحيى المطري" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>المدينة / المحافظة</label>
              <input value={newDest} onChange={(e) => setNewDest(e.target.value)} placeholder="مثال: عدن - كريتر" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>شركة الشحن</label>
              <select value={newCarrier} onChange={(e) => setNewCarrier(e.target.value)}>
                <option value="شركة الأمانة للشحن">شركة الأمانة للشحن</option>
                <option value="مؤسسة الرويشان للنقل">مؤسسة الرويشان للنقل</option>
                <option value="مكتب البراق">مكتب البراق</option>
                <option value="توصيل محلي">توصيل محلي</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>محتويات الطلب</label>
              <input value={newItems} onChange={(e) => setNewItems(e.target.value)} placeholder="مثال: 1 كجم عسل سدر دوعني + بن مطري" required />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="saas-btn-primary">
                <Save size={16} />
                حفظ الشحنة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Query Bar */}
      <div className="saas-panel">
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="أدخل رقم الشحنة للاستعلام عنها (مثال: AZAL-8921)..."
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          />
          <button className="saas-btn-primary" onClick={() => handleTrack()} disabled={loading || !orderQuery.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
            تتبع
          </button>
        </div>
      </div>

      {result && (
        <div className="saas-panel">
          <div className="saas-panel-header">
            <h3 className="saas-panel-title">نتيجة استعلام الشحنة</h3>
            <span className="saas-status-pill success">{result.data?.status || "شحنة مسجلة"}</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.96rem", lineHeight: 1.8 }}>{result.answer}</p>
        </div>
      )}

      {/* Real Shipments Table */}
      <div className="saas-panel">
        <div className="saas-panel-header">
          <h3 className="saas-panel-title">قائمة الشحنات الحالية ({shipments.length})</h3>
        </div>

        {shipments.length === 0 ? (
          <div className="saas-empty-state">
            <div className="saas-empty-icon"><Package size={26} /></div>
            <h4 className="saas-empty-title">لا توجد شحنات مسجلة بعد</h4>
            <p className="saas-empty-desc">اضغط على زر "إضافة شحنة جديدة" لتسجيل أول طلب في متجرك.</p>
          </div>
        ) : (
          <div className="saas-table-wrap">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>رقم الشحنة</th>
                  <th>العميل</th>
                  <th>الوجهة</th>
                  <th>شركة الشحن</th>
                  <th>المحتويات</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800 }}>{s.id}</td>
                    <td>{s.customer}</td>
                    <td>{s.dest}</td>
                    <td>{s.carrier}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{s.items}</td>
                    <td><span className="saas-status-pill success">{s.status}</span></td>
                    <td style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="saas-btn-ghost"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", color: "var(--brand-blue)" }}
                        onClick={() => setSelectedForWaybill(s)}
                        title="طباعة بوليصة شحن رسمية"
                      >
                        <Printer size={13} />
                        بوليصة
                      </button>
                      <button
                        className="saas-btn-ghost"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                        onClick={() => {
                          setOrderQuery(s.id);
                          handleTrack(s.id);
                        }}
                      >
                        تتبع
                      </button>
                      <button
                        className="saas-btn-ghost"
                        style={{ padding: "0.25rem 0.6rem", color: "var(--brand-rose)" }}
                        onClick={() => deleteShipment(s.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Waybill Modal */}
      {selectedForWaybill && (
        <PrintableWaybillModal
          shipment={selectedForWaybill}
          store={store}
          onClose={() => setSelectedForWaybill(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 5. SALES & REAL COUPONS
// ==========================================
function SalesEngine({
  store,
  coupons,
  saveCoupons,
  showToast,
}: {
  store: StoreCustomization;
  coupons: Coupon[];
  saveCoupons: (c: Coupon[]) => void;
  showToast: (m: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("10%");
  const [newDesc, setNewDesc] = useState("");

  const addCoupon = (e: FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newDesc.trim()) return;

    const created: Coupon = {
      code: newCode.trim().toUpperCase(),
      discount: newDiscount.includes("%") ? newDiscount : `${newDiscount}% خصم`,
      desc: newDesc.trim(),
    };

    saveCoupons([...coupons, created]);
    setShowAdd(false);
    setNewCode("");
    setNewDesc("");
    showToast(`تم إنشاء كود الخصم (${created.code}) بنجاح!`);
  };

  const deleteCoupon = (code: string) => {
    saveCoupons(coupons.filter((c) => c.code !== code));
    showToast(`تم حذف الكوبون (${code})`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`تم نسخ الكود (${code}) بنجاح!`);
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <Tag size={14} />
            المبيعات والعروض
          </span>
          <h1 className="saas-page-title">كوبونات الخصم والعروض الترويجية</h1>
          <p className="saas-page-subtitle">
            إدارة وإنشاء أكواد الخصم النشطة في {store.storeName}.
          </p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            إنشاء كود خصم جديد
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="saas-panel">
          <div className="saas-panel-header">
            <h3 className="saas-panel-title">إنشاء كود ترويجي جديد</h3>
            <button className="saas-btn-ghost" onClick={() => setShowAdd(false)}>إلغاء</button>
          </div>
          <form onSubmit={addCoupon} style={{ display: "grid", gridTemplateColumns: "1fr 140px 1.5fr auto", gap: "0.85rem", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.3rem" }}>رمز الكود</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="مثال: SPRING26" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.3rem" }}>نسبة الخصم</label>
              <input value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} placeholder="مثال: 15%" required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.3rem" }}>الوصف</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="مثال: خصم لعملاء المتجر المميزين" required />
            </div>
            <button type="submit" className="saas-btn-primary">حفظ الكود</button>
          </form>
        </div>
      )}

      <div className="saas-panel">
        <div className="saas-panel-header">
          <h3 className="saas-panel-title">الأكواد الفعّالة ({coupons.length})</h3>
        </div>

        {coupons.length === 0 ? (
          <div className="saas-empty-state">
            <div className="saas-empty-icon"><Tag size={26} /></div>
            <h4 className="saas-empty-title">لا توجد كوبونات مضافة بعد</h4>
            <p className="saas-empty-desc">اضغط على زر "إنشاء كود خصم جديد" لإضافة أول كود لعملائك.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {coupons.map((c) => (
              <div
                key={c.code}
                style={{
                  border: "1px dashed var(--border-strong)",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  background: "var(--bg-hover)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "1.15rem", letterSpacing: "0.05em" }}>{c.code}</strong>
                    <span className="saas-status-pill success">{c.discount}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)" }}>{c.desc}</p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button className="saas-btn-ghost" onClick={() => copyCode(c.code)}>
                    <Copy size={14} />
                    نسخ
                  </button>
                  <button className="saas-btn-ghost" style={{ color: "var(--brand-rose)" }} onClick={() => deleteCoupon(c.code)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. RETURNS & GUARANTEE
// ==========================================
function ReturnsDesk({ store, showToast }: { store: StoreCustomization; showToast: (m: string) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleCheck = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await checkReturns(query.trim());
      setResponse(res);
      setQuery("");
    } catch (err: any) {
      setResponse({ status: "failed", answer: `تعذّر فحص الإرجاع: ${err?.message || "خطأ"}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <RotateCcw size={14} />
            خدمة ما بعد البيع
          </span>
          <h1 className="saas-page-title">فحص المرتجعات وسياسة الضمان</h1>
          <p className="saas-page-subtitle">
            سياسة معتمدة لضمان رضا عملاء {store.storeName} وتسهيل الاسترجاع والاستبدال.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="saas-panel">
          <strong style={{ display: "block", fontSize: "1.05rem", marginBottom: "0.3rem" }}>
            مهلة الاسترجاع ({store.returnDays} أيام)
          </strong>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            استرجاع كامل المبلغ خلال {store.returnDays} أيام من استلام الطلب شرط سلامة المنتج.
          </p>
        </div>

        <div className="saas-panel">
          <strong style={{ display: "block", fontSize: "1.05rem", marginBottom: "0.3rem" }}>
            مهلة الاستبدال ({store.exchangeDays} أيام)
          </strong>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            استبدال سهل للمنتجات عبر مكاتب الشحن المعتمدة في كافة المحافظات اليمنية.
          </p>
        </div>

        <div className="saas-panel">
          <strong style={{ display: "block", fontSize: "1.05rem", marginBottom: "0.3rem" }}>
            ضمان الجودة والأصالة 100%
          </strong>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            ضمان ذهبي موثق على نقاء العسل والبن اليمني دون أي إضافات.
          </p>
        </div>
      </div>

      <div className="saas-panel">
        <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
          فحص أهلية طلب استرجاع أو استبدال
        </label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثال: استلم العميل الطلب ويريد استبدال العسل أو استرجاعه..."
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <button className="saas-btn-primary" onClick={handleCheck} disabled={loading || !query.trim()}>
            {loading ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
            فحص الأهلية
          </button>
        </div>
      </div>

      {response && (
        <div className="saas-panel">
          <h3 className="saas-panel-title" style={{ marginBottom: "0.5rem" }}>إفادة وتوجيه المرتجع</h3>
          <p style={{ margin: 0, fontSize: "0.96rem", lineHeight: 1.8 }}>{response.answer}</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. INVOICE AUDITOR
// ==========================================
function InvoiceAuditor({ store, showToast }: { store: StoreCustomization; showToast: (m: string) => void }) {
  const [samples, setSamples] = useState<string[]>([]);
  const [sampleName, setSampleName] = useState("");
  const [result, setResult] = useState<DocumentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listSamples()
      .then((res) => {
        setSamples(res.data);
        setSampleName(res.data[0] ?? "");
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await analyzeDocument({ sampleName });
      setResult(res);
    } catch {
      showToast("تعذّر تحليل الفاتورة.");
    } finally {
      setLoading(false);
    }
  };

  const data = result?.result.data;

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <ReceiptText size={14} />
            التدقيق والمشتريات
          </span>
          <h1 className="saas-page-title">تدقيق فواتير التوريد</h1>
          <p className="saas-page-subtitle">
            استخراج آلي وتدقيق حسابي لفواتير الموردين بـ {store.currency}.
          </p>
        </div>
      </div>

      <div className="saas-panel">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              اختر الفاتورة للتدقيق الحسابي
            </label>
            <select value={sampleName} onChange={(e) => setSampleName(e.target.value)}>
              {samples.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button className="saas-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <ReceiptText size={16} />}
            تدقيق الفاتورة
          </button>
        </div>
      </div>

      {result && data && (
        <div className="saas-panel">
          <div className="saas-panel-header">
            <div>
              <h3 className="saas-panel-title">بيانات الفاتورة: {result.name}</h3>
              <p className="saas-panel-desc">{String(data.vendor_name ?? "—")}</p>
            </div>
            <span className="saas-status-pill success">مطابقة ومتوافقة</span>
          </div>

          <div className="saas-kpi-grid">
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">المورّد</span>
              <span className="saas-kpi-value" style={{ fontSize: "1.05rem" }}>{String(data.vendor_name ?? "—")}</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">التاريخ</span>
              <span className="saas-kpi-value" style={{ fontSize: "1.05rem" }}>{String(data.invoice_date ?? "—")}</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">قبل الضريبة</span>
              <span className="saas-kpi-value" style={{ fontSize: "1.05rem" }}>{data.subtotal?.toLocaleString()} {store.currency}</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">الإجمالي النهائي</span>
              <span className="saas-kpi-value" style={{ fontSize: "1.05rem", color: "var(--brand-emerald)" }}>{data.total?.toLocaleString()} {store.currency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. SPEND & COMPLIANCE ANALYTICS
// ==========================================
function ComplianceAnalytics({ store, showToast }: { store: StoreCustomization; showToast: (m: string) => void }) {
  const [report, setReport] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    getComplianceReport(selectedYear, selectedMonth, true)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const aggregates = report?.structured?.aggregates;

  const monthButtons = [
    { label: "نوفمبر 2025", yr: 2025, mo: 11 },
    { label: "يناير 2026", yr: 2026, mo: 1 },
    { label: "فبراير 2026", yr: 2026, mo: 2 },
    { label: "مارس 2026", yr: 2026, mo: 3 },
  ];

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <BarChart3 size={14} />
            التقارير المالية والامتثال
          </span>
          <h1 className="saas-page-title">تحليلات الإنفاق ومشتريات الموردين</h1>
          <p className="saas-page-subtitle">
            ملخص الإنفاق على البضائع والشحن وسلاسل الإمداد لـ {store.storeName}.
          </p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-primary" onClick={() => setShowPrintModal(true)}>
            <Printer size={15} />
            تصدير التقرير التنفيذي (PDF)
          </button>
        </div>
      </div>

      {/* Month Selector Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {monthButtons.map((m) => {
          const isAct = selectedYear === m.yr && selectedMonth === m.mo;
          return (
            <button
              key={`${m.yr}-${m.mo}`}
              className={isAct ? "saas-btn-primary" : "saas-btn-ghost"}
              style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: "999px" }}
              onClick={() => {
                setSelectedYear(m.yr);
                setSelectedMonth(m.mo);
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="saas-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <Loader2 size={24} className="spin" style={{ margin: "0 auto 0.75rem", color: "var(--brand-blue)" }} />
          <p style={{ margin: 0, fontWeight: 700, color: "var(--text-muted)" }}>جاري تحليل البيانات المالية واستدعاء وكيل الامتثال...</p>
        </div>
      ) : aggregates ? (
        <>
          <div className="saas-kpi-grid">
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">إجمالي الإنفاق</span>
              <span className="saas-kpi-value">{aggregates.total_spend?.toLocaleString()} {store.currency}</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">عدد الفواتير المدققة</span>
              <span className="saas-kpi-value">{aggregates.invoice_count} فواتير</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">متوسط الفاتورة</span>
              <span className="saas-kpi-value">{aggregates.median_invoice?.toLocaleString()} {store.currency}</span>
            </div>
            <div className="saas-kpi-card">
              <span className="saas-kpi-label">أكبر مورد</span>
              <span className="saas-kpi-value" style={{ fontSize: "1.05rem" }}>{aggregates.largest_invoice?.vendor_name || "—"}</span>
            </div>
          </div>

          {/* Interactive Monthly Spend Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">
                <TrendingUp size={18} style={{ color: "var(--brand-blue)" }} />
                <span>حركة الإنفاق والمشتريات الشهرية</span>
              </div>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>القيم بـ ({store.currency})</span>
            </div>

            <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "1.5rem", padding: "1rem 0.5rem 0.5rem" }}>
              {[
                { label: "نوفمبر 25", value: 100, display: "100", active: selectedYear === 2025 && selectedMonth === 11, yr: 2025, mo: 11 },
                { label: "يناير 26", value: 6000000, display: "6.0M", active: selectedYear === 2026 && selectedMonth === 1, yr: 2026, mo: 1 },
                { label: "فبراير 26", value: 6000000, display: "6.0M", active: selectedYear === 2026 && selectedMonth === 2, yr: 2026, mo: 2 },
                { label: "مارس 26", value: 6000000, display: "6.0M", active: selectedYear === 2026 && selectedMonth === 3, yr: 2026, mo: 3 },
              ].map((b, i) => {
                const heightPct = b.value === 100 ? 12 : 90;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedYear(b.yr);
                      setSelectedMonth(b.mo);
                    }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", height: "100%", justifyContent: "flex-end" }}
                  >
                    <span style={{ fontSize: "0.76rem", fontWeight: 800, marginBottom: "0.35rem", color: b.active ? "var(--brand-blue)" : "var(--text-muted)" }}>
                      {b.display}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "54px",
                        height: `${heightPct}%`,
                        background: b.active ? "var(--brand-blue)" : "var(--border-hover)",
                        borderRadius: "6px 6px 0 0",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, marginTop: "0.5rem", color: b.active ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suppliers Breakdown */}
          <div className="saas-panel">
            <div className="saas-panel-header">
              <h3 className="saas-panel-title">توزيع مشتريات كبار الموردين</h3>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>إجمالي 4 موردين رئيسيين</span>
            </div>

            <div style={{ display: "grid", gap: "1rem", marginTop: "0.5rem" }}>
              {[
                { name: "مناحل وادي دوعن للعسل الملكي", amount: "2,850,000", pct: 47.5, color: "#f59e0b" },
                { name: "مزارع بني يافع للبن الأخضر", amount: "1,720,000", pct: 28.7, color: "#10b981" },
                { name: "ورش الفضيات والعقيق الصنعاني", amount: "980,000", pct: 16.3, color: "#6366f1" },
                { name: "شركة الشحن والتغليف السريع - صنعاء", amount: "450,000", pct: 7.5, color: "#06b6d4" },
              ].map((sup, idx) => (
                <div key={idx} className="supplier-progress-row">
                  <div className="supplier-progress-info">
                    <span>{sup.name}</span>
                    <span>{sup.amount} {store.currency} ({sup.pct}%)</span>
                  </div>
                  <div className="supplier-progress-track">
                    <div
                      className="supplier-progress-fill"
                      style={{ width: `${sup.pct}%`, background: sup.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report?.narrative && (
            <div className="saas-panel">
              <h3 className="saas-panel-title" style={{ marginBottom: "0.75rem" }}>التقرير التحليلي للإدارة التنفيذية</h3>
              <div style={{ fontSize: "0.95rem", lineHeight: 1.8 }}>
                {normalizeNarrative(report.narrative).map((line, idx) => (
                  <p key={idx} style={{ margin: "0.35rem 0" }}>• {line}</p>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Printable Executive Report Modal */}
      {showPrintModal && (
        <PrintableExecutiveReportModal
          store={store}
          aggregates={aggregates}
          narrative={report?.narrative}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// 9. STORE CUSTOMIZATION (USER CUSTOMIZES EVERYTHING)
// ==========================================
function CustomizationHub({
  store,
  updateStore,
}: {
  store: StoreCustomization;
  updateStore: (next: StoreCustomization) => void;
}) {
  const [form, setForm] = useState<StoreCustomization>(store);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateStore(form);
  };

  return (
    <div>
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <Settings size={14} />
            الإعدادات والتخصيص
          </span>
          <h1 className="saas-page-title">تخصيص بيانات وهوية متجرك</h1>
          <p className="saas-page-subtitle">
            عدّل اسم المتجر، الشعار، الفروع، العملة المعتمدة، وأرقام التواصل لتكون المنظومة مطابقة لنشاطك الفعلي.
          </p>
        </div>
        <div className="saas-page-actions">
          <button className="saas-btn-primary" onClick={handleSubmit}>
            <Save size={16} />
            حفظ التغييرات
          </button>
        </div>
      </div>

      <div className="saas-panel">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                اسم المتجر / البراند
              </label>
              <input
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                الفرع أو المستودع الرئيسي
              </label>
              <input
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              شعار المتجر أو الوصف التعريفي (Tagline)
            </label>
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                العملة المعتمدة في المتجر
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="ر.ي">ريال يمني (ر.ي)</option>
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="$">دولار أمريكي ($)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                رقم خدمة العملاء أو الواتساب
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                مهلة الاسترجاع (بالأيام)
              </label>
              <input
                type="number"
                value={form.returnDays}
                onChange={(e) => setForm({ ...form, returnDays: Number(e.target.value) })}
                min={1}
                max={30}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                مهلة الاستبدال (بالأيام)
              </label>
              <input
                type="number"
                value={form.exchangeDays}
                onChange={(e) => setForm({ ...form, exchangeDays: Number(e.target.value) })}
                min={1}
                max={60}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="submit" className="saas-btn-primary">
              <Save size={16} />
              حفظ التخصيص الآن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// LLM PROVIDERS & API CONFIGURATION HUB
// ==========================================
function ProvidersHub({ showToast }: { showToast: (msg: string) => void }) {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "local" | "cloud">("all");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<
    Record<string, { testing?: boolean; success?: boolean; message?: string; sampleReply?: string }>
  >({});

  useEffect(() => {
    getLLMSettings()
      .then((res) => {
        if (res?.data) {
          setConfig(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load LLM settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSetActive = (key: string) => {
    if (!config) return;
    setConfig({ ...config, active_provider: key });
    showToast(`تم تعيين (${config.providers[key]?.name || key}) كمزود نشط!`);
  };

  const handleUpdateProvider = (key: string, field: keyof LLMProviderInfo, val: string | boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [key]: {
          ...config.providers[key],
          [field]: val,
        },
      },
    });
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestConnection = async (key: string) => {
    if (!config) return;
    const prov = config.providers[key];
    if (!prov) return;

    setTestResults((prev) => ({ ...prev, [key]: { testing: true } }));
    try {
      const res = await testLLMConnection({
        base_url: prov.base_url,
        api_key: prov.api_key,
        model: prov.model,
      });
      if (res.status === "ok") {
        setTestResults((prev) => ({
          ...prev,
          [key]: { testing: false, success: true, message: res.message, sampleReply: res.sample_reply },
        }));
        showToast(`الاتصال ناجح مع ${prov.name}!`);
      } else {
        setTestResults((prev) => ({
          ...prev,
          [key]: { testing: false, success: false, message: res.message || "فشل الاتصال بالمزود." },
        }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [key]: { testing: false, success: false, message: err.message || "تعذر الاتصال بالمزود." },
      }));
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await saveLLMSettings(config);
      showToast("تم حفظ كافة إعدادات مزودي الذكاء الاصطناعي بنجاح!");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="saas-panel" style={{ display: "grid", placeItems: "center", padding: "4rem" }}>
        <Loader2 className="animate-spin" size={32} />
        <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>جاري تحميل إعدادات المزودين...</p>
      </div>
    );
  }

  const providerEntries = Object.entries(config.providers).filter(([_, p]) => {
    if (filter === "local") return p.is_local;
    if (filter === "cloud") return !p.is_local;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="saas-page-header">
        <div className="saas-page-title-wrap">
          <span className="saas-page-eyebrow">
            <Cpu size={14} />
            إدارة مزودات الذكاء الاصطناعي و API
          </span>
          <h1 className="saas-page-title">مزودات الذكاء الاصطناعي (LLM & API Keys)</h1>
          <p className="saas-page-subtitle">
            تحكّم بالمزود النشط ومفاتيح الربط البرمجي (API Keys) ونماذج التوليد لكل مزود سواء كان محلياً على جهازك (LM Studio / Ollama) أو سحابياً (OpenAI, Gemini, DeepSeek, Groq, OpenRouter).
          </p>
        </div>
        <div className="saas-page-actions">
          <button type="button" className="saas-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            حفظ كافة التغييرات
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={filter === "all" ? "saas-btn-primary" : "saas-btn-ghost"}
          style={{ height: "38px", minHeight: "38px", borderRadius: "999px", padding: "0 1.1rem" }}
          onClick={() => setFilter("all")}
        >
          كافة المزودين ({Object.keys(config.providers).length})
        </button>
        <button
          type="button"
          className={filter === "local" ? "saas-btn-primary" : "saas-btn-ghost"}
          style={{ height: "38px", minHeight: "38px", borderRadius: "999px", padding: "0 1.1rem" }}
          onClick={() => setFilter("local")}
        >
          المزودات المحلية (مجاني / GPU)
        </button>
        <button
          type="button"
          className={filter === "cloud" ? "saas-btn-primary" : "saas-btn-ghost"}
          style={{ height: "38px", minHeight: "38px", borderRadius: "999px", padding: "0 1.1rem" }}
          onClick={() => setFilter("cloud")}
        >
          المزودات السحابية (Cloud API)
        </button>
      </div>

      {/* Providers Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {providerEntries.map(([key, prov]) => {
          const isActive = config.active_provider === key;
          const test = testResults[key];
          const isKeyVisible = !!showKeys[key];

          return (
            <div key={key} className={`saas-provider-card ${isActive ? "active" : ""}`}>
              {/* Card Header */}
              <div className="saas-provider-header">
                <div className="saas-provider-meta">
                  <div className="saas-provider-icon">
                    {prov.is_local ? <Cpu size={22} /> : <Globe size={22} />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{prov.name}</h3>
                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      {prov.is_local ? "تشغيل محلي (Local Engine)" : "سحابي (Cloud Service)"}
                    </span>
                  </div>
                </div>

                {isActive ? (
                  <span className="saas-badge-active">
                    <Check size={13} />
                    المزود النشط
                  </span>
                ) : (
                  <button
                    type="button"
                    className="saas-btn-ghost"
                    style={{ height: "32px", minHeight: "32px", fontSize: "0.8rem", borderRadius: "8px", padding: "0 0.8rem" }}
                    onClick={() => handleSetActive(key)}
                  >
                    تفعيل كمزود نشط
                  </button>
                )}
              </div>

              {/* Form Inputs */}
              <div style={{ display: "grid", gap: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                    رابط المزود (Endpoint URL)
                  </label>
                  <input
                    value={prov.base_url}
                    onChange={(e) => handleUpdateProvider(key, "base_url", e.target.value)}
                    placeholder="https://api..."
                    style={{ direction: "ltr", textAlign: "left", fontFamily: "monospace", fontSize: "0.86rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                    اسم النموذج (Model ID)
                  </label>
                  <input
                    value={prov.model}
                    onChange={(e) => handleUpdateProvider(key, "model", e.target.value)}
                    placeholder="e.g. gemma-4-e2b-it, gpt-4o"
                    style={{ direction: "ltr", textAlign: "left", fontFamily: "monospace", fontSize: "0.86rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                    مفتاح الـ API (API Key)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={isKeyVisible ? "text" : "password"}
                      value={prov.api_key}
                      onChange={(e) => handleUpdateProvider(key, "api_key", e.target.value)}
                      placeholder={prov.is_local ? "اختياري للمزود المحلي" : "أدخل مفتاح الـ API الخاص بك هنا"}
                      style={{ direction: "ltr", textAlign: "left", paddingLeft: "2.5rem", fontFamily: "monospace", fontSize: "0.86rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(key)}
                      style={{
                        position: "absolute",
                        left: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        padding: "4px",
                        minHeight: "auto",
                        color: "var(--text-muted)",
                      }}
                      title={isKeyVisible ? "إخفاء المفتاح" : "إظهار المفتاح"}
                    >
                      {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem", marginTop: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="saas-btn-secondary"
                    style={{ height: "36px", minHeight: "36px", fontSize: "0.82rem", padding: "0 0.9rem" }}
                    onClick={() => handleTestConnection(key)}
                    disabled={test?.testing}
                  >
                    {test?.testing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                    اختبار الاتصال
                  </button>

                  {test && test.message && (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: test.success ? "var(--brand-emerald)" : "var(--brand-rose)",
                      }}
                    >
                      {test.success ? "✓ متصل بنجاح" : "✗ خطأ في الاتصال"}
                    </span>
                  )}
                </div>

                {test && test.message && (
                  <div
                    style={{
                      marginTop: "0.6rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      background: test.success ? "rgba(16, 185, 129, 0.08)" : "rgba(225, 29, 72, 0.08)",
                      border: `1px solid ${test.success ? "rgba(16, 185, 129, 0.2)" : "rgba(225, 29, 72, 0.2)"}`,
                      color: test.success ? "var(--brand-emerald)" : "var(--brand-rose)",
                    }}
                  >
                    {test.message}
                    {test.sampleReply && (
                      <div style={{ marginTop: "0.25rem", color: "var(--text-primary)", fontSize: "0.78rem" }}>
                        عينة الرد: <strong>"{test.sampleReply}"</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Parameters Panel */}
      <div className="saas-panel">
        <div className="saas-panel-header">
          <div>
            <h3 className="saas-panel-title">
              <Sparkles size={20} />
              معايير التوليد والذكاء العامة
            </h3>
            <p className="saas-panel-desc">تحكّم بدرجة إبداع الردود وسقف طول الإجابة لجميع الوكلاء.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 700 }}>درجة الإبداع (Temperature)</label>
              <span style={{ fontWeight: 800, color: "var(--brand-accent)" }}>{config.temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              style={{ width: "100%", padding: 0 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
              <span>دقيق ومحدد (0.0)</span>
              <span>متوازن (0.7)</span>
              <span>إبداعي ومتنوع (1.0)</span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              الحد الأقصى لطول الرد (Max Tokens)
            </label>
            <select
              value={config.max_tokens}
              onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
            >
              <option value="512">512 رمز (ردود فائقة الإيجاز)</option>
              <option value="1024">1024 رمز (معتدل - موصى به لخدمة العملاء)</option>
              <option value="2048">2048 رمز (ردود تفصيلية وتقارير)</option>
              <option value="4096">4096 رمز (شامل للمستندات والتحليلات الطويلة)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button type="button" className="saas-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            حفظ إعدادات المزودين والمعايير
          </button>
        </div>
      </div>
    </div>
  );
}

// Mount Root
createRoot(document.getElementById("root")!).render(<App />);
