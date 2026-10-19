"use client";

import { useState } from "react";

type Theme = "system" | "light" | "dark";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Overrides the browser's light or dark setting for this visit.
 *
 * Deliberately not remembered: nothing on this site writes to browser storage
 * or sets a cookie, and the smoke test asserts it. "Auto" follows the browser,
 * which is what most visitors want anyway, so a reload falling back to it is
 * the right failure.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  function choose(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] p-0.5"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => choose(o.value)}
          className={`rounded px-2 py-0.5 text-[11.5px] font-medium transition-colors ${
            theme === o.value
              ? "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
