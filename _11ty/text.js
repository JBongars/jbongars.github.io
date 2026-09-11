function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeNumericEntity(digits, radix) {
  const codePoint = Number.parseInt(digits, radix);
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10_ff_ff) {
    return "";
  }
  return String.fromCodePoint(codePoint);
}

function unescapeHtml(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll(/&#(\d+);/g, (_, digits) => decodeNumericEntity(digits, 10))
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex) => decodeNumericEntity(hex, 16))
    .replaceAll("&amp;", "&");
}

function plainSummary(html, maxLength = 280) {
  const text = String(html || "")
    .replaceAll(/<script[\s\S]*?<\/script>/gi, " ")
    .replaceAll(/<style[\s\S]*?<\/style>/gi, " ")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatResumeDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^present$/i.test(raw)) {
    return "Present";
  }
  const yearMonth = raw.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) {
    const month = MONTHS_SHORT[Number(yearMonth[2]) - 1];
    if (month) {
      return `${month} ${yearMonth[1]}`;
    }
  }
  return raw.replaceAll(/\s*[–-]\s*/g, " – ");
}

export { xmlEscape, escapeHtml, unescapeHtml, plainSummary, formatResumeDate };
