const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Google Sign-In was cancelled. You can try again or sign in with email.",
  oauth_denied: "Google denied the sign-in request. Please try again.",
  not_configured:
    "Google Sign-In is not configured on this server yet. Please sign in with email and password.",
  invalid_state:
    "Google sign-in session expired or cookies were blocked. Ensure cookies are enabled and try again.",
  redirect_uri_mismatch:
    "Google OAuth configuration error: Redirect URI mismatch. Check server GOOGLE_REDIRECT_URI settings.",
  invalid_client:
    "Google OAuth configuration error: Invalid client credentials on server.",
  invalid_grant: "Google authorization expired or was already used. Please try signing in again.",
  token_exchange_failed: "Failed to verify authorization with Google. Please try again.",
  profile_fetch_failed: "Could not retrieve your verified Google profile. Please try again.",
  email_unverified: "Your Google account does not have a verified email address.",
  account_conflict: "This email address is already linked to a different Google account.",
  network_timeout: "Google authentication timed out. Please check your connection and try again.",
  network_error: "Unable to reach Google authentication servers. Please try again shortly.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes before retrying.",
  server_error: "An unexpected server error occurred during Google Sign-In. Please try again.",
};

/**
 * Maps an OAuth error code from redirect query params or popup postMessage
 * to a clear, user-facing error message.
 */
export function mapOAuthErrorMessage(errorCode?: string | null, fallbackMessage?: string): string {
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage.trim();
  }
  if (!errorCode) {
    return "Google Sign-In failed. Please try again or continue with email.";
  }
  return OAUTH_ERROR_MESSAGES[errorCode] || "Google Sign-In failed. Please try again or sign in with email.";
}
