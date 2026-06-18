import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";
import { processCampaignQueue } from "@/lib/bulkMessageWorker";

export async function POST(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return Response.json(
        { success: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    // 1. Verify campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from("bulk_message_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return Response.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // 2. Count remaining pending/failed queue items
    const { count, error: countErr } = await supabase
      .from("bulk_message_queue")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "failed"]);

    if (countErr) {
      throw countErr;
    }

    if (!count || count === 0) {
      return Response.json(
        { success: false, error: "All messages in this campaign have already been successfully processed." },
        { status: 400 }
      );
    }

    const isDirectSend = count <= 10;

    if (isDirectSend) {
      // Direct send (await completion)
      await processCampaignQueue(campaignId);

      const { data: updatedCampaign } = await supabase
        .from("bulk_message_campaigns")
        .select("sent_count, failed_count, status")
        .eq("id", campaignId)
        .single();

      return Response.json({
        success: true,
        direct: true,
        message: "Campaign resumed and completed.",
        sentCount: updatedCampaign?.sent_count || 0,
        failedCount: updatedCampaign?.failed_count || 0,
        status: updatedCampaign?.status || "completed"
      });
    } else {
      // Queue background delivery (do not await)
      processCampaignQueue(campaignId).catch(err => {
        console.error(`Background worker execution error during resume for campaign ${campaignId}:`, err);
      });

      return Response.json({
        success: true,
        direct: false,
        message: "Campaign queue execution has resumed in the background."
      });
    }

  } catch (err) {
    console.error("Resume API error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: err.message === "Forbidden" || err.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
