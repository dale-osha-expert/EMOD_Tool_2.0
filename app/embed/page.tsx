import { EmodTool } from "@/components/EmodTool";
import { emailConfig } from "@/lib/email/send";

/*
 * Rendered per request so whether emailing is switched on comes from the
 * server's environment at runtime. Statically built, it would be frozen at
 * whatever the build machine had - which in a Docker image built without
 * secrets means off for good. Every response is already sent no-store.
 */
export const dynamic = "force-dynamic";

/**
 * Chrome-less variant for embedding in a wider "tools" page. The title and
 * intro are dropped because the host page supplies its own; everything else,
 * including the container-query layout, is identical.
 */
export default function EmbedPage() {
  return (
    <main className="@container">
      <EmodTool chrome={false} emailEnabled={emailConfig() !== null} />
    </main>
  );
}
