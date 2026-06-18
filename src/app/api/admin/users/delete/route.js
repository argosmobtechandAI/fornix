import { supabase } from "@/lib/supabaseAdmin";

export async function DELETE(req) {
  try {
    const { id } = await req.json();

    const { data: user } = await supabase.from("users").select("*").eq("id", id).single();

    if (!user) {
      return Response.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Clean up profile picture
    if (user.profile_picture) {
      const path = user.profile_picture.split("/storage/v1/object/public/profile/")[1];
      if (path) await supabase.storage.from("profile").remove([path]);
    }

    // Delete quiz_answers via quiz_attempts (quiz_answers references attempt_id, not user_id)
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("user_id", id);

    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id);
      for (let i = 0; i < attemptIds.length; i += 100) {
        const batch = attemptIds.slice(i, i + 100);
        await supabase.from("quiz_answers").delete().in("attempt_id", batch);
      }
    }

    // Delete all related records that have foreign key constraints (user_id column)
    const relatedTables = [
      "quiz_attempts",
      "test_attempts",
      "user_subscriptions",
      "payments",
      "notifications",
      "smart_tracking",
      "discussion_posts",
      "chat_sessions",
      "password_reset_otps",
    ];

    for (const table of relatedTables) {
      try {
        await supabase.from(table).delete().eq("user_id", id);
      } catch (_) {
        // skip non-existent tables
      }
    }

    // Delete user
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ success: true, message: "User deleted" });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
