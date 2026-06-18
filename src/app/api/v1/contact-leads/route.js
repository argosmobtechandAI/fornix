import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// POST: Public submission of contact lead
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    }

    const { error } = await supabase.from("contact_leads").insert([
      {
        name: name.trim(),
        phone: (phone || "").trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return NextResponse.json({ success: true, message: "Lead saved" });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
