import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*, course_categories(name, slug)")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
