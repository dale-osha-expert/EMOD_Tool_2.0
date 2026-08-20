"use client";

import { useCallback, useRef, useState } from "react";
import { Button, cx } from "./ui";

export function Uploader({
  onFile,
  busy,
  busyLabel,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  busyLabel: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files);
      }}
      className={cx(
        "@container rounded-lg border-2 border-dashed px-5 py-10 text-center transition-colors",
        dragging
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
          : "border-[var(--color-line-strong)] bg-[var(--color-surface)]",
      )}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => accept(e.target.files)}
      />

      {busy ? (
        <div className="flex flex-col items-center gap-3">
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-accent)]"
          />
          <p className="text-[14px] text-[var(--color-ink-muted)]">{busyLabel}</p>
        </div>
      ) : (
        <>
          <p className="text-[15px] font-medium">
            Drop an NCCI experience rating worksheet here
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            The PDF is read in your browser and is not uploaded. Refreshing this
            page clears everything.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => input.current?.click()}
          >
            Choose a PDF
          </Button>
        </>
      )}
    </div>
  );
}
