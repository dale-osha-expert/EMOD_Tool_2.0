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
| `GEMINI_MODEL` | Defaults to `gemini-flash-latest`. The free tier covers Flash and Flash-Lite; Pro is behind billing. |
| `GEMINI_VISION_MODEL` | Model for the scanned-PDF fallback. Falls back to `GEMINI_MODEL`. |
| `ALLOWED_FRAME_ANCESTORS` | Restricts which sites may iframe the tool. Defaults to `*`. |

The free tier's binding limit is **10 requests per minute** per key. Since one
analysis is one request, that is the practical ceiling on concurrent users.
Users can supply their own key under **Options** to bypass the shared quota; it
is held in memory for that session only and never stored.

### Deploying to Vercel

Push the repo, import it, and set `GEMINI_API_KEY` (and optionally
`GEMINI_MODEL`) as project environment variables. Nothing else is required —
there is no database and no persistent state.

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

The unit suite runs against `fixtures/interstate-az-fl.json` — real page
geometry from a real interstate AZ/FL worksheet, with every identifying value
replaced by a same-length stand-in. Committing derived geometry rather than the
source PDF keeps a real company's payroll and injury data out of the repository
while still exercising real coordinates.

It asserts the full chain end to end: recomputed mod `.84` matching the printed
figure, loss-free minimum `.62`, removing the one open claim giving `.63`, the
`$16,500` split point inferred from the claim data, and the `1,956` ERA
medical-only delta between the state rows and the rated totals.

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

- Built for **NCCI** worksheets. Independent bureau states with their own forms
  (California's WCIRB among them) are not supported; the parser will say so
  rather than guess.
- Premium figures are estimates scaled from historical subject premium, not
  quotations.
- The tool sees one document. It has no access to claim files, reserving
  rationale, payroll records or filed rates, so its observations are points to
  check with an agent or carrier — not findings of error, and not advice.
