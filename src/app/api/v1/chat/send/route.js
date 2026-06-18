import { supabase } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function ensureEnv() {
  if (!openai) throw new Error("Missing OPENAI_API_KEY");
}

export async function POST(req) {
  try {
    const { user_id, course_name, query, session_id = null } = await req.json();
    if (!user_id || !course_name || !query) {
      return new Response(JSON.stringify({ success: false, error: "user_id, course_name, and query are required" }), { status: 400 });
    }

    // Find or create session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: session, error: sessionErr } = await supabase
        .from("chat_sessions")
        .insert([{ user_id, course_name }])
        .select()
        .single();
      if (sessionErr) throw sessionErr;
      sessionId = session.id;
    }

    // Store user message
    await supabase.from("chat_messages").insert([{ session_id: sessionId, message: query, is_user: true }]);

    // Compose system prompt with strict medical boundaries and course specifics
    const isAMC = String(course_name || "").toUpperCase().includes("AMC");

    let courseContext = isAMC
      ? "AMC (Australian Medical Council) exam, which strictly focuses on clinical reasoning, standard Australian medical guidelines, and applied medicine"
      : `medical exam preparation course called '${course_name}'`;

    const system = `You are an expert AI medical tutor specifically assisting a medical student with their ${courseContext}. Provide highly accurate, medically sound information. Only answer questions related to human medicine, clinical guidelines, and this course's specific subjects/topics. If the student asks a question entirely unrelated to medicine or their course, politely refuse to answer.`;
    ensureEnv();

    // Load previous conversation history for context (last 20 messages)
    const { data: history, error: histErr } = await supabase
      .from("chat_messages")
      .select("message, is_user")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (histErr) throw histErr;

    // Build OpenAI messages array: system + history + current query
    const messages = [{ role: "system", content: system }];

    // Add previous messages as conversation context
    for (const msg of (history || [])) {
      messages.push({
        role: msg.is_user ? "user" : "assistant",
        content: msg.message,
      });
    }

    // Add the current user query (it's already saved in DB above, 
    // but we add it here too in case history fetch missed the just-inserted row)
    if (!history?.length || history[history.length - 1]?.message !== query) {
      messages.push({ role: "user", content: query });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 400,
    });
    const aiText = completion.choices?.[0]?.message?.content?.trim() || "";

    // Store AI message
    await supabase.from("chat_messages").insert([{ session_id: sessionId, message: aiText, is_user: false }]);

    return new Response(JSON.stringify({ success: true, session_id: sessionId, ai_message: aiText }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
