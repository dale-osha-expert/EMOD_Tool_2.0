/**
 * Master switch for emailing reports. Off: the form is not rendered and the
 * route answers 404, whatever RESEND_API_KEY and EMAIL_FROM say.
 *
 * Hidden rather than removed while there is no decision on how to protect a
 * public form that sends mail to any address. The route's existing guards
 * (origin, report fingerprint, rate limits) slow abuse but do not stop it, and
 * a leaked or abused sending domain is expensive to recover. A constant rather
 * than an env var, so no deployment setting can turn it on by accident;
 * switching it on is a reviewed code change.
 */
export const EMAIL_FEATURE_ENABLED = false;
