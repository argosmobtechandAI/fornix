import { ensureDoctor } from "@/lib/verifyToken";
import { ensureQuestionTts, regenerateQuestionTts } from "@/lib/ai";
import { supabase as supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req, { params }) {
	try {
		await ensureDoctor(req);
		const { id } = await params;
		const { voice, language = "en", regenerate = false } = await req.json();

		const normalized =
			String(voice || "").toLowerCase() === "female" ? "female" : "male";

		const url = regenerate
			? await regenerateQuestionTts(id, normalized, language)
			: await ensureQuestionTts(id, normalized, language);

		return Response.json(
			{
				success: true,
				url,
				voice: normalized,
				language,
			},
			{ status: 200 }
		);
	} catch (err) {
		const isQuota =
			err?.code === "INSUFFICIENT_QUOTA" ||
			/INSUFFICIENT_QUOTA|insufficient_quota/i.test(err?.message || "");
		const isNetwork =
			err?.code === "NETWORK_ERROR" ||
			/NETWORK_ERROR|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(err?.message || "");
		const status = isQuota ? 429 : isNetwork ? 502 : 400;
		return Response.json({ success: false, error: err.message }, { status });
	}
}

export async function DELETE(req, { params }) {
	try {
		await ensureDoctor(req);
		const { id } = await params;
		const urlObj = new URL(req.url);
		const voice = urlObj.searchParams.get("voice");
		const language = urlObj.searchParams.get("language") || "en";
		const normalized = String(voice || "").toLowerCase() === "female" ? "female" : "male";

		const { data: q } = await supabaseAdmin
			.from("questions")
			.select(`id, male_explanation_audio_url, female_explanation_audio_url, explanation_audio_urls`)
			.eq("id", id)
			.single();

		let audioUrls = q?.explanation_audio_urls || {};
		if (typeof audioUrls !== 'object') audioUrls = {};

		let currentUrl = null;
		if (audioUrls[language]?.[normalized]) {
			currentUrl = audioUrls[language][normalized];
			delete audioUrls[language][normalized];
			if (Object.keys(audioUrls[language]).length === 0) {
				delete audioUrls[language];
			}
		} else if (language === "en") {
			const field = normalized === "female" ? "female_explanation_audio_url" : "male_explanation_audio_url";
			currentUrl = q?.[field];
		}

		if (currentUrl) {
			const marker = "/storage/v1/object/public/";
			const idx = currentUrl.indexOf(marker);
			if (idx !== -1) {
				const after = currentUrl.substring(idx + marker.length);
				const firstSlash = after.indexOf("/");
				if (firstSlash !== -1) {
					const bucket = after.substring(0, firstSlash);
					const objectPath = after.substring(firstSlash + 1);
					await supabaseAdmin.storage.from(bucket).remove([objectPath]);
				}
			}
		}

		const updatePayload = { explanation_audio_urls: audioUrls };
		if (language === "en") {
			if (normalized === "female") updatePayload.female_explanation_audio_url = null;
			else updatePayload.male_explanation_audio_url = null;
		}
		
		await supabaseAdmin.from("questions").update(updatePayload).eq("id", id);

		return Response.json({ success: true });
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 400 });
	}
}



