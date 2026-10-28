# Experience Modification Analyser

Reads an NCCI Workers Compensation Experience Rating worksheet, recalculates the
experience modification factor, shows what each claim is costing, and exports a
PDF report.

Built to run at effectively zero cost, to keep client documents private, and to
fail loudly rather than quietly.

---

## How it works

The worksheet is a fixed-layout form with a real text layer, and every figure on
it is internally verifiable. Both facts shape the design.

```
PDF (never leaves the browser)
  1. text layer present? ── no ──> stated clearly + opt-in transcription or manual entry
  2. deterministic parse (columns anchored on the form's own printed labels)
  3. reconcile against the worksheet's own arithmetic        <-- the reliability gate
  4. recompute mod, minimum, per-claim scenarios             ) always run,
  5. deterministic findings                                  ) never depend on a model
  6. ONE Gemini call: cross-check + written narrative        <-- optional, degrades visibly
  7. client-side vector PDF report
```

### Extraction needs no model

Column positions are derived from the header labels the form itself prints
(`Code`, `ELR`, `D-Ratio`, `Payroll`, …) rather than from hard-coded
coordinates, so one parser reads more than one form variant. Numeric cells are
matched on their right edge, since figures on these forms are right-aligned and
their left edge drifts with digit count.

This is free, instant, exact on digital worksheets, and the document never
leaves the browser.

### The reliability gate

The worksheet asserts a set of arithmetic relationships about itself. All of
them are re-derived independently:

| Relationship | Meaning |
|---|---|
| `Expected losses = Payroll ÷ 100 × ELR` | per class code |
| `Expected primary = Expected losses × D-ratio` | per class code |
| `(C) = (D) − (E)`, `(F) = (H) − (I)` | excess losses |
| `Stabilizing value = (C) × (1 − A) + (G)` | |
| `(J) = (I) + SV + (A)×(F)`, `(K) = (E) + SV + (A)×(C)` | |
| `(K) = (D) + (G)` | independent route to the same figure |
| `Mod = (J) ÷ (K)` | |
| `Σ claim losses (after ERA) = (H)` and `(I)` | claim roll-up |

A mis-parsed column cannot satisfy these. So a bad read is **detected and
named**, not passed downstream as though it were real data — and a clean pass is
positive evidence the document was read correctly. On the reference worksheet,
all 116 checks reconcile.

### No rate tables to buy

Nothing needs to be purchased from NCCI:

- **Expected loss rates and D-ratios** are printed on the worksheet.
- **The split point** is inferred from the data — any claim whose actual primary
  is below its actual incurred has been capped, and that cap *is* the split
  point. Exact for the rating in hand, rather than approximated from a published
  table that may not match this state and effective date.
- **Premium impact** scales off the subject premium printed on each policy
  block. Presented as an estimate, because those are historical figures.

### Where AI is and isn't used

| Produced by | What |
|---|---|
| Deterministic code | Every figure: the mod, scenarios, findings, premium estimates, the whole report |
| One Gemini call | The written summary and suggestions, plus a cross-check of the parse |

The AI layer is strictly additive. If Gemini is down, rate limited,
misconfigured, or the model has been retired, the tool still delivers the full
recalculation, the what-ifs and the report — with a stated reason for the
missing narrative.

**Failures are never substituted with defaults.** A retired model is detected
from both the status code and the response body and reported *by name*; a
malformed or truncated response is withheld rather than rendered partially.
`tests/ai-failures.test.ts` exists to keep it that way.

---

## SEO, AEO and the funnel

The page is a lead magnet for CertifyMe properties, so it has to rank and be
quotable as well as work.

**Everything is server-rendered.** The tool runs in the browser, but the hero,
how-it-works, FAQ and glossary are server components — content that only
exists after hydration is content a crawler may never see. The served HTML is
around 94 KB with every FAQ answer present before any JavaScript runs, and the
FAQ uses `<details>` so collapsed answers are still in the markup.

**Structured data** is built in `lib/site/schema.ts` as a single `@graph`:
Organization, WebSite, WebPage, WebApplication, FAQPage and DefinedTermSet.
Everything marked up mirrors visible page content — marking up something the
page does not say is against Google's guidelines and gets sites ignored.

**`public/llms.txt`** states what the tool does, the formula it applies and the
facts worth citing, in the plain structured form answer engines prefer.

`/embed` is `noindex` and disallowed in `robots.txt`: it is the same tool
without page furniture, and indexing it would split ranking signals across two
copies of one page.

### Brand configuration

Every brand-specific fact lives in `lib/site/brand.ts`. Descriptions are blank
until confirmed, and components render a clean link rather than placeholder
prose when one is unset — an SEO page that misstates what a company sells is
worse than no page, and an answer engine will repeat the mistake.

