import Image from "next/image";
import { PUBLISHER } from "@/lib/site/brand";

/**
 * "By CertifyMe.net", as a header byline or a report credit.
 *
 * Falls back to a text wordmark when no logo file is configured, which looks
 * deliberate rather than broken. Drop a file at public/logo.svg and set
 * PUBLISHER.logo to switch it on.
 */
export function ByLine({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const text = size === "sm" ? "text-[12px]" : "text-[13px]";

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
      {PUBLISHER.logo ? (
        <Image
          src={PUBLISHER.logo}
          alt={PUBLISHER.name}
          width={size === "sm" ? 92 : 108}
          height={size === "sm" ? 18 : 22}
          priority
        />
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
