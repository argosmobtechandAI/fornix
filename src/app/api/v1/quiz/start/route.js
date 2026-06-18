import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
	try {
		const {
			user_id,
			chapter_id = null,
			topic_ids = [],
			limit = 20,
		} = await req.json();

		if (!user_id) {
			return Response.json({ success: false, error: "user_id required" }, { status: 400 });
		}

		// Enforce free-user quiz limit before starting a new mixed quiz attempt
		let hasActiveSubscription = false;
		try {
			const nowIso = new Date().toISOString();
			const { data: subs, error: subErr } = await supabase
				.from("user_subscriptions")
				.select("id")
				.eq("user_id", user_id)
				.neq("is_active", false)
				.gte("end_date", nowIso)
				.order("end_date", { ascending: false })
				.limit(1);

			if (!subErr && (subs || []).length > 0) {
				hasActiveSubscription = true;
			}
		} catch (e) {
			// If subscription check fails, don't block; treat as paid.
			hasActiveSubscription = true;
		}

		if (!hasActiveSubscription) {
			const { count: attemptCount, error: countErr } = await supabase
				.from("quiz_attempts")
				.select("*", { count: "exact", head: true })
				.eq("user_id", user_id);

			if (!countErr && typeof attemptCount === "number" && attemptCount >= 50) {
				return Response.json(
					{
						success: false,
						error: "FREE_QUIZ_LIMIT_REACHED",
						message:
							"Free users can attempt only 50 quizzes. Please purchase a plan to continue.",
					},
					{ status: 403 }
				);
			}
		}
		if (!chapter_id && (!Array.isArray(topic_ids) || topic_ids.length === 0)) {
			return Response.json({ success: false, error: "Provide chapter_id or topic_ids[]" }, { status: 400 });
		}

		// 1) Candidate questions for scope
		let candidates = [];
		if (chapter_id) {
			const { data, error } = await supabase
				.from("questions")
				.select("id")
				.eq("chapter_id", chapter_id);
			// .eq("status", "approved");
			if (error) throw error;
			candidates = (data || []).map(x => x.id);
		} else if (topic_ids?.length) {
			const { data, error } = await supabase
				.from("questions")
				.select("id, topic_id")
				.in("topic_id", topic_ids);
			// .eq("status", "approved");
			if (error) throw error;
			candidates = (data || []).map(x => x.id);
		}

		// 2) Previously attempted question_ids for user (across all attempts) that are candidates
		let attemptedIds = [];
		{
			const [quizAtt, testAtt] = await Promise.all([
				supabase.from("quiz_attempts").select("id").eq("user_id", user_id).limit(10000),
				supabase.from("test_attempts").select("id").eq("user_id", user_id).limit(10000)
			]);

			const attemptIds = (quizAtt.data || []).map(a => a.id).filter(Boolean);
			const testAttempts = testAtt.data || [];

			const attemptedSet = new Set();

			// 2a) Fetch quiz answers from quiz_attempts in chunks of 50 to avoid query string limits
			if (attemptIds.length > 0) {
				const chunkSize = 50;
				for (let i = 0; i < attemptIds.length; i += chunkSize) {
					const chunk = attemptIds.slice(i, i + chunkSize);
					const { data: answers, error: ansErr } = await supabase
						.from("quiz_answers")
						.select("question_id")
						.in("attempt_id", chunk)
						.limit(50000);
					if (!ansErr && answers) {
						answers.forEach(ans => attemptedSet.add(ans.question_id));
					}
				}
			}

			// 2b) Fetch test answers from test_attempts in chunks of 50 to avoid query string limits
			if (testAttempts.length > 0) {
				const testIds = testAttempts.map(t => t.id);
				const chunkSize = 50;
				for (let i = 0; i < testIds.length; i += chunkSize) {
					const chunk = testIds.slice(i, i + chunkSize);
					const { data: testAnswersData, error: tErr } = await supabase
						.from("test_attempts")
						.select("answers")
						.in("id", chunk);
					if (!tErr && testAnswersData) {
						testAnswersData.forEach(tAttempt => {
							if (Array.isArray(tAttempt.answers)) {
								tAttempt.answers.forEach(ans => {
									if (ans.question_id) attemptedSet.add(ans.question_id);
								});
							}
						});
					}
				}
			}

			// Filter to candidates
			attemptedIds = candidates.filter(id => attemptedSet.has(id));
		}

		// 3) Build selection: prefer unattempted, then fill from attempted to reach limit
		const setCandidates = new Set(candidates);
		const setAttempted = new Set(attemptedIds);
		const unattempted = [...setCandidates].filter(id => !setAttempted.has(id));
		const attempted = [...setCandidates].filter(id => setAttempted.has(id));

		// Shuffle helper
		function shuffle(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		}

		shuffle(unattempted);
		shuffle(attempted);

		const pick = [];
		for (const id of unattempted) {
			if (pick.length >= limit) break;
			pick.push(id);
		}
		for (const id of attempted) {
			if (pick.length >= limit) break;
			if (!pick.includes(id)) pick.push(id);
		}

		// 4) Fetch question payload (without correct answers)
		let questions = [];
		if (pick.length > 0) {
			const { data: qs, error } = await supabase
				.from("questions")
				.select("id, question_text, question_type, question_image_url, explanation")
				.in("id", pick);
			if (error) throw error;

			// Preserve selection order
			const byId = new Map((qs || []).map(q => [q.id, q]));
			questions = pick.map(id => byId.get(id)).filter(Boolean);

			// Attach options only (no correct key)
			for (const q of questions) {
				const { data: options } = await supabase
					.from("question_options")
					.select("option_key, content")
					.eq("question_id", q.id)
					.order("option_key");
				q.options = options || [];
				delete q.explanation; // Optional: avoid leaking explanation
			}
		}

		// 5) Create attempt (started)
		const { data: attempt, error: attemptErr } = await supabase
			.from("quiz_attempts")
			.insert({
				user_id,
				chapter_id: chapter_id || null,
				total_questions: questions.length,
				started_at: new Date(),
			})
			.select()
			.single();
		
		if (attemptErr) throw attemptErr;

		// 6) Persist selected questions in quiz_answers with null selections
		if (attempt?.id && pick.length > 0) {
			// Fetch correct keys for these questions
			const { data: corrects, error: cErr } = await supabase
				.from("correct_answers")
				.select("question_id, correct_key")
				.in("question_id", pick);
			
			if (!cErr && corrects) {
				const correctMap = new Map(corrects.map(c => [String(c.question_id), c.correct_key]));
				
				// Bulk insert into quiz_answers
				const { error: ansErr } = await supabase
					.from("quiz_answers")
					.insert(pick.map(qId => ({
						attempt_id: attempt.id,
						question_id: qId,
						selected_key: null,
						correct_key: correctMap.get(String(qId)) || null,
						is_correct: false
					})));
				
				if (ansErr) {
					console.error('[quiz/start] Failed to persist questions:', ansErr);
				}
			}
		}

		return Response.json({
			success: true,
			attempt_id: attempt?.id,
			total: questions.length,
			data: questions,
		});
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 500 });
	}
}



