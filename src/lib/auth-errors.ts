import type { I18nDict } from "@/lib/i18n";

export function isAuthRateLimit(error: unknown): boolean {
  return !!error && typeof error === "object" && (("status" in error && error.status === 429) || ("code" in error && ["over_email_send_rate_limit", "over_request_rate_limit", "rate_limit"].includes(String(error.code))));
}

// 映射稳定错误码，不把内部错误原文或英文 SDK 消息暴露给客户。
export function getAuthErrorMessage(error: unknown, t: I18nDict, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const code = "code" in error ? error.code : "error" in error ? error.error : undefined;
  if (isAuthRateLimit(error)) return t.authErrorRateLimit;
  switch (code) {
    case "invalid_credentials": return t.loginErrorInvalid;
    case "email_not_confirmed": return t.authEmailUnconfirmed;
    case "user_already_exists": case "email_exists": return t.authEmailUnavailable;
    case "email_address_invalid": case "validation_failed": return t.authErrorEmail;
    case "weak_password": return t.authErrorPasswordRequirements;
    case "same_password": return t.authErrorSamePassword;
    case "session_expired": case "session_not_found": case "refresh_token_not_found": return t.resetSessionExpired;
    case "account_changed": return t.resetAccountChanged;
    case "invalid_password": return t.registerErrorPassword;
    case "otp_expired": return t.resetExpired;
    case "reset_send_failed": return t.resetSendFailed;
    case "password_mismatch": return t.registerErrorMismatch;
    case "password_too_long": return t.authPasswordTooLong;
    case "link_invalid": return t.loginErrorLink;
    case "oauth_unavailable": return t.oauthUnavailable;
  }
  if ("name" in error && ["AbortError", "TimeoutError", "AuthRetryableFetchError"].includes(String(error.name))) return t.loginErrorNetwork;
  return fallback;
}
