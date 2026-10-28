# CLAUDE.md

NCCI experience rating worksheet analyser. A visitor drops in their workers
compensation experience rating worksheet; the tool recalculates the experience
modification factor, verifies it against the worksheet's own arithmetic, prices
each claim, and exports a PDF report. It is free and ungated because it is a
lead magnet for CertifyMe.net, CertifyMeOnline.net and Compliance Hub.

Next.js on Vercel. Working branch `claude/ncci-emod-tool-hld8vu`.
Architecture, SEO and deployment detail live in [README.md](./README.md) — this
file is the things that will bite you.

## Two rules that are not negotiable

The previous build of this tool silently substituted default values when its
LLM call failed and presented them as real results. Everything below follows
from not doing that again.

1. **A failure is never replaced by a default.** Every AI failure path is a
   typed `AiError` carrying a user-facing hint; a retired model is reported by
   name. A malformed or truncated response is withheld, not rendered partially.
   `tests/ai-failures.test.ts` exists solely to keep this true.
2. **Unverified figures are never shown as reliable.** `lib/rating/reconcile.ts`
   re-derives every relationship the worksheet asserts about itself. When a
   check fails, the UI withholds the results behind an explicit acknowledgement
   and names the disagreeing cell.

Findings and AI output are worded as things to verify, never as instructions —
the tool sees one document and cannot see claim files, reserving rationale or
payroll records. A test asserts the findings contain no directive language.

## Pipeline

```
PDF (never uploaded)
 1. text layer present? ── no ──> stated plainly + opt-in transcription or manual entry
 2. deterministic parse        lib/parse/*     columns anchored on printed headers
 3. reconciliation gate        lib/rating/reconcile.ts    <-- the product's promise
 4. recompute mod, scenarios   lib/rating/*    ) never depend on a model
 5. deterministic findings     lib/rating/findings.ts     )
 6. ONE Gemini call            app/api/analyze  <-- optional, degrades visibly
 7. client-side PDF report     lib/report/*
```

Steps 1–5 and 7 are pure computation. If Gemini is down, rate limited or
retired, everything except the prose still works.

## The maths, and the numbers that prove it still works

```
stabilizing value = expected excess x (1 - W) + ballast
mod = (actual primary + SV + W x actual excess)
    / (expected primary + SV + W x expected excess)
```

The denominator collapses to expected losses + ballast, so it is fixed for a
given rating — which is why per-claim mod deltas are additive.

Three fixtures, each a real worksheet with identifiers pseudonymised. If you
break something, one of these moves:

| Fixture | Recomputed mod | Loss-free min | Notes |
|---|---|---|---|
| `interstate-az-fl` | `.84` | `.62` | 2024 form, ERA delta of `1,956`, split point `$16,500` |
| `interstate-az-fl-tx-2025` | `1.10` | `.61` | split-point column, 19 policies, ARAP 1.09, `$82,337` loss limitation |
| `intrastate-tx-loss-free` | `.81` | `.81` | 2017 single-state, no claims, no surcharges |

## Traps

**The PDF report layout engine.** Symptom is always
`unsupported number: -1.8473220735918863e+22`.

- No `wrap={false}` on anything multi-line. Single-line table rows only.
- No `minPresenceAhead`, anywhere. It reintroduces the failure on its own.
- Any per-page `render` callback fails past a document length, which is why
  page numbering has a fallback: the builder retries with `omitPageNumbers`
  and tells the user. Do not assume a report renders with page numbers.
- I have already reintroduced this once, by adding `wrap={false}` in the same
  file that carries the warning. Read the comments before editing
  `lib/report/document.tsx`.

**Report typography.** Built-in PDF fonts are WinAnsi only, so `−` (U+2212) and
`≈` render as missing glyphs. Use ASCII in `lib/report/document.tsx`;
`tests/report.test.ts` scans the source for violations.

**Fixtures are pseudonymised on regeneration.** Risk ids, carrier codes, policy
and claim numbers all change. Assert shapes (`expect(ws.riskId).toMatch(/^\d{9}$/)`)
and identify claims by their financial characteristics, never by literal value.

**`scripts/make-fixture.mjs`.** Redaction is scoped per page because pages share
a coordinate space — an earlier version searched every item by `y` and
pseudonymised column headers on other pages (`ELR` became `XXX284`).
Replacements preserve length and character class so column geometry holds.

**The parser.** Columns are anchored on the header labels the form itself
prints, never on fixed coordinates — that is what lets one parser read the
2017, 2024 and 2025 layouts. Numeric cells are assigned by their **right** edge
(figures are right-aligned), alphabetic cells by their left. New form variants
usually need an optional `ColumnSpec`, not new logic.

