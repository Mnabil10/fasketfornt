export function maskPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D+/g, "");
  if (digits.length < 4) return "••••";
  const tail = digits.slice(-4);
  return `••• ••${tail}`;
}

export function maskText(text?: string | null, visibleChars = 3) {
  if (!text) return "";
  if (text.length <= visibleChars) return "•••";
  return `${text.slice(0, visibleChars)}•••`;
}

export function maskAddress(address?: string | null) {
  if (!address) return "";
  return maskText(address, 6);
}
