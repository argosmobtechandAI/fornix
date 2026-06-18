import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET: Fetch all contact leads
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    let query = supabase
      .from("contact_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "unread") {
      query = query.eq("is_read", false);
    } else if (filter === "read") {
      query = query.eq("is_read", true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Bulk mark as read
export async function PATCH(req) {
  try {
    const { ids } = await req.json();
    if (!ids || !ids.length) throw new Error("No IDs provided");

    const { error } = await supabase
      .from("contact_leads")
      .update({ is_read: true })
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Bulk delete
export async function DELETE(req) {
  try {
    const { ids } = await req.json();
    if (!ids || !ids.length) throw new Error("No IDs provided");

    const { error } = await supabase
      .from("contact_leads")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
