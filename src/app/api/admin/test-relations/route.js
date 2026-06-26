import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_subscriptions (
        id,
        course_id,
        plan_id,
        courses ( name ),
        plans ( name )
      )
    `)
    .limit(5);

  return Response.json({ data, error });
}
