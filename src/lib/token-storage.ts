const ACCESS_KEY = "fasket_admin_token";
const REFRESH_KEY = "fasket_admin_refresh";

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

export function getAccessToken() {
  if (memoryAccess) return memoryAccess;
  const sessionToken = sessionStorage.getItem(ACCESS_KEY);
  if (sessionToken) {
    memoryAccess = sessionToken;
    return sessionToken;
  }
  const legacy = localStorage.getItem(ACCESS_KEY);
  if (legacy) {
    memoryAccess = legacy;
    sessionStorage.setItem(ACCESS_KEY, legacy);
    localStorage.removeItem(ACCESS_KEY);
    return legacy;
  }
  return null;
}

export function setAccessToken(token: string | null) {
  memoryAccess = token;
  if (token) {
    sessionStorage.setItem(ACCESS_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_KEY);
  }
  localStorage.removeItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (memoryRefresh) return memoryRefresh;
  const sessionToken = sessionStorage.getItem(REFRESH_KEY);
  if (sessionToken) {
    memoryRefresh = sessionToken;
    return sessionToken;
  }
  const legacy = localStorage.getItem(REFRESH_KEY);
  if (legacy) {
    memoryRefresh = legacy;
    sessionStorage.setItem(REFRESH_KEY, legacy);
    localStorage.removeItem(REFRESH_KEY);
    return legacy;
  }
  return null;
}

export function setRefreshToken(token: string | null) {
  memoryRefresh = token;
  if (token) {
    sessionStorage.setItem(REFRESH_KEY, token);
  } else {
    sessionStorage.removeItem(REFRESH_KEY);
  }
  localStorage.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  memoryAccess = null;
  memoryRefresh = null;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
