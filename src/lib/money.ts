export const toCents = (amount: number | string) => Math.round(Number(amount) * 100);
export const fromCents = (cents: number) => Number(cents || 0) / 100;

export const fmtEGP = (cents: number, locale: string = "en-EG") => {
  const value = fromCents(cents);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `EGP ${value.toFixed(2)}`;
  }
};