| Setting | Purpose |
|---|---|
| `PUBLISHER.logo` | Full logo in `public/`, used by the Organization schema. |
| `PUBLISHER.wordmark` | Wordmark cropped from the same logo, used by the byline. Unset, the byline renders a text wordmark. |
| `SITE_URL` | Canonical origin, from `NEXT_PUBLIC_SITE_URL`. Drives canonical, sitemap, Open Graph and schema. |
| `RESEND_API_KEY` | Resend API key. With `EMAIL_FROM`, switches on "Email it instead" in the report builder. Server-only; never reaches the browser. |
| `EMAIL_FROM` | Sender, e.g. `CertifyMe.net <reports@certifyme.net>`. Its domain must be verified in Resend. For testing without a verified domain, use `onboarding@resend.dev`; Resend then delivers only to the Resend account owner's own address, so keep that setup off Production. |
| `EMAIL_REPLY_TO` | Optional reply-to address for the report email. |
| `NEXT_PUBLIC_AI_ENABLED` | `true` runs the AI analysis in this deployment. Unset, the panel describes what the analysis adds and links to Compliance Hub. |

One codebase serves both deployments: the public funnel with the AI panel as an
upsell, and Compliance Hub with it switched on. Everything else — the
recalculation, scenarios, findings and report — is identical and never gated.

### Measurement

Vercel Web Analytics, loaded as the platform script rather than
`@vercel/analytics`, which pulls in a SvelteKit peer that conflicts with the
test toolchain. Cookieless, stores nothing on the device, and limited to an
allowlist of three events in `lib/site/analytics.ts`: a CTA click, a successful
parse, a report download. Nothing from a worksheet is ever sent — no company
name, no claim number, no figure, not even a filename. The allowlist is what
keeps that true as the page grows.

---

## Protecting the API routes

`/api/analyze` and `/api/ocr` spend the deployment's API key and cannot be
authenticated — the tool is public and deliberately has no accounts. Three
layers make abuse expensive rather than impossible:

