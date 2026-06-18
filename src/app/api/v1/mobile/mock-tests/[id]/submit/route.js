import { supabase } from "@/lib/supabaseAdmin";
 
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

 // POST /api/v1/mobile/mock-tests/[id]/submit - Submit test answers
 export async function POST(req, { params }) {
   try {
     const { id } = await params;
     const body = await req.json();
     const { user_id, answers, time_taken_seconds } = body;
     
     if (!user_id) {
       return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
     }
 
     if (!answers || !Array.isArray(answers)) {
       return Response.json({ success: false, error: "answers array is required" }, { status: 400 });
     }
 
     // Get test details
     const { data: testData, error: testError } = await supabase
       .from("mock_tests")
       .select(`
         id,
         total_questions,
         mock_test_questions (
           id,
           question_id
         )
       `)
       .eq("id", id);
 
     if (testError) throw testError;
     
     const test = testData && testData.length > 0 ? testData[0] : null;
     
     if (!test) {
       return Response.json({ success: false, error: "Test not found" }, { status: 404 });
     }
 
     // Get correct answers
     const questionIds = test.mock_test_questions.map(q => q.question_id);
     
     let correctAnswersData = [];
     const chunkSize = 50;

     for (const part of chunk(questionIds, chunkSize)) {
        const { data: caChunk } = await supabase
          .from("correct_answers")
          .select("question_id, correct_key")
          .in("question_id", part);
        if (caChunk) correctAnswersData = correctAnswersData.concat(caChunk);
     }
 
     // Create a map of question_id -> correct_key
     const correctMap = {};
     (correctAnswersData || []).forEach(ca => {
       correctMap[ca.question_id] = ca.correct_key?.toLowerCase();
     });
 
     // Calculate score
     let correctAnswers = 0;
     let wrongAnswers = 0;
     let unanswered = 0;
 
     const answerDetails = answers.map(answer => {
       const correctKey = correctMap[answer.question_id];
       const selectedOption = answer.selected_option?.toLowerCase();
       const isCorrect = selectedOption && correctKey === selectedOption;
       
       if (!selectedOption || selectedOption === "") {
         unanswered++;
       } else if (isCorrect) {
         correctAnswers++;
       } else {
         wrongAnswers++;
       }
       
       return {
         question_id: answer.question_id,
         selected_option: answer.selected_option,
         correct_option: correctKey,
         is_correct: isCorrect,
       };
     });
 
     const totalQuestions = test.total_questions;
     const score = Math.round((correctAnswers / totalQuestions) * 100);
 
     // Check if user has already completed this test
     const { data: existingAttemptData } = await supabase
       .from("test_attempts")
       .select("id, status")
       .eq("mock_test_id", id)
       .eq("user_id", user_id);
 
     const completedAttempt = (existingAttemptData || []).find(a => a.status === "completed");
     if (completedAttempt) {
       return Response.json({
         success: true, // Return true but with result to allow review even if re-submitted
         is_already_submitted: true,
         result: completedAttempt
       }, { status: 200 });
     }
 
     // Check for in-progress attempt
     const inProgressAttempt = (existingAttemptData || []).find(a => a.status === "in_progress");
     let attempt;
     if (inProgressAttempt) {
       // Update existing attempt
       const { data, error } = await supabase
         .from("test_attempts")
         .update({
           answers: answerDetails,
           score,
           status: "completed",
           correct_answers: correctAnswers,
           wrong_answers: wrongAnswers,
           unanswered: unanswered,
           total_questions: totalQuestions,
           time_taken_seconds: time_taken_seconds || null,
           completed_at: new Date(),
         })
         .eq("id", inProgressAttempt.id)
         .select()
         .single();
 
       if (error) throw error;
       attempt = data;
     } else {
       // Create new attempt (for direct submission without start)
       const { data, error } = await supabase
         .from("test_attempts")
         .insert([{
           user_id: user_id,
           mock_test_id: id,
           answers: answerDetails,
           score,
           status: "completed",
           correct_answers: correctAnswers,
           wrong_answers: wrongAnswers,
           unanswered: unanswered,
           total_questions: totalQuestions,
           time_taken_seconds: time_taken_seconds || null,
           started_at: new Date(),
           completed_at: new Date(),
         }])
         .select()
         .single();
 
       if (error) throw error;
       attempt = data;
     }
 
     // Fetch detailed question info for response
     let questionsData = [];
     let optionsData = [];

     for (const part of chunk(questionIds, chunkSize)) {
        // 1. Get questions for chunk
        const { data: qChunk } = await supabase
          .from("questions")
          .select("id, question_text, question_type, question_image_url, explanation, male_explanation_audio_url, female_explanation_audio_url, explanation_audio_urls")
          .in("id", part);
        if (qChunk) questionsData = questionsData.concat(qChunk);

        // 2. Get options for chunk
        const { data: optChunk } = await supabase
          .from("question_options")
          .select("question_id, option_key, content")
          .in("question_id", part)
          .order("option_key");
        if (optChunk) optionsData = optionsData.concat(optChunk);
     }
 
     // 3. Build options map
     const optionsMap = {};
     (optionsData || []).forEach(opt => {
       if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
       optionsMap[opt.question_id].push({
         key: opt.option_key,
         content: opt.content,
       });
     });
 
     // 4. Build answer map for user answers
     const answerMap = {};
     (answerDetails || []).forEach(ans => {
       answerMap[ans.question_id] = ans;
     });
 
     // 5. Build response details array
     const details = (questionsData || []).map(q => {
       const ans = answerMap[q.id] || {};
       return {
         question_id: q.id,
         question_text: q.question_text,
         question_type: q.question_type,
         image_url: q.question_image_url,
         explanation: q.explanation || null,
         male_explanation_audio_url: q.male_explanation_audio_url || null,
         female_explanation_audio_url: q.female_explanation_audio_url || null,
         explanation_audio_urls: q.explanation_audio_urls || null,
         options: optionsMap[q.id] || [],
         user_answer: ans.selected_option || null,
         correct_answer: ans.correct_option || null,
         is_correct: ans.is_correct || false,
       };
     });
 
     return Response.json({
       success: true,
       result: {
         attempt_id: attempt.id,
         score,
         correct_answers: correctAnswers,
         wrong_answers: wrongAnswers,
         unanswered: unanswered,
         total_questions: totalQuestions,
         percentage: score,
         time_taken_seconds: time_taken_seconds || null,
         details,
       },
     }, { status: 200 });
   } catch (err) {
     console.error("Test submission error:", err);
     return Response.json({ success: false, error: err.message }, { status: 500 });
   }
 }
