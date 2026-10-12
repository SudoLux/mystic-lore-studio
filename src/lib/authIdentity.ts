/** Email identity is shared by registration, login, and recovery. */
export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function signupGuidance(hasSession: boolean) {
  return hasSession
    ? 'You are signed in. Continue to your Studio.'
    : 'Check your email for a confirmation link if registration is available. Already have an account? Sign in or reset your password.';
}

export function authFailureMessage(error: { code?: string; message: string }) {
  return error.code === 'user_already_exists' || error.code === 'email_exists'
    ? 'Use Sign in or Forgot your password? to access your existing account.'
    : error.message;
}

/** Auth can report a deleted account with a 400 code instead of a 401 status. */
export function isInvalidAuthSession(error: { code?: string; status?: number } | null) {
  return Boolean(error && (error.status === 401 || error.status === 403
    || ['user_not_found', 'session_not_found', 'user_banned', 'refresh_token_not_found', 'refresh_token_already_used'].includes(error.code ?? '')));
}
