import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";
import { resolveRecipients, processCampaignQueue } from "@/lib/bulkMessageWorker";

export async function POST(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { 
      title, 
      message, 
      imageUrl, 
      documentUrl, 
      externalLink, 
      filterType, 
      filterDetails 
    } = body;

    // 1. Validations
    if (!title || !title.trim()) {
      return Response.json({ success: false, error: "Message title is required" }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return Response.json({ success: false, error: "Message body is required" }, { status: 400 });
    }
    if (!filterType) {
      return Response.json({ success: false, error: "Recipient filter type is required" }, { status: 400 });
    }

    // 2. Resolve recipients
    const recipients = await resolveRecipients(filterType, filterDetails || {});
    if (recipients.length === 0) {
      return Response.json({ 
        success: false, 
        error: "No active users found matching the selected filter criteria." 
      }, { status: 400 });
    }

    // 3. Create campaign record
    const { data: campaign, error: campErr } = await supabase
      .from("bulk_message_campaigns")
      .insert([{
        title: title.trim(),
        message: message.trim(),
        image_url: imageUrl || null,
        document_url: documentUrl || null,
        external_link: externalLink || null,
        filter_type: filterType,
        filter_details: filterDetails || {},
        status: "pending",
        total_recipients: recipients.length,
        sent_count: 0,
        failed_count: 0
      }])
      .select()
      .single();

    if (campErr || !campaign) {
      throw new Error(`Failed to create campaign: ${campErr?.message}`);
    }

    // 4. Create queue items for all recipients
    const queueEntries = recipients.map(r => ({
      campaign_id: campaign.id,
      user_id: r.id,
      status: "pending"
    }));

    // Split large inserts into chunks of 1000 items to avoid DB packet limits
    const chunkSize = 1000;
    for (let i = 0; i < queueEntries.length; i += chunkSize) {
      const chunk = queueEntries.slice(i, i + chunkSize);
      const { error: queueErr } = await supabase
        .from("bulk_message_queue")
        .insert(chunk);

      if (queueErr) {
        // Clean up the campaign so we don't leave an orphaned campaigns entry
        await supabase.from("bulk_message_campaigns").delete().eq("id", campaign.id);
        throw new Error(`Failed to create queue items: ${queueErr.message}`);
      }
    }

    const isDirectSend = recipients.length <= 10;

    if (isDirectSend) {
      // 5. Direct Delivery (<= 10 recipients) - Process immediately
      await processCampaignQueue(campaign.id);

      // Fetch the updated campaign status/counts
      const { data: updatedCampaign } = await supabase
        .from("bulk_message_campaigns")
        .select("sent_count, failed_count, status")
        .eq("id", campaign.id)
        .single();

      return Response.json({
        success: true,
        campaignId: campaign.id,
        direct: true,
        total: recipients.length,
        sentCount: updatedCampaign?.sent_count || 0,
        failedCount: updatedCampaign?.failed_count || 0,
        status: updatedCampaign?.status || "completed"
      });
    } else {
      // 6. Bulk Queue Delivery (> 10 recipients) - Process asynchronously
      // Launch background execution worker without awaiting
      processCampaignQueue(campaign.id).catch(err => {
        console.error(`Background worker execution error for campaign ${campaign.id}:`, err);
      });

      return Response.json({
        success: true,
        campaignId: campaign.id,
        direct: false,
        total: recipients.length,
        message: "Campaign initialized successfully. Processing deliveries in background queue."
      });
    }

  } catch (err) {
    console.error("Send API error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: err.message === "Forbidden" || err.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
