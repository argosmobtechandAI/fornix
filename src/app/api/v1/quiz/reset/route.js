import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
	try {
		const { user_id, chapter_id = null, chapter_ids = null, topic_ids = null, question_type = null } = await req.json();
		if (!user_id) {
			return Response.json({ success: false, error: "user_id required" }, { status: 400 });
		}

		let targetChapterIds = [];
		if (chapter_id) {
			targetChapterIds = [chapter_id];
		} else if (Array.isArray(chapter_ids) && chapter_ids.length > 0) {
			targetChapterIds = chapter_ids;
		}

		// Scenario 1: Target-Specific Reset (Chapter, Chapters, or Topics)
		if (targetChapterIds.length > 0 || (Array.isArray(topic_ids) && topic_ids.length > 0)) {
			// Find all question_ids in these chapters/topics
			let qQuery = supabase.from("questions").select("id");
			if (targetChapterIds.length > 0) {
				qQuery = qQuery.in("chapter_id", targetChapterIds);
			} else {
				qQuery = qQuery.in("topic_id", topic_ids);
			}

			if (question_type && question_type.toLowerCase() !== 'mixed') {
				qQuery = qQuery.eq("question_type", question_type.toLowerCase());
			}

			const { data: questions } = await qQuery;
			const questionIds = (questions || []).map(q => q.id);

			if (questionIds.length > 0) {
				// Find all of THIS user's attempts to narrow down the deletion
				const { data: userAttempts } = await supabase.from("quiz_attempts").select("id").eq("user_id", user_id);
				const userAttemptIds = (userAttempts || []).map(a => a.id);

				if (userAttemptIds.length > 0) {
					// Delete answers to THESE questions from THIS user's attempts in chunks
					const chunkSize = 50;
					for (let i = 0; i < questionIds.length; i += chunkSize) {
						const qChunk = questionIds.slice(i, i + chunkSize);
						
						for (let j = 0; j < userAttemptIds.length; j += chunkSize) {
							const aChunk = userAttemptIds.slice(j, j + chunkSize);
							await supabase
								.from("quiz_answers")
								.delete()
								.in("attempt_id", aChunk)
								.in("question_id", qChunk);
						}
					}
                    
                    // Also delete the specific chapter attempts if they were direct chapter tests
					if (targetChapterIds.length > 0) {
						let attemptsQuery = supabase
							.from("quiz_attempts")
							.delete()
							.eq("user_id", user_id)
							.in("chapter_id", targetChapterIds);

						if (question_type && question_type.toLowerCase() !== 'mixed') {
							attemptsQuery = attemptsQuery.eq("question_type", question_type.toLowerCase());
						}

						await attemptsQuery;
					}
				}
			}
			return Response.json({ success: true, message: "Progress reset successfully" });
		}

		// Scenario 2: Global Reset (All Quiz History for User)
		const { data: allAttempts } = await supabase.from("quiz_attempts").select("id").eq("user_id", user_id);
		const allAttemptIds = (allAttempts || []).map(a => a.id);

		if (allAttemptIds.length > 0) {
			await supabase.from("quiz_answers").delete().in("attempt_id", allAttemptIds);
			await supabase.from("quiz_attempts").delete().in("id", allAttemptIds);
		}

		return Response.json({ success: true, deleted_attempts: allAttemptIds.length });
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 500 });
	}
}



