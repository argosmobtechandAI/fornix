import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { course_id, user_id } = await req.json();

    if (!course_id) {
      return NextResponse.json(
        { success: false, message: 'course_id is required' },
        { status: 400 }
      );
    }

    // 1. Fetch subjects
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, name, description, icon_url')
      .eq('course_id', course_id)
      .order('name');

    if (error) throw error;

    let result = subjects || [];
    if (result.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const subjectIds = result.map(s => s.id);
    const CHUNK_SIZE = 50;

    // 2. Fetch all chapters for these subjects
    let allChapters = [];
    for (let i = 0; i < subjectIds.length; i += CHUNK_SIZE) {
      const chunk = subjectIds.slice(i, i + CHUNK_SIZE);
      const { data: chapters, error: chapErr } = await supabase
        .from('chapters')
        .select('id, subject_id')
        .in('subject_id', chunk);
      if (chapErr) throw chapErr;
      if (chapters) allChapters = allChapters.concat(chapters);
    }

    const chapterIds = allChapters.map(c => c.id);
    const chapterToSubject = new Map(allChapters.map(c => [c.id, c.subject_id]));

    // 3. Fetch all questions for these chapters in chunks
    let questions = [];
    if (chapterIds.length > 0) {
      for (let i = 0; i < chapterIds.length; i += CHUNK_SIZE) {
        const chunk = chapterIds.slice(i, i + CHUNK_SIZE);
        let offset = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data: page, error: pageErr } = await supabase
            .from('questions')
            .select('id, chapter_id, question_type')
            .in('chapter_id', chunk)
            .range(offset, offset + pageSize - 1);
          
          if (pageErr) throw pageErr;
          if (!page || page.length === 0) break;
          
          questions = questions.concat(page);
          if (page.length < pageSize) break;
          offset += pageSize;
        }
      }
    }

    // 4. Fetch user's attempted question IDs if user_id is provided
    const attemptedQuestionIds = new Set();
    if (user_id && questions.length > 0) {
      const [quizAtt, testAtt] = await Promise.all([
        supabase.from('quiz_attempts').select('id').eq('user_id', user_id).limit(10000),
        supabase.from('test_attempts').select('id').eq('user_id', user_id).limit(10000)
      ]);

      const attemptIds = [
        ...(quizAtt.data || []).map(a => a.id),
        ...(testAtt.data || []).map(a => a.id)
      ].filter(Boolean);

      if (attemptIds.length > 0) {
        for (let i = 0; i < attemptIds.length; i += CHUNK_SIZE) {
          const chunk = attemptIds.slice(i, i + CHUNK_SIZE);
          const { data: answers } = await supabase
            .from('quiz_answers')
            .select('question_id')
            .in('attempt_id', chunk)
            .limit(10000);
          if (answers) {
            answers.forEach(ans => attemptedQuestionIds.add(ans.question_id));
          }
        }
        // Also check mock test JSON answers
        const testIds = (testAtt.data || []).map(t => t.id);
        if (testIds.length > 0) {
          for (let i = 0; i < testIds.length; i += CHUNK_SIZE) {
            const chunk = testIds.slice(i, i + CHUNK_SIZE);
            const { data: testData } = await supabase.from('test_attempts').select('answers').in('id', chunk);
            if (testData) {
              testData.forEach(t => {
                if (Array.isArray(t.answers)) {
                  t.answers.forEach(ans => { if (ans.question_id) attemptedQuestionIds.add(ans.question_id); });
                }
              });
            }
          }
        }
      }
    }

    // 5. Aggregate stats per subject
    const subjectStats = {};
    subjectIds.forEach(id => {
      subjectStats[id] = {
        total: 0,
        attempted: 0,
        easy: { total: 0, attempted: 0 },
        moderate: { total: 0, attempted: 0 },
        difficult: { total: 0, attempted: 0 }
      };
    });

    questions.forEach(q => {
      const subjectId = chapterToSubject.get(q.chapter_id);
      if (!subjectId || !subjectStats[subjectId]) return;

      const rawType = (q.question_type || '').toLowerCase();
      let type = 'moderate';
      if (rawType.includes('easy')) type = 'easy';
      else if (rawType.includes('difficult') || rawType.includes('hard')) type = 'difficult';
      
      const isAttempted = attemptedQuestionIds.has(q.id);
      
      subjectStats[subjectId].total++;
      subjectStats[subjectId][type].total++;
      if (isAttempted) {
        subjectStats[subjectId].attempted++;
        subjectStats[subjectId][type].attempted++;
      }
    });

    // 6. Map back to result
    const finalData = result.map(subject => ({
      ...subject,
      stats: subjectStats[subject.id]
    }));

    return NextResponse.json({
      success: true,
      data: finalData,
    });
  } catch (err) {
    console.error('Subjects API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
