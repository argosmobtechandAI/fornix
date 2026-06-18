import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const doctor = await ensureDoctor(req);
    const body = await req.json();

    const {
      subject_id,
      chapter_id,
      topic_id = null,
      question_text,
      explanation = null,
      image_url = null,
      question_image_url = null,
      options = [], 
      correct_key = null,
    } = body;

    // Validate required fields
    if (!subject_id || !chapter_id || !question_text) {
      throw new Error("subject_id, chapter_id, and question_text are required");
    }
    
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error("At least two options are required");
    }

    // Validate correct_key supports A-H
    if (correct_key && !['a','b','c','d','e','f','g','h'].includes(correct_key.toLowerCase())) {
      throw new Error("Correct key must be a letter from A to H");
    }

    // Validate that correct_key exists in provided options
    if (correct_key) {
      const correctOptionExists = options.some(opt => 
        opt.option_key.toLowerCase() === correct_key.toLowerCase()
      );
      if (!correctOptionExists) {
        throw new Error(`Correct option '${correct_key.toUpperCase()}' not found in provided options`);
      }
    }

    // Validate that the correct option has content
    if (correct_key) {
      const correctOption = options.find(opt => 
        opt.option_key.toLowerCase() === correct_key.toLowerCase()
      );
      if (!correctOption?.content?.trim()) {
        throw new Error(`Correct option '${correct_key.toUpperCase()}' cannot be empty`);
      }
    }

    // Validate at least option A and B exist
    const optionA = options.find(opt => opt.option_key.toLowerCase() === 'a');
    const optionB = options.find(opt => opt.option_key.toLowerCase() === 'b');
    
    if (!optionA?.content?.trim() || !optionB?.content?.trim()) {
      throw new Error("Options A and B are required and cannot be empty");
    }

    // Insert question
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert([{
        subject_id, 
        chapter_id, 
        topic_id, 
        question_text: question_text.trim(),
        explanation: explanation?.trim() || null, 
        image_url: image_url?.trim() || null,
        question_image_url: question_image_url?.trim() || null,
        status: 'pending', // Default status for doctor-created questions
        created_by: doctor.sub || doctor.id || null,
        updated_by: doctor.sub || doctor.id || null,
      }])
      .select()
      .single();
      
    if (questionError) throw questionError;

    // Prepare options for insertion (only include those with content)
    const optionsToInsert = options
      .map(o => ({
        question_id: question.id,
        option_key: o.option_key.toLowerCase(), // Ensure lowercase
        content: o.content?.trim() || '',
        created_by: doctor.sub || doctor.id || null,
        updated_by: doctor.sub || doctor.id || null,
      }))
      .filter(o => o.content !== ''); // Only insert options with content

    // Insert options
    const { error: optionsError } = await supabase
      .from("question_options")
      .insert(optionsToInsert);
      
    if (optionsError) {
      // Cleanup: delete the question if options insertion fails
      await supabase.from("questions").delete().eq("id", question.id);
      throw optionsError;
    }

    // Insert correct answer if provided and valid
    if (correct_key && ['a','b','c','d','e','f','g','h'].includes(correct_key.toLowerCase())) {
      const { error: correctAnswerError } = await supabase
        .from("correct_answers")
        .insert([{
          question_id: question.id, 
          correct_key: correct_key.toLowerCase(),
          created_by: doctor.sub || doctor.id || null,
          updated_by: doctor.sub || doctor.id || null,
        }]);
        
      if (correctAnswerError) {
        // Cleanup: delete options and question if correct answer insertion fails
        await supabase.from("question_options").delete().eq("question_id", question.id);
        await supabase.from("questions").delete().eq("id", question.id);
        throw correctAnswerError;
      }
    }

    // Fetch the complete question with options and correct answer
    const { data: completeQuestion, error: fetchError } = await supabase
      .from("questions")
      .select(`
        *,
        question_options:question_options!question_options_question_id_fkey (*),
        correct_answers (*)
      `)
      .eq("id", question.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete question:", fetchError);
      // Still return success since the question was created
      return new Response(JSON.stringify({ 
        success: true, 
        question: question,
        message: "Question created successfully (partial data returned)"
      }), { 
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      question: completeQuestion,
      message: "Question created successfully"
    }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (err) {
    console.error("Doctor questions POST error:", err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}