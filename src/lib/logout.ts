import { queryClient } from "./queryClient";
import { clearTokens } from "./token-storage";
import { navigateTo } from "./navigation";

export const LOGIN_PATH = "/login";

type LogoutOptions = { redirect?: boolean };

/**
 * Clears all locally cached auth state (tokens, user cache, React Query cache)
 * and optionally redirects to the login screen.
 */
export function clearAuthState(options: LogoutOptions = {}) {
  clearTokens();
  sessionStorage.removeItem("fasket_admin_user");
  localStorage.removeItem("fasket_admin_user");
  queryClient.clear();

  if (options.redirect !== false) {
    navigateTo(LOGIN_PATH, { replace: true });
  }
}
