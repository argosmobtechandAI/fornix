import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
	try {
		const { chapter_id = null, limit = 20, user_id = null } = await req.json();

		// Fetch attempts in scope
		let attemptsQuery = supabase.from("quiz_attempts").select("user_id, score, created_at");
		if (chapter_id) attemptsQuery = attemptsQuery.eq("chapter_id", chapter_id);
		const { data: attempts } = await attemptsQuery;

		// Best score per user
		const bestByUser = new Map();
		for (const at of attempts || []) {
			if (typeof at.score !== "number") continue;
			const prev = bestByUser.get(at.user_id);
			if (!prev || at.score > prev.score) {
				bestByUser.set(at.user_id, { user_id: at.user_id, score: at.score });
			}
		}

		const leaderboard = Array.from(bestByUser.values()).sort((a, b) => b.score - a.score);
		const top = leaderboard.slice(0, Math.max(1, Math.min(100, limit)));

		let rank = null;
		if (user_id) {
			rank = leaderboard.findIndex(x => x.user_id === user_id) + 1 || null;
		}

		return Response.json({
			success: true,
			top,
			totalUsers: leaderboard.length,
			rank,
		});
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 500 });
	}
}



