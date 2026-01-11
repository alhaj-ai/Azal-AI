export const months = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatCurrency(value: unknown, currency = "ر.ي") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 0,
  }).format(amount)} ${currency}`;
}

export function formatSar(value: unknown) {
  // Localized alias defaulting to Yemeni Rial for Azal Store
  return formatCurrency(value, "ر.ي");
}

export function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    ask_customer_agent: "وكيل خدمة العملاء",
    ask_document_agent: "وكيل تحليل الفواتير",
    ask_compliance_agent: "وكيل تقارير الامتثال",
    ask_tracking_agent: "وكيل تتبع الشحنات والعمليات",
    ask_sales_agent: "وكيل المبيعات والعروض",
    ask_returns_agent: "وكيل المرتجعات والاستبدال",
  };
  return labels[tool] ?? tool;
}

export function normalizeNarrative(text?: string | null) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => index !== 0 || !/^تقرير .{0,30}\d{4}.{0,10}:?\s*$/.test(line))
    .map((line) => line.replace(/^[\d٠-٩]+[\.)]\s*/, "").replace(/^[-*•]\s*/, ""));
}
