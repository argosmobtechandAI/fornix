import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: "ids array is required" },
        { status: 400 }
      );
    }

    // 1. Fetch users to clean up profile pictures
    const { data: users } = await supabase
      .from("users")
      .select("id, profile_picture")
      .in("id", ids);

    // 2. Remove profile pictures from storage
    if (users && users.length > 0) {
      const paths = users
        .filter(u => u.profile_picture)
        .map(u => {
          const path = u.profile_picture.split("/storage/v1/object/public/profile/")[1];
          return path;
        })
        .filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("profile").remove(paths);
      }
    }

    // 3. Delete quiz_answers via quiz_attempts (quiz_answers references attempt_id, not user_id)
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id")
      .in("user_id", ids);

    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id);
      // Delete in batches of 100 to avoid timeouts
      for (let i = 0; i < attemptIds.length; i += 100) {
        const batch = attemptIds.slice(i, i + 100);
        await supabase.from("quiz_answers").delete().in("attempt_id", batch);
      }
    }

    // 4. Delete all related records that have foreign key constraints (user_id column)
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
        await supabase.from(table).delete().in("user_id", ids);
      } catch (_) {
        // skip non-existent tables
      }
    }

    // 5. Delete users
    const { error } = await supabase
      .from("users")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return Response.json({
      success: true,
      message: `${ids.length} user(s) deleted successfully`,
      deleted: ids.length,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
