import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET() {
  try {
    // USERS COUNT
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // ACTIVE USERS (last 24 hours)
    const { data: activeUsersData } = await supabase
      .from('users')
      .select('id')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // COURSES COUNT
    const { count: courseCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // SUBJECTS COUNT
    const { count: subjectsCount } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true });

    // PLANS COUNT
    const { count: planCount } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true });

    // SUBSCRIPTIONS COUNT
    const { count: subsCount } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true });

    // DEVICE COUNT
    const { count: devicesCount } = await supabase
      .from('user_devices')
      .select('*', { count: 'exact', head: true });

    // TOTAL REVENUE
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('transaction_status', 'success');

    const totalRevenue = revenueData?.reduce((sum, x) => sum + Number(x.amount), 0) || 0;

    // MONTHLY REVENUE (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: monthlyRevenue } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('transaction_status', 'success')
      .gte('created_at', sixMonthsAgo.toISOString());

    // Group by month
    const revenueByMonth = monthlyRevenue?.reduce((acc = [], payment) => {
      const date = new Date(payment.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const existing = acc.find(item => item.month === monthName);
      if (existing) {
        existing.revenue += Number(payment.amount);
      } else {
        acc.push({ month: monthName, revenue: Number(payment.amount) });
      }
      return acc;
    }, []) || [];

    // USER GROWTH (Last 6 months)
    const { data: usersData } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    const userGrowthByMonth = usersData?.reduce((acc = [], user) => {
      const date = new Date(user.created_at);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const existing = acc.find(item => item.month === monthName);
      if (existing) {
        existing.users += 1;
      } else {
        acc.push({ month: monthName, users: 1 });
      }
      return acc;
    }, []) || [];

    // Sort both arrays by month
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    revenueByMonth.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
    userGrowthByMonth.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    // RECENT ACTIVITY LOGS
    const { data: activity } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    // ANALYTICS DATA
    // Views count (from audit logs with view actions)
    const { count: viewsCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .ilike('action', '%view%');

    // Downloads count (from audit logs with download actions)
    const { count: downloadsCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .ilike('action', '%download%');

    // Average session time (simulated - you might need a separate table for this)
    const avgSessionTime = 24; // minutes

    // QUESTIONS PER COURSE (via subjects -> questions count)
    const [{ data: courses }, { data: subjects }] = await Promise.all([
      supabase.from("courses").select("id, name").order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, course_id"),
    ]);

    const subjectsByCourse = new Map();
    (subjects || []).forEach((s) => {
      const key = String(s.course_id);
      if (!subjectsByCourse.has(key)) subjectsByCourse.set(key, []);
      subjectsByCourse.get(key).push(s.id);
    });

    const course_question_counts = [];
    for (const c of courses || []) {
      const subjectIds = subjectsByCourse.get(String(c.id)) || [];
      let qCount = 0;
      // count questions without loading all rows (chunk IN lists)
      for (const part of chunk(subjectIds, 500)) {
        if (!part.length) continue;
        const { count, error } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .in("subject_id", part);
        if (error) throw error;
        qCount += count || 0;
      }
      course_question_counts.push({
        course_id: c.id,
        course_name: c.name,
        subjects: subjectIds.length,
        questions: qCount,
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_users: usersCount || 0,
        active_users: activeUsersData?.length || 0,
        courses: courseCount || 0,
        subjects: subjectsCount || 0,
        plans: planCount || 0,
        subscriptions: subsCount || 0,
        devices: devicesCount || 0,
        total_revenue: totalRevenue,
      },
      charts: {
        revenue: revenueByMonth,
        user_growth: userGrowthByMonth,
      },
      activity: activity || [],
      analytics: {
        views: viewsCount || 0,
        downloads: downloadsCount || 0,
        avg_session: avgSessionTime,
      },
      course_question_counts,
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}