import { EmodTool } from "@/components/EmodTool";

/**
 * Chrome-less variant for embedding in a wider "tools" page. The title and
 * intro are dropped because the host page supplies its own; everything else,
 * including the container-query layout, is identical.
 */
export default function EmbedPage() {
  return (
    <main className="@container">
      <EmodTool chrome={false} />
    </main>
  );
}
