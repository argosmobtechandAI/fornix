import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const search = searchParams.get("search") || "";
    const courseId = searchParams.get("course_id") || "";
    const planId = searchParams.get("plan_id") || "";
    const subscriberStatus = searchParams.get("subscriber_status") || "all";
    const isExport = searchParams.get("export") === "true";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Start with user_subscriptions because we need to filter by course/plan.
    // If no course/plan is provided, we can still fetch subscriptions, or we can fetch users and their subscriptions.
    // Actually, filtering users who have a specific subscription is easier if we query the subscriptions table and join users, 
    // OR we query users and do an inner join on user_subscriptions. Let's do the inner join on users.
    
    const useInnerJoin = (courseId && courseId !== 'all') || (planId && planId !== 'all') || subscriberStatus === 'subscribed';
    
    // Using inner join on user_subscriptions
    let query = supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        phone,
        created_at,
        role,
        user_subscriptions${useInnerJoin ? '!inner' : ''} (
          id,
          course_id,
          plan_id,
          courses ( name ),
          plans ( name )
        )
      `, { count: "exact" })
      .eq("role", "user");

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (courseId && courseId !== "all") {
      query = query.eq("user_subscriptions.course_id", courseId);
    }

    if (planId && planId !== "all") {
      query = query.eq("user_subscriptions.plan_id", planId);
    }
    
    // Order by creation date
    query = query.order('created_at', { ascending: false });

    // Pagination (if not exporting)
    if (!isExport) {
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      return Response.json({ success: false, error: error.message });
    }

    // Process data to flatten subscriptions for the frontend, especially for export.
    let processedData = data.map(user => {
      // User might have multiple subscriptions. Let's just pass them all or the latest.
      const subs = Array.isArray(user.user_subscriptions) ? user.user_subscriptions : (user.user_subscriptions ? [user.user_subscriptions] : []);
      return {
        ...user,
        subscriptions: subs
      };
    });

    // If unsubscribed is requested, we do post-filtering (less efficient but works for now without RPC)
    if (subscriberStatus === 'unsubscribed') {
      processedData = processedData.filter(u => u.subscriptions.length === 0);
    }

    return Response.json({
      success: true,
      data: processedData,
      pagination: isExport ? null : {
        total: count,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