| Layer | What it stops |
|---|---|
| **Payload schema** | `/api/analyze` stringifies its payload into the prompt, so without validation it is a general-purpose LLM proxy on your key. Only a well-formed analysis is accepted, with every array and string capped. |
| **Origin required** | Browsers send `Origin` on every POST, so its absence means a script. When `ALLOWED_FRAME_ANCESTORS` names specific sites, only those origins (plus the deployment's own) may call the routes. |
| **Rate limits** | Per caller: 10/min and 60/hour on analyse, 3/min and 10/hour on transcription. Per instance: 200/hour and 40/hour, protecting the shared quota — skipped when the caller brings their own key, since they are spending their own. |

Bodies are capped at 512 KB for analysis and ~16 MB for transcription, checked
from `Content-Length` before the body is read.

The rate limiter is in-memory and therefore **per serverless instance, not
global**. Vercel reuses warm instances, so sustained abuse from one source is
caught; an attacker spreading across cold starts is not. That is a deliberate
limit — a shared store would mean persistent state, which this tool does not
have and does not want.

---

## Privacy

- The PDF is parsed in the browser. On the normal path it is never uploaded.
- No database, no logging of request bodies, no analytics, no cookies.
- All state lives in React memory. No `localStorage`, `sessionStorage` or
  `IndexedDB`. **Refreshing the page clears everything.**
- The analysis call sends calculated figures, not the document. Company name and
  risk ID are withheld by default; claim numbers are pseudonymised before
  sending and mapped back for display.
- The one path where a document leaves the browser — transcribing a scan — is
  opt-in, behind a dialog that says so plainly, with manual entry offered as an
  equal alternative.

---

## Running it

```bash
npm install
cp .env.example .env.local     # optional: only the written analysis needs a key
npm run dev
```

Open <http://localhost:3000>. The tool works with no API key at all; only the
written analysis is unavailable.

### Configuration

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Server-side only, never exposed to the browser. Free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | Narrative and cross-check. Defaults to `gemini-3.6-flash`. Free tier covers Flash and Flash-Lite; Pro is behind billing. |
| `GEMINI_VISION_MODEL` | Scanned-PDF transcription. Defaults to `gemini-3.5-flash-lite`, which is optimised for document parsing. Falls back to `GEMINI_MODEL`. |
| `ALLOWED_FRAME_ANCESTORS` | Restricts which sites may iframe the tool. Defaults to `*`. |

**Pin an explicit model version; do not use a `-latest` alias.** An alias is
hot-swapped on every release and may point at a preview or experimental model,
so its behaviour changes with no signal. A pinned model that retires returns a
404, which the tool reports by name — *"the configured AI model X is not
available"* — while every calculation keeps working. A loud failure you can act
on beats a quiet drift you cannot detect, which is the whole premise of this
rebuild. Avoid `gemini-2.5-flash` and `gemini-2.5-flash-lite`: both shut down
2026-10-16.

The free tier's binding constraint is **requests per minute** per key, and one
analysis is one request — so that figure is the practical ceiling on concurrent
users. Google's published numbers move and vary by model, so read the live quota
in AI Studio rather than trusting a figure from documentation. Users can supply
their own key under **Options** to bypass the shared quota; it is held in memory
for that session only and never stored.

Splitting the two model variables keeps the quotas independent: rate limits are
per-model, so transcribing a scanned worksheet does not eat into the budget the
written analysis draws on.

### Deploying to Vercel

Push the repo, import it, and set `GEMINI_API_KEY`, `GEMINI_MODEL` and
`GEMINI_VISION_MODEL` as project environment variables. Nothing else is required
— there is no database and no persistent state.

Env changes need a redeploy to take effect. When a pinned model eventually
retires, the symptom is a stated error naming the model and the fix is to update
that one variable; nothing else in the tool is affected.

---

## Embedding

`/embed` is a chrome-less variant that drops the title and intro and keeps
everything else:

```html
<iframe
  src="https://your-deployment.vercel.app/embed"
  style="width:100%;height:1400px;border:0"
  title="Experience Modification Analyser"
></iframe>
```

Set `ALLOWED_FRAME_ANCESTORS` to your site's origin to restrict who can frame
it.

Layout keys off **container width**, not viewport width, throughout — so a
narrow column on a wide monitor lays out like a phone, which viewport media
queries cannot express. Verified from 320px to full desktop; wide tables scroll
inside their own box so the page body never scrolls sideways.

---

## Verifying

```bash
npm test          # parser, rating maths, AI failure paths, report typography
npm run typecheck
npm run build
```

The unit suite runs against fixtures built from real worksheets — genuine page
geometry, with every identifying value replaced by a same-length stand-in.
Committing derived geometry rather than the source PDFs keeps real payroll and
injury data out of the repository while still exercising real coordinates.

| Fixture | What it covers |
|---|---|
| `interstate-az-fl` | 2024 interstate form, two states, ERA medical-only discount, one capped open claim |
| `interstate-az-fl-tx-2025` | 2025 form: adds the split-point column, three states, 19 policy periods, ARAP and FLARAP above unity, and a `#` limited-loss claim |
| `intrastate-tx-loss-free` | 2017 single-state form, no split-point column, no surcharges, and **no claims at all** |

Between them they assert the full chain: recomputed mods of `.84`, `1.10` and
`.81` each matching the printed figure, a loss-free minimum of `.62`, the
`1,956` ERA delta between the state rows and the rated totals, the `$16,500`
split point inferred from claim data, and the `$82,337` loss limitation
recovered from the 2025 totals row.

Two more test groups guard behaviour that is easy to break:

- **Documents that are not ratings.** A training deck or explainer can quote
  every column heading without being a worksheet. Those must fail with a stated
  reason rather than a guess.
- **Report rendering.** Every section of every fixture is rendered to a real
  PDF, plus a pagination stress case several times larger than any worksheet
  seen so far. Page numbering needs a per-page callback that the PDF layout
  engine cannot survive on a very long report, so the builder retries without
  it; the stress test is what holds that fallback in place.

### End-to-end

```bash
npm run build && npm start
node scripts/smoke.mjs path/to/worksheet.pdf
```

Drives a real browser: parses a real PDF, checks the reconciliation passes and
the recomputed mod matches, confirms an AI failure is surfaced rather than
swallowed, downloads the report, checks a 360px container does not scroll
sideways, and asserts nothing was written to browser storage.

Set `PLAYWRIGHT_CHROMIUM_PATH` if Chromium is not where Playwright expects it.

### Regenerating the fixture

```bash
node scripts/make-fixture.mjs worksheet.pdf fixtures/name.json "REDACTED CO"
```

---

## Limitations

- Built for **NCCI** worksheets. Verified against the 2017, 2024 and 2025 form
  layouts, interstate and intrastate. Independent bureau states with their own
  forms (California's WCIRB among them) are not supported; the parser says so
  rather than guessing.
- A claim flagged as a **limited or catastrophic loss** enters the rating at
  less than its printed value, and the worksheet never states by how much. The
  gap between the printed claims and the printed totals is used to recover it,
  which is exact when one claim is flagged. With several flagged claims the
  reduction is shared between them in proportion, which is an assumption rather
  than a fact.
- Premium figures are estimates scaled from historical subject premium, not
  quotations.
- The tool sees one document. It has no access to claim files, reserving
  rationale, payroll records or filed rates, so its observations are points to
  check with an agent or carrier — not findings of error, and not advice.
