import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
	try {
		const { user_id, attempt_id, answers, time_taken_seconds } = await req.json();

		if (!user_id || !Array.isArray(answers) || answers.length === 0) {
			return Response.json({ success: false, error: "Invalid payload" }, { status: 400 });
		}

		// Load attempt (if provided) or create new
		let attempt = null;
		if (attempt_id) {
			const { data: existingAttempt } = await supabase.from("quiz_attempts").select("*").eq("id", attempt_id).single();
			attempt = existingAttempt;
			if (!attempt || attempt.user_id !== user_id) {
				return Response.json({ success: false, error: "Attempt not found or not owned by user" }, { status: 404 });
			}
			// Clear any pre-populated or previous answers for this attempt (idempotent)
			await supabase.from("quiz_answers").delete().eq("attempt_id", attempt_id);
		} else {
			const { data: created } = await supabase
				.from("quiz_attempts")
				.insert({
					user_id,
					total_questions: answers.length,
					started_at: new Date(),
				})
				.select()
				.single();
			attempt = created;
		}

		// Fetch question marks/negative_marks and correct keys in bulk with chunking to avoid 414 error
		const questionIds = answers.map(a => a.question_id).filter(Boolean);
		
		let qs = [];
		let corrects = [];
		const chunkSize = 50; // Small chunk size to keep URLs short

		for (let i = 0; i < questionIds.length; i += chunkSize) {
			const chunk = questionIds.slice(i, i + chunkSize);
			
			// Fetch questions for chunk
			const { data: qChunk, error: qErr } = await supabase
				.from("questions")
				.select("id, marks, negative_marks")
				.in("id", chunk);
			if (qErr) throw qErr;
			if (qChunk) qs = qs.concat(qChunk);

			// Fetch correct answers for chunk
			const { data: cChunk, error: cErr } = await supabase
				.from("correct_answers")
				.select("question_id, correct_key")
				.in("question_id", chunk);
			if (cErr) throw cErr;
			if (cChunk) corrects = corrects.concat(cChunk);
		}

		const qById = new Map((qs || []).map(q => [q.id, q]));
		const correctMap = new Map((corrects || []).map(c => [c.question_id, c.correct_key]));

		let correct = 0;
		let obtainedMarks = 0;
		let totalMarks = 0;

		for (const a of answers) {
			const q = qById.get(a.question_id);
			if (!q) continue;

			const ck = correctMap.get(a.question_id) || null;
			const selected = a.selected_key;
			const isCorrect = ck && selected ? ck === selected : false;

			const baseMarks = Number(q.marks ?? 1) || 0;
			const negMarks = Number(q.negative_marks ?? 0) || 0;
			totalMarks += baseMarks;

			let delta = 0;
			if (selected) {
				if (isCorrect) {
					correct++;
					delta = baseMarks;
				} else {
					delta = -negMarks;
				}
			}
			obtainedMarks += delta;

			await supabase.from("quiz_answers").insert({
				attempt_id: attempt.id,
				question_id: a.question_id,
				selected_key: selected,
				correct_key: ck,
				is_correct: isCorrect,
			});
		}

		const total = answers.length;
		const score = totalMarks > 0
			? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100)
			: 0;

		await supabase
			.from("quiz_attempts")
			.update({
				correct_answers: correct,
				score,
				time_taken_seconds: time_taken_seconds || null,
				completed_at: new Date(),
			})
			.eq("id", attempt.id);

		// Leaderboard/rank: compute user's rank among attempts in same chapter (if present) else global
		const scopeFilter = attempt.chapter_id ? { column: "chapter_id", value: attempt.chapter_id } : null;

		// Fetch all attempts in scope
		let attemptsQuery = supabase.from("quiz_attempts").select("user_id, score, created_at");
		if (scopeFilter) attemptsQuery = attemptsQuery.eq(scopeFilter.column, scopeFilter.value);
		const { data: scopeAttempts } = await attemptsQuery;

		// Build best-score per user
		const bestByUser = new Map();
		for (const at of scopeAttempts || []) {
			if (typeof at.score !== "number") continue;
			const prev = bestByUser.get(at.user_id);
			if (!prev || at.score > prev.score) {
				bestByUser.set(at.user_id, { user_id: at.user_id, score: at.score });
			}
		}

		const leaderboard = Array.from(bestByUser.values()).sort((a, b) => b.score - a.score);
		const rank = leaderboard.findIndex(x => x.user_id === user_id) + 1 || null;
		const outOf = leaderboard.length;

		return Response.json({
			success: true,
			attempt_id: attempt.id,
			score,
			obtained_marks: obtainedMarks,
			total_marks: totalMarks,
			correct,
			total,
			rank,
			outOf,
		});
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 500 });
	}
}