**The guides are someone else's Markdown.** `content/guides/*.md` comes from
the content pipeline and is replaced wholesale on revision, so never hand-edit
it to fix rendering — fix `lib/site/guide-content.ts`. Chart colours in its
inline SVG are mapped to `--chart-*` tokens defined three times in
`app/globals.css` (light, dark by preference, dark by toggle); an unmapped hex
throws at build. The tool page is rendered per request and the Markdown is only
read at build, so never call `loadGuide` from `app/page.tsx` — copy for menus
and cards lives in `lib/site/guides.ts`.

**Claim values are not what they appear.** A claim flagged `#` or `C` enters the
rating at less than its printed incurred; the gap between the printed claims and
the printed totals is recovered in `lib/rating/claims.ts`. Quote
`ratedIncurred`, never `actualIncurred`, anywhere a user or the model sees it.

## Commands

```bash
npm test          # 181 tests, ~35-55s
npm run typecheck
npm run build
npm run dev

# End-to-end against a real worksheet, with the server already running:
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run smoke -- path/to/worksheet.pdf

# Regenerate a fixture from a real PDF (identifiers are replaced):
npm run fixture -- worksheet.pdf fixtures/name.json "REDACTED CO"
```

## Environment

- Outbound HTTPS goes through an egress proxy that **denies many hosts**,
  including `vercel.app` and `ai.google.dev`. A 403 on CONNECT is policy, not a
  dead site. Say so plainly rather than concluding something is unreachable.
- Uploaded files and `node_modules` do not survive container recycling. Run
  `npm install` if imports suddenly fail to resolve.
- `fuser -k 3000/tcp` before restarting the dev server; `pkill -f next` can
  take down the shell.

## Conventions

- Comments explain **why**, not what. Several in this codebase record a
  decision that was expensive to reach — leave them.
- Failures are typed, carry a hint, and say what the user can still do.
- Nothing is persisted. No `localStorage`, no cookies, no database, no logging
  of request bodies. The smoke test asserts browser storage stays empty. That
  includes the theme toggle: it overrides the browser's scheme for the visit
  only, and a reload returns to Auto.
- Marketing tied to results lives in `lib/site/promotions.ts` and is drawn on
  the page and into the PDF. It quotes only figures the page already shows,
  never targets by class code (descriptions are usually unprinted), and never
  promises a lower mod. `tests/promotions.test.ts` holds it to that.
- Analytics is counting, not tracking: an allowlist of three events in
  `lib/site/analytics.ts`, never anything from a worksheet.

## Outstanding

- **Brand copy in `lib/site/brand.ts` was written from the live sites in
  October 2026.** None of the three mentions workers comp or experience rating:
  CertifyMe.net is forklift training, CertifyMeOnline.net aerial lift training,
  Compliance Hub employee document and certification tracking. Compliance Hub's
  public site says nothing about the AI analysis, so `AiUpsell.tsx` describes
  only what `lib/llm/*` produces and never how it looks there. Re-read the sites
  before changing a description; never describe them from assumption.
- Both CertifyMe sites 301 their apex domain to `www.`, so every link and the
  Organization `@id` use the `www.` host (the sandbox proxy also denies the
  apex). Do not "tidy" them back to the apex.
- `SITE_URL` points at the Vercel deployment. Set `NEXT_PUBLIC_SITE_URL` once a
  real domain exists and canonical, sitemap, Open Graph and schema follow.
  This repository is the Vercel deployment; the self-hosted build at
  emodanalyzer.com lives in `fork-it-ai/emod-funnel`, so keep hosting-specific
  changes (Docker, standalone output, the canonical domain) out of here.
- **The move to emodanalyzer.com is one env var.** Setting
  `REDIRECT_TO=https://emodanalyzer.com` (Production) and redeploying makes
  every path 308 to the same path there; unset, nothing changes. The Search
  Console file is exempt so the Vercel property stays verified for Change of
  Address. Keep the redirect at least a year. Do not delete that file or
  remove the exemption while the move is processing.
- `NEXT_PUBLIC_AI_ENABLED=true` turns the AI panel on; unset, it is an upsell.
  One codebase serves both the public funnel and Compliance Hub.
- **Emailing reports is hidden.** `EMAIL_FEATURE_ENABLED` in
  `lib/email/feature.ts` is `false`: the form is not rendered and
  `/api/email-report` answers 404, whatever the env says. It is a constant on
  purpose, so no deployment setting turns it on; it waits on a decision about
  protecting a public form that sends mail. When it is switched on:
- **"Email it instead" sends the finished PDF through Resend** when
  `RESEND_API_KEY` and `EMAIL_FROM` are set (read on the server at build, so a
  redeploy is needed after changing them). `app/api/email-report` accepts only
  a PDF this tool rendered, rate limits hard, and logs nothing; the sandbox
  cannot reach Resend, so the route is tested against a stubbed `fetch`. The
  **promotions checkbox is still visual only** - it is not sent anywhere until
  there is a decision on where opt-ins are recorded.
- Deferred features: next-year roll-off projection, and year-over-year
  comparison of two worksheets.
