import { supabase as supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function ensureEnv() {
	if (!OPENAI_API_KEY) {
		throw new Error("Missing OPENAI_API_KEY");
	}
}

export async function generateExplanationTextIfNeeded(questionId) {
	// Pull existing explanation; if present, return it
	const { data: q, error: qErr } = await supabaseAdmin
		.from("questions")
		.select("id, question_text, explanation")
		.eq("id", questionId)
		.single();
	if (qErr) throw new Error(qErr.message);
	if (q?.explanation && q.explanation.trim().length > 0) {
		return q.explanation;
	}

	// Fetch options and correct answer to compose context
	const [{ data: opts, error: optsErr }, { data: correct, error: corrErr }] =
		await Promise.all([
			supabaseAdmin
				.from("question_options")
				.select("option_key, content")
				.eq("question_id", questionId)
				.order("option_key", { ascending: true }),
			supabaseAdmin
				.from("correct_answers")
				.select("correct_key")
				.eq("question_id", questionId)
				.single(),
		]);
	if (optsErr) throw new Error(optsErr.message);
	if (corrErr) throw new Error(corrErr.message);

	const optionsText = (opts || [])
		.map((o) => `${String(o.option_key).toUpperCase()}. ${o.content}`)
		.join("\n");
	const correctKey = correct?.correct_key?.toUpperCase?.() || "";

	const prompt = [
		{
			role: "system",
			content:
				"You are an experienced, authoritative senior doctor and medical professor. Explain the reasoning behind the correct answer in a natural, conversational, yet highly professional tone. Requirements:\n- Write exactly as a seasoned physician would explain this case to a medical student or junior resident on rounds\n- Be insightful and educational, weaving the clinical clues into the pathophysiology naturally\n- Do NOT use numbered lists, headings, or rigidly structured outlines\n- Speak naturally in cohesive paragraphs\n- Do not use filler, apologies, or AI greetings\n- Briefly explain why the correct answer is right and naturally mention why key alternatives are incorrect\n- Length target: around 120–200 words",
		},
		{
			role: "user",
			content:
				`Question:\n${q.question_text}\n\nOptions:\n${optionsText || "N/A"}\n\nCorrect Answer: ${correctKey}\n\nProvide a realistic, expert doctor's explanation of the correct answer directly addressing the clinical reasoning. No rigid outlines, headings, or numbered steps. Just a fluid, insightful, and concise clinical explanation in natural paragraphs.`,
		},
	];

	let explanation = null;
	// Use OpenAI (npm SDK) for explanation generation with simple retries
	ensureEnv();
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const data = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: prompt,
				temperature: 0.4,
			});
			explanation = data?.choices?.[0]?.message?.content?.trim?.() || null;
			break;
		} catch (e) {
			const msg = e?.message || "";
			// Map network errors
			if (/fetch failed/i.test(msg) || /ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(msg)) {
				if (attempt === 3) {
					const err = new Error("NETWORK_ERROR: Unable to reach OpenAI API");
					err.code = "NETWORK_ERROR";
					throw err;
				}
			} else {
				// Non-network: break without retry
				break;
			}
			// Backoff
			await new Promise((r) => setTimeout(r, 300 * attempt));
		}
	}

	if (!explanation) {
		explanation = "Explanation unavailable.";
	}

	// Persist explanation in DB for future reuse
	await supabaseAdmin
		.from("questions")
		.update({ explanation })
		.eq("id", questionId);

	return explanation;
}

