import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  try {
    const {id} = await params;
    const { data, error } = await supabase
      .from("discussions")
      .select("*, discussion_doctors(doctor_id, doctors:users(id, full_name, email)), courses(id, name), subjects(id, name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const {id} = await params;
    const body = await req.json();
    const { title, description, subject_id, doctor_ids } = body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    // sanitize subject_id: treat empty/'undefined'/'null' strings as null
    if (Object.prototype.hasOwnProperty.call(body, 'subject_id')) {
      const raw = subject_id;
      if (!raw || raw === 'undefined' || raw === 'null') {
        updates.subject_id = null;
      } else {
        updates.subject_id = raw;
      }
    }

    const { error: upErr } = await supabase.from("discussions").update(updates).eq("id", id);
    if (upErr) throw upErr;

    // replace doctor assignments if provided (sanitize IDs)
    if (Array.isArray(doctor_ids)) {
      await supabase.from("discussion_doctors").delete().eq("discussion_id", id);
      const validDoctorIds = doctor_ids.filter((d) => d && d !== "undefined" && d !== "null");
      if (validDoctorIds.length) {
        const records = validDoctorIds.map((d) => ({ discussion_id: id, doctor_id: d }));
        const { error: ddErr } = await supabase.from("discussion_doctors").insert(records);
        if (ddErr) throw ddErr;
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const {id} = await params;
    const { error } = await supabase.from("discussions").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
