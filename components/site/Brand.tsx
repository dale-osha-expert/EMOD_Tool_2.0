import Image from "next/image";
import { PUBLISHER } from "@/lib/site/brand";

/**
 * "By CertifyMe.net", as a header byline or a report credit.
 *
 * Falls back to a text wordmark when no logo file is configured, which looks
 * deliberate rather than broken. PUBLISHER.wordmark switches the image on.
 */
export function ByLine({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const text = size === "sm" ? "text-[12px]" : "text-[13px]";
  const height = size === "sm" ? 16 : 20;

  return (
    <a
      href={PUBLISHER.url}
      className={`inline-flex items-center gap-2 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] ${className ?? ""}`}
      // The tool is embedded on third-party pages; open the publisher in a new
      // tab so a visitor inside an iframe is not navigated away from the host.
      target="_blank"
      rel="noopener"
    >
      <span className={`${text} font-medium`}>By</span>
      {PUBLISHER.wordmark ? (
        // The wordmark's navy "Me" disappears on the dark canvas, so it sits on
        // a light chip there rather than shipping a recoloured brand asset.
        <span className="logo-chip">
          <Image
            src={PUBLISHER.wordmark}
            alt={PUBLISHER.name}
            width={Math.round(height * PUBLISHER.wordmarkAspect)}
            height={height}
            priority
          />
        </span>
      ) : (
        <span
          className={`${text} font-semibold tracking-tight text-[var(--color-accent)]`}
        >
          {PUBLISHER.name}
        </span>
      )}
    </a>
  );
}
