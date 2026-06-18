import { ensureAdmin } from "@/lib/verifyToken";
import { generateExplanationTextForced, generateExplanationTextIfNeeded } from "@/lib/ai";
import { supabase as supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req, { params }) {
	try {
		await ensureAdmin(req);
		const { id } = await params;
		const { regenerate = false } = (await req.json().catch(() => ({}))) || {};

		const text = regenerate
			? await generateExplanationTextForced(id)
			: await generateExplanationTextIfNeeded(id);

		return Response.json({ success: true, explanation: text });
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 400 });
	}
}

export async function DELETE(req, { params }) {
	try {
		await ensureAdmin(req);
		const { id } = await params;
		await supabaseAdmin.from("questions").update({ explanation: null }).eq("id", id);
		return Response.json({ success: true });
	} catch (err) {
		return Response.json({ success: false, error: err.message }, { status: 400 });
	}
}

