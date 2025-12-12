export const toCents = (amount: number | string) => Math.round(Number(amount) * 100);
export const fromCents = (cents: number) => Number(cents || 0) / 100;

export const fmtCurrency = (cents: number, currency: string = "EGP", locale?: string) => {
  const value = fromCents(cents);
  const resolvedLocale = locale || (currency === "USD" ? "en-US" : "en");
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export const fmtEGP = (cents: number, locale: string = "en-EG") => fmtCurrency(cents, "EGP", locale);
