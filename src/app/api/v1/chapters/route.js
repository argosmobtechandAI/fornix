import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject_id, user_id } = body;

    if (!subject_id) {
      return NextResponse.json(
        { success: false, message: 'subject_id is required' },
        { status: 400 }
      );
    }

    // 1. Fetch chapters
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('id, name, description')
      .eq('subject_id', subject_id)
      .order('name');

    if (error) throw error;

    let chaptersWithStats = chapters || [];
    if (chaptersWithStats.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const chapterIds = chaptersWithStats.map(c => c.id);
    const CHUNK_SIZE = 50;

    // 2. Fetch all questions for these chapters in chunks to avoid 414
    let questions = [];
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

    // Group questions by chapter and difficulty
    const chapterQuestions = {};
    const allQuestionIds = [];
    (questions || []).forEach(q => {
      if (!chapterQuestions[q.chapter_id]) chapterQuestions[q.chapter_id] = [];
      chapterQuestions[q.chapter_id].push(q);
      allQuestionIds.push(q.id);
    });

    // 3. Fetch user's attempted question IDs
    const attemptedQuestionIds = new Set();
    if (user_id && allQuestionIds.length > 0) {
      // Get all unique attempt IDs for this user (both practice and mock)
      const [quizAtt, testAtt] = await Promise.all([
        supabase.from('quiz_attempts').select('id').eq('user_id', user_id).limit(10000),
        supabase.from('test_attempts').select('id').eq('user_id', user_id).limit(10000)
      ]);

      const attemptIds = [
        ...(quizAtt.data || []).map(a => a.id),
        ...(testAtt.data || []).map(a => a.id)
      ].filter(Boolean);

      if (attemptIds.length > 0) {
        // Fetch answered questions in chunks
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

        // Also check mock test JSON answers if any
        const testIds = (testAtt.data || []).map(t => t.id);
        if (testIds.length > 0) {
          for (let i = 0; i < testIds.length; i += CHUNK_SIZE) {
            const chunk = testIds.slice(i, i + CHUNK_SIZE);
            const { data: testData } = await supabase
              .from('test_attempts')
              .select('answers')
              .in('id', chunk);
            
            if (testData) {
              testData.forEach(t => {
                if (Array.isArray(t.answers)) {
                  t.answers.forEach(ans => {
                    if (ans.question_id) attemptedQuestionIds.add(ans.question_id);
                  });
                }
              });
            }
          }
        }
      }
    }

    // 4. Map stats back to chapters
    const result = chaptersWithStats.map(chapter => {
      const cQs = chapterQuestions[chapter.id] || [];
      const stats = {
        total: cQs.length,
        attempted: 0,
        easy: { total: 0, attempted: 0 },
        moderate: { total: 0, attempted: 0 },
        difficult: { total: 0, attempted: 0 }
      };

      cQs.forEach(q => {
        const rawType = (q.question_type || '').toLowerCase();
        let type = 'moderate';
        if (rawType.includes('easy')) type = 'easy';
        else if (rawType.includes('difficult') || rawType.includes('hard')) type = 'difficult';
        
        const isAttempted = attemptedQuestionIds.has(q.id);
        
        stats[type].total++;
        if (isAttempted) {
          stats.attempted++;
          stats[type].attempted++;
        }
      });

      // Calculate unattempted for each category and total
      stats.unattempted = stats.total - stats.attempted;
      ['easy', 'moderate', 'difficult'].forEach(type => {
        stats[type].unattempted = stats[type].total - stats[type].attempted;
      });

      return { ...chapter, stats };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('Chapters API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
