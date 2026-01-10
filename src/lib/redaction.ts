const OTP_HINT =
  /(otp|one[- ]time|passcode|verification|code|pin|password|\u0631\u0645\u0632|\u0643\u0648\u062f|\u062a\u062d\u0642\u0642|\u062a\u0623\u0643\u064a\u062f)/i;
const TOKEN_HINT =
  /(token|reset|verify|auth|password|secret|\u0627\u0639\u0627\u062f\u0629|\u0625\u0639\u0627\u062f\u0629|\u0645\u0631\u0648\u0631)/i;

const OTP_PATTERN = /\b\d{4,8}\b/g;
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{16,}\b/g;
const QUERY_TOKEN_PATTERN = /\b(token|otp|code)=([A-Za-z0-9_-]{4,})/gi;
const QUERY_TOKEN_TEST = /\b(token|otp|code)=([A-Za-z0-9_-]{4,})/i;
const PHONE_PATTERN = /\b\+?\d[\d\s\-()]{6,}\d\b/g;

export function redactSensitiveText(text?: string | null) {
  if (!text) return "";
  let output = text;
  if (OTP_HINT.test(text)) {
    output = output.replace(OTP_PATTERN, "***");
  }
  if (TOKEN_HINT.test(text) || QUERY_TOKEN_TEST.test(text)) {
    output = output.replace(QUERY_TOKEN_PATTERN, "$1=***");
    output = output.replace(TOKEN_PATTERN, "***");
  }
  return output;
}

export function redactPhoneNumbers(text?: string | null) {
  if (!text) return "";
  return text.replace(PHONE_PATTERN, "***");
}
