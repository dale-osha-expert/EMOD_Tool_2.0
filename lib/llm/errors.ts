/**
 * Typed failures for the AI layer.
 *
 * The previous build of this tool fell back to default values when the model
 * call failed and presented them as real results. Nothing here is recoverable
 * by substitution: every failure carries a message the interface shows the user
 * verbatim, and the deterministic analysis is what continues to be displayed.
 */
export type AiErrorCode =
  | "not_configured"
  | "model_unavailable"
  | "rate_limited"
  | "unauthorized"
  | "bad_response"
  | "network"
  | "blocked";

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    /** What the user can do about it. */
    readonly hint: string,
    /** Whether retrying the same request could plausibly succeed. */
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AiError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      hint: this.hint,
      retryable: this.retryable,
    };
  }
}

export const notConfigured = () =>
  new AiError(
    "not_configured",
    "No AI key is configured for this deployment.",
    "The calculations, scenarios and report below are complete without it. To add the written analysis, set GEMINI_API_KEY on the server or paste your own key using the key button.",
  );

export const modelUnavailable = (model: string) =>
  new AiError(
    "model_unavailable",
    `The configured AI model "${model}" is not available.`,
    "This usually means the model has been retired or renamed. Everything on this page was calculated from your worksheet and is unaffected. Updating GEMINI_MODEL on the server will restore the written analysis.",
  );

export const rateLimited = () =>
  new AiError(
    "rate_limited",
    "The AI service is rate limited right now.",
    "The free tier allows a limited number of requests per minute. Waiting a moment and retrying usually clears it. Your calculations are already complete and are not affected.",
    true,
  );

export const unauthorized = () =>
  new AiError(
    "unauthorized",
    "The AI key was rejected.",
    "The key is missing, expired or lacks access to this model. Your calculations are already complete and are not affected.",
  );

export const badResponse = (detail: string) =>
  new AiError(
    "bad_response",
    "The AI returned a response this tool could not read.",
    `The written analysis has been withheld rather than shown in a partial or unreliable state. Everything else on this page is calculated directly from your worksheet. (${detail})`,
    true,
  );

export const blocked = () =>
  new AiError(
    "blocked",
    "The AI declined to respond to this request.",
    "This can happen when a safety filter triggers on the content. Your calculations are complete and unaffected.",
  );

export const networkError = (detail: string) =>
  new AiError(
    "network",
    "Could not reach the AI service.",
    `Your calculations are complete and unaffected. (${detail})`,
    true,
  );