export async function generateExplanationTextForced(questionId) {
	// Fetch question and context
	const { data: q, error: qErr } = await supabaseAdmin
		.from("questions")
		.select("id, question_text")
		.eq("id", questionId)
		.single();
	if (qErr) throw new Error(qErr.message);

	const [{ data: opts, error: optsErr }, { data: correct, error: corrErr }] =
		await Promise.all([
			supabaseAdmin
				.from("question_options")
				.select("option_key, content")
				.eq("question_id", questionId)
				.order("option_key", { ascending: true }),
			supabaseAdmin
				.from("correct_answers")
				.select("correct_key")
				.eq("question_id", questionId)
				.single(),
		]);
	if (optsErr) throw new Error(optsErr.message);
	if (corrErr) throw new Error(corrErr.message);

	const optionsText = (opts || [])
		.map((o) => `${String(o.option_key).toUpperCase()}. ${o.content}`)
		.join("\n");
	const correctKey = correct?.correct_key?.toUpperCase?.() || "";

	const prompt = [
		{
			role: "system",
			content:
				"You are an experienced, authoritative senior doctor and medical professor. Explain the reasoning behind the correct answer in a natural, conversational, yet highly professional tone. Requirements:\n- Write exactly as a seasoned physician would explain this case to a medical student or junior resident on rounds\n- Be insightful and educational, weaving the clinical clues into the pathophysiology naturally\n- Do NOT use numbered lists, headings, or rigidly structured outlines\n- Speak naturally in cohesive paragraphs\n- Do not use filler, apologies, or AI greetings\n- Briefly explain why the correct answer is right and naturally mention why key alternatives are incorrect\n- Length target: around 120–200 words",
		},
		{
			role: "user",
			content:
				`Question:\n${q.question_text}\n\nOptions:\n${optionsText || "N/A"}\n\nCorrect Answer: ${correctKey}\n\nProvide a realistic, expert doctor's explanation of the correct answer directly addressing the clinical reasoning. No rigid outlines, headings, or numbered steps. Just a fluid, insightful, and concise clinical explanation in natural paragraphs.`,
		},
	];

	let explanation = null;
	ensureEnv();
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const data = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: prompt,
				temperature: 0.4,
			});
			explanation = data?.choices?.[0]?.message?.content?.trim?.() || null;
			break;
		} catch (e) {
			const msg = e?.message || "";
			if (/fetch failed/i.test(msg) || /ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(msg)) {
				if (attempt === 3) {
					const err = new Error("NETWORK_ERROR: Unable to reach OpenAI API");
					err.code = "NETWORK_ERROR";
					throw err;
				}
				await new Promise((r) => setTimeout(r, 300 * attempt));
			} else {
				break;
			}
		}
	}

	if (!explanation) {
		explanation = "Explanation unavailable.";
	}

	await supabaseAdmin
		.from("questions")
		.update({ explanation })
		.eq("id", questionId);

	return explanation;
}

export async function synthesizeSpeechToBuffer(text, gender) {
	// Use OpenAI TTS (npm SDK)
	if (!openai) {
		throw new Error("No TTS provider configured");
	}

	// Map simple gender to OpenAI voice names
	const femaleOpenAiEnv =
		process.env.OPENAI_TTS_VOICE_FEMALE; // e.g., coral, shimmer, nova, ballad...
	const maleOpenAiEnv = process.env.OPENAI_TTS_VOICE_MALE; // e.g., alloy
	// Choose a more feminine default for female, while keeping 'alloy' for male
	const voice =
		gender === "female"
			? femaleOpenAiEnv || "coral"
			: maleOpenAiEnv || "onyx";

	// Simple retries for transient network issues
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const speech = await openai.audio.speech.create({
				model: "gpt-4o-mini-tts",
				voice,
				input: text,
				format: "mp3",
			});
			// Node: get ArrayBuffer and convert to Buffer
			const arrayBuffer = await speech.arrayBuffer();
			return Buffer.from(arrayBuffer);
		} catch (e) {
			const message = e?.message || "";
			const status = e?.status || e?.response?.status;
			if (status === 429 || /insufficient_quota/i.test(message)) {
				const err = new Error(
					`INSUFFICIENT_QUOTA: ${status || ""} ${message || ""}`.trim()
				);
				err.code = "INSUFFICIENT_QUOTA";
				throw err;
			}
			if (/fetch failed/i.test(message) || /ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(message)) {
				if (attempt === 3) {
					const err = new Error("NETWORK_ERROR: Unable to reach OpenAI API");
					err.code = "NETWORK_ERROR";
					throw err;
				}
				await new Promise((r) => setTimeout(r, 300 * attempt));
				continue;
			}
			throw new Error(`OpenAI TTS error: ${status || ""} ${message}`);
		}
	}
}

