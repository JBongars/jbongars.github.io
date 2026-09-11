function asObjectString(value: object): string {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).join(",");
  }
  if (value instanceof Date) {
    return value.toString();
  }
  return Object.prototype.toString.call(value);
}

function asPrimitiveString(value: string | number | bigint | boolean | symbol): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return value.toString();
}

function asString(value: unknown): string {
  switch (typeof value) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "symbol": {
      return asPrimitiveString(value);
    }
    case "function": {
      return Function.prototype.toString.call(value);
    }
    case "undefined": {
      return "undefined";
    }
    case "object": {
      if (value === null) {
        return "null";
      }
      return asObjectString(value);
    }
  }
}

function asStringOrEmpty(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return asString(value);
}

function xmlEscape(value?: unknown): string {
  return asStringOrEmpty(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value?: unknown): string {
  return asString(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeNumericEntity(digits: string, radix: number): string {
  const codePoint = Number.parseInt(digits, radix);
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10_ff_ff) {
    return "";
  }
  return String.fromCodePoint(codePoint);
}

function unescapeHtml(value: unknown): string {
  return asString(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll(/&#(\d+);/g, (_, digits: string) => decodeNumericEntity(digits, 10))
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex: string) => decodeNumericEntity(hex, 16))
    .replaceAll("&amp;", "&");
}

function plainSummary(html?: unknown, maxLength = 280): string {
  const text = asStringOrEmpty(html)
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

function formatResumeDate(value?: unknown): string {
  const raw = asStringOrEmpty(value).trim();
  if (!raw) {
    return "";
  }
  if (/^present$/i.test(raw)) {
    return "Present";
  }
  const yearMonth = /^(\d{4})-(\d{2})$/.exec(raw);
  const year = yearMonth?.[1];
  const monthToken = yearMonth?.[2];
  if (year !== undefined && monthToken !== undefined) {
    const month = MONTHS_SHORT[Number(monthToken) - 1];
    if (month) {
      return `${month} ${year}`;
    }
  }
  return raw.replaceAll(/\s*[–-]\s*/g, " – ");
}

export {
  asString,
  asStringOrEmpty,
  xmlEscape,
  escapeHtml,
  unescapeHtml,
  plainSummary,
  formatResumeDate,
};
