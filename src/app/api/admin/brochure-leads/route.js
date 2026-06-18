import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET: List all brochure leads with course name
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // "unread" | "read" | null

    let query = supabase
      .from("brochure_leads")
      .select("*, courses(id, name)")
      .order("created_at", { ascending: false });

    if (filter === "unread") query = query.eq("is_read", false);
    else if (filter === "read") query = query.eq("is_read", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: mark-as-read (single or bulk)
// Body: { ids: string[] }  OR  { id: string }
export async function PATCH(req) {
  try {
    const body = await req.json();
    const ids = body.ids || (body.id ? [body.id] : []);

    if (!ids.length) {
      return NextResponse.json({ success: false, error: "No IDs provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("brochure_leads")
      .update({ is_read: true })
      .in("id", ids);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: single or bulk delete
// Body: { ids: string[] }  OR  { id: string }
export async function DELETE(req) {
  try {
    const body = await req.json();
    const ids = body.ids || (body.id ? [body.id] : []);

    if (!ids.length) {
      return NextResponse.json({ success: false, error: "No IDs provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("brochure_leads")
      .delete()
      .in("id", ids);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