const LANG_MAP = {
	en: "English",
	hi: "Hinglish",
};

export async function translateText(text, targetLangCode) {
	if (!text || targetLangCode === "en") return text;

	ensureEnv();

	const isHinglish = targetLangCode === "hi";
	const systemPrompt = isHinglish
		? `You are an Indian medical professor who teaches MBBS students in Hinglish — the natural way Indian doctors and students actually speak, which is primarily English with Hindi words mixed in conversationally. Rewrite the following medical explanation in this authentic Hinglish style.

Core rule: The explanation must remain MOSTLY IN ENGLISH. Only replace common sentence connectives, simple verbs, and filler phrases with their natural Hindi equivalents. Do NOT translate the explanation into Hindi.

What to keep in English (always):
- All medical terms, drug names, anatomical terms, disease names, investigations
- Technical and clinical reasoning sentences
- Any word that an MBBS student already understands in English

What to naturally mix in Hindi (Roman script — no Devanagari):
- Connectives: "toh", "aur", "lekin", "kyunki", "isliye", "yani", "matlab", "jaise ki"
- Filler/emphasis: "basically", "dekho", "samjho", "dhyan do", "yahan", "wahan", "iska"
- Simple verbs where natural: "hota hai", "karte hain", "milta hai", "dena chahiye", "hogi"
- Transitions: "ab dekho", "toh yahan", "is case mein", "isliye hum", "yeh important hai"

Example of the correct style:
"Toh is question mein, patient ko chest pain aa raha hai with ST elevation, which clearly indicates a myocardial infarction. Ab isliye, first-line treatment mein hum beta blockers dete hain kyunki they reduce cardiac workload and heart rate. Aur aspirin bhi dena chahiye to prevent further platelet aggregation."

Tone: warm, conversational, like a coaching class teacher explaining to students.
Length: same as the original — do not add or remove clinical content.
Do not add greetings, headers, or extra commentary.`
		: `You are a professional medical translator. Translate the following explanation text precisely into ${LANG_MAP[targetLangCode] || targetLangCode}. Maintain the formatting, step numbers, and professional tone. Do not add any extra commentary.`;

	const prompt = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: text },
	];

	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const data = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: prompt,
				temperature: 0.2,
			});
			const translated = data?.choices?.[0]?.message?.content?.trim?.();
			if (translated) return translated;
		} catch (e) {
			const msg = e?.message || "";
			if (/fetch failed/i.test(msg) || /ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(msg)) {
				if (attempt === 3) throw new Error("NETWORK_ERROR: Unable to reach OpenAI API for translation");
				await new Promise((r) => setTimeout(r, 300 * attempt));
			} else {
				throw e;
			}
		}
	}
	return text;
}

