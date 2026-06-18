import { ensureAdmin } from "@/lib/verifyToken";
import { resolveRecipients } from "@/lib/bulkMessageWorker";

export async function POST(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { filterType, filterDetails } = body;

    if (!filterType) {
      return Response.json(
        { success: false, error: "filterType is required" },
        { status: 400 }
      );
    }

    const recipients = await resolveRecipients(filterType, filterDetails || {});

    return Response.json({
      success: true,
      count: recipients.length,
    });
  } catch (err) {
    console.error("Estimate error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: err.message === "Forbidden" || err.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
