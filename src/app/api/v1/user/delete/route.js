import { supabase } from "@/lib/supabaseAdmin";

export async function DELETE(req) {
  try {
    
    const { id } = await req.json();
    

    if (!id) {
      return Response.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      );
    }

    // ---------------------------
    // GET USER
    // ---------------------------
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // prevents crash when null

    if (userError) {
      return Response.json(
        { success: false, error: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ---------------------------
    // DELETE PROFILE IMAGE SAFELY
    // ---------------------------
    if (user.profile_picture) {
      const path = user.profile_picture.split(
        "/storage/v1/object/public/profile/"
      )[1];

      if (path) {
        const { error: removeErr } = await supabase.storage
          .from("profile")
          .remove([path]);

        if (removeErr) {
          // image removal failed, non-critical
        }
      }
    }

    // ---------------------------
    // OPTIONAL CLEANUP (NON-AUDIT TABLES)
    // ---------------------------
    const cleanupTables = [
      { table: "password_reset_otps", column: "user_id" },
      { table: "user_devices", column: "user_id" },
    ];

    for (const item of cleanupTables) {
      const { error: cleanupErr } = await supabase
        .from(item.table)
        .delete()
        .eq(item.column, id);

      if (cleanupErr) {
        return Response.json(
          {
            success: false,
            error: `Failed cleaning ${item.table}: ${cleanupErr.message}`,
          },
          { status: 500 }
        );
      }
    }

    // ---------------------------
    // SOFT DELETE USER (KEEP PAYMENTS / SUBSCRIPTIONS)
    // ---------------------------
    const stamp = `${Date.now()}_${id}`;
    const anonymizedEmail = `deleted_${stamp}@deleted.local`;
    const anonymizedPhone = `del${Date.now().toString().slice(-10)}`;
    const deletedDisplayName = `Deleted user ${String(user.full_name || "").trim() || "Unknown"}`.slice(0, 20);

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        full_name: deletedDisplayName,
        email: anonymizedEmail,
        phone: anonymizedPhone,
        profile_picture: null,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      return Response.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "Account deleted successfully. Payment and subscription history has been preserved for audit.",
      },
      { status: 200 }
    );

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
