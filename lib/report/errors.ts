import type { ToolError } from "../useEmodTool";

/** A report that failed to render, for whichever delivery asked for it. */
export function reportError(e: unknown): ToolError {
  return {
    code: "report",
    message: "The report could not be generated.",
    hint:
      e instanceof Error
        ? `${e.message}. Everything on this page is still available on screen.`
        : "Everything on this page is still available on screen.",
    retryable: true,
  };
}
