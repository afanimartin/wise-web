const DEFAULT_MINOR_UNIT_SCALE = 2;

export function formatMoney(amountMinor: string | number, currency: string, scale = DEFAULT_MINOR_UNIT_SCALE) {
  const minorStr = String(amountMinor || "0").replace(/[^\d]/g, "") || "0";
  const padded = minorStr.padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale) || "0";
  const fraction = padded.slice(-scale);
  const wholeText = Number(whole).toLocaleString("en-US");

  return `${currency} ${wholeText}.${fraction}`;
}

export function formatMoneyParts(amountMinor: string | number, currency: string, scale = DEFAULT_MINOR_UNIT_SCALE) {
  const formatted = formatMoney(amountMinor, currency, scale);
  const [code, ...rest] = formatted.split(" ");
  return {
    currency: code,
    amount: rest.join(" "),
    full: formatted,
  };
}

export function parseMajorToMinor(value: string, scale = DEFAULT_MINOR_UNIT_SCALE): string {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return "";

  const [wholePart = "0", fractionPart = ""] = normalized.split(".");
  const wholeDigits = wholePart.replace(/[^\d]/g, "") || "0";
  const fractionDigits = fractionPart.replace(/[^\d]/g, "").padEnd(scale, "0").slice(0, scale);

  return `${wholeDigits}${fractionDigits}`.replace(/^0+(?=\d)/, "");
}

export function isValidMinorAmount(value: string) {
  return /^\d+$/.test(value) && value !== "0";
}
