import { NextResponse } from "next/server";
import { guardRequest } from "@/lib/api/guard";
import {
  EmailError,
  emailConfig,
  MAX_ATTACHMENT_BYTES,
  notConfigured,
  safeFilename,
  sendReport,
  validateAddress,
  validateReport,
} from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The PDF plus a little multipart overhead. */
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024;

/**
 * Emails a report the browser has already rendered to the address given.
 *
 * Nothing is logged or stored: the address and the PDF exist for the length of
 * this request. Only the report is ever sent here, never the worksheet, which
 * stays in the browser as it always has.
 */
export async function POST(request: Request) {
  const blocked = guardRequest(request, {
    route: "email-report",
    maxBytes: MAX_BODY_BYTES,
    // A person emails themselves a report once or twice; anything more looks
    // like the route being used to send our message to other people.
    perMinute: 3,
    perHour: 10,
    instancePerHour: 100,
    instanceLimit: {
      message: "This tool has reached its hourly limit for emailed reports.",
      hint: "Downloading the PDF works without any limit. Emailing should be available again later.",
    },
  });
  if (blocked) return blocked;

  const config = emailConfig();
  if (!config) return fail(notConfigured());

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(
      new EmailError(
        "invalid_attachment",
        "Malformed request body.",
        "This endpoint only accepts reports sent by the tool itself.",
        false,
        400,
      ),
    );
  }

  try {
    const to = validateAddress(form.get("email"));
    const file = form.get("report");
    if (!(file instanceof Blob)) {
      throw new EmailError(
        "invalid_attachment",
        "No report was attached.",
        "Generating the report again and resending should work.",
        false,
        400,
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateReport(bytes);
    await sendReport(config, to, safeFilename(form.get("filename")), bytes);
    return NextResponse.json({ sent: true });
  } catch (e) {
    if (e instanceof EmailError) return fail(e);
    return fail(
      new EmailError(
        "unavailable",
        "Something went wrong sending the report.",
        "The PDF can still be downloaded from the button above.",
        true,
        500,
      ),
    );
  }
}

function fail(error: EmailError) {
  return NextResponse.json({ error: error.toJSON() }, { status: error.status });
}