export async function ensureQuestionTts(questionId, gender, language = "en") {
	// gender: 'male' | 'female'
	// language: 'en', 'hi', etc.

	const { data: q0, error: q0Err } = await supabaseAdmin
		.from("questions")
		.select(`id, male_explanation_audio_url, female_explanation_audio_url, explanation_audio_urls, explanation`)
		.eq("id", questionId)
		.single();
	if (q0Err) throw new Error(q0Err.message);

	let audioUrls = q0?.explanation_audio_urls || {};
	if (typeof audioUrls !== 'object') audioUrls = {};

	// Check existing URL in JSONB
	if (audioUrls[language]?.[gender]) {
		return audioUrls[language][gender];
	}

	// Legacy fallback for English
	if (language === "en") {
		const legacyField = gender === "female" ? "female_explanation_audio_url" : "male_explanation_audio_url";
		if (q0?.[legacyField]) {
			// Migrate it to JSONB on the fly and return
			audioUrls["en"] = audioUrls["en"] || {};
			audioUrls["en"][gender] = q0[legacyField];
			await supabaseAdmin.from("questions").update({ explanation_audio_urls: audioUrls }).eq("id", questionId);
			return q0[legacyField];
		}
	}

	// Ensure explanation text
	let explanationText =
		q0?.explanation && q0.explanation.trim().length > 0
			? q0.explanation
			: await generateExplanationTextIfNeeded(questionId);

	// Translate if needed
	if (language !== "en") {
		explanationText = await translateText(explanationText, language);
	}

	// Synthesize TTS
	const audioBuffer = await synthesizeSpeechToBuffer(explanationText, gender);

	// Upload to Supabase storage
	const bucket = "question-explanations";
	const filename = `${questionId}_${gender}_${language}_${Date.now()}.mp3`;
	const { error: upErr } = await supabaseAdmin.storage
		.from(bucket)
		.upload(filename, audioBuffer, {
			contentType: "audio/mpeg",
			upsert: true,
		});
	if (upErr) throw new Error(upErr.message);

	const { data: pub } = supabaseAdmin.storage
		.from(bucket)
		.getPublicUrl(filename);
	const publicUrl = pub?.publicUrl;
	if (!publicUrl) throw new Error("Failed to resolve public URL for audio");

	// Update question row
	audioUrls[language] = audioUrls[language] || {};
	audioUrls[language][gender] = publicUrl;

	const updatePayload = { explanation_audio_urls: audioUrls };

	// Pre-fill legacy columns if language is English to prevent breaking old things
	if (language === "en") {
		const legacyField = gender === "female" ? "female_explanation_audio_url" : "male_explanation_audio_url";
		updatePayload[legacyField] = publicUrl;
	}

	const { error: updErr } = await supabaseAdmin
		.from("questions")
		.update(updatePayload)
		.eq("id", questionId);

	if (updErr) throw new Error(updErr.message);

	return publicUrl;
}

export async function regenerateQuestionTts(questionId, gender, language = "en") {
	// Always generate new audio and upsert
	const { data: q0, error: q0Err } = await supabaseAdmin
		.from("questions")
		.select(`id, explanation, explanation_audio_urls`)
		.eq("id", questionId)
		.single();
	if (q0Err) throw new Error(q0Err.message);

	let explanationText =
		q0?.explanation && q0.explanation.trim().length > 0
			? q0.explanation
			: await generateExplanationTextForced(questionId);

	if (language !== "en") {
		explanationText = await translateText(explanationText, language);
	}

	const audioBuffer = await synthesizeSpeechToBuffer(explanationText, gender);
	const bucket = "question-explanations";
	const filename = `${questionId}_${gender}_${language}_${Date.now()}.mp3`;
	const { error: upErr } = await supabaseAdmin.storage
		.from(bucket)
		.upload(filename, audioBuffer, {
			contentType: "audio/mpeg",
			upsert: true,
		});
	if (upErr) throw new Error(upErr.message);

	const { data: pub } = supabaseAdmin.storage
		.from(bucket)
		.getPublicUrl(filename);
	const publicUrl = pub?.publicUrl;
	if (!publicUrl) throw new Error("Failed to resolve public URL for audio");

	let audioUrls = q0?.explanation_audio_urls || {};
	if (typeof audioUrls !== 'object') audioUrls = {};

	audioUrls[language] = audioUrls[language] || {};
	audioUrls[language][gender] = publicUrl;

	const updatePayload = { explanation_audio_urls: audioUrls };

	if (language === "en") {
		const legacyField = gender === "female" ? "female_explanation_audio_url" : "male_explanation_audio_url";
		updatePayload[legacyField] = publicUrl;
	}

	const { error: updErr } = await supabaseAdmin
		.from("questions")
		.update(updatePayload)
		.eq("id", questionId);
	if (updErr) throw new Error(updErr.message);

	return publicUrl;
}

