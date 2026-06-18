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

        const { data: chapters, error } = await supabase
            .from('chapters')
            .select('id, name, description')
            .eq('subject_id', subject_id)
            .order('name');

        if (error) throw error;

        let chaptersWithStats = chapters || [];

        if (chaptersWithStats.length > 0) {
          const chapterIds = chaptersWithStats.map(c => c.id);

          // 1. Fetch all questions for these chapters using pagination to bypass Supabase 1000-row PostgREST cap
          let questions = [];
          {
            const pageSize = 1000;
            let offset = 0;
            while (true) {
              const { data: page, error: pageErr } = await supabase
                .from('questions')
                .select('id, chapter_id, question_type')
                .in('chapter_id', chapterIds)
                .range(offset, offset + pageSize - 1);
              if (pageErr) throw pageErr;
              if (!page || page.length === 0) break;
              questions = questions.concat(page);
              if (page.length < pageSize) break;
              offset += pageSize;
            }
          }

          // Group questions by chapter
          const chapterQuestions = {};
          const allQuestionIds = [];
          
          (questions || []).forEach(q => {
            if (!chapterQuestions[q.chapter_id]) {
              chapterQuestions[q.chapter_id] = [];
            }
            chapterQuestions[q.chapter_id].push(q);
            allQuestionIds.push(q.id);
          });

          // 2. Fetch user attempts if user_id is provided
          const attemptedQuestionIds = new Set();
          
          if (user_id && allQuestionIds.length > 0) {
            // Fetch quiz attempts to get attempt_ids
            const { data: quizAttempts } = await supabase
              .from('quiz_attempts')
              .select('id')
              .eq('user_id', user_id)
              .limit(10000);
              
            const { data: testAttempts } = await supabase
              .from('test_attempts')
              .select('id')
              .eq('user_id', user_id)
              .limit(10000);

            const attemptIds = [
              ...(quizAttempts || []).map(a => a.id),
              ...(testAttempts || []).map(a => a.id)
            ].filter(Boolean);

            // Fetch quiz_answers to see which specific questions were attempted
            if (attemptIds.length > 0) {
               const chunkSize = 50;
               for (let i = 0; i < attemptIds.length; i += chunkSize) {
                 const chunk = attemptIds.slice(i, i + chunkSize);
                 const { data: answers, error: ansErr } = await supabase
                   .from('quiz_answers')
                   .select('question_id')
                   .in('attempt_id', chunk)
                   .limit(50000);
                   
                 if (!ansErr && answers) {
                   answers.forEach(ans => attemptedQuestionIds.add(ans.question_id));
                 }
               }
            }

            // Also check manual test attempts answers JSON structure
            if (testAttempts && testAttempts.length > 0) {
                const testIds = testAttempts.map(t => t.id);
                const chunkSize = 50;
                for (let i = 0; i < testIds.length; i += chunkSize) {
                  const chunk = testIds.slice(i, i + chunkSize);
                  const { data: testAnswersData, error: tErr } = await supabase
                      .from('test_attempts')
                      .select('answers')
                      .in('id', chunk);
                      
                  if (!tErr && testAnswersData) {
                    testAnswersData.forEach(tAttempt => {
                        if (Array.isArray(tAttempt.answers)) {
                            tAttempt.answers.forEach(ans => {
                                if (ans.question_id) attemptedQuestionIds.add(ans.question_id);
                            });
                        }
                    });
                  }
                }
            }
          }

          // 3. Attach stats to each chapter
          chaptersWithStats = chaptersWithStats.map(chapter => {
            const cQs = chapterQuestions[chapter.id] || [];
            
            const stats = {
              total: cQs.length,
              easy: { total: 0, attempted: 0, unattempted: 0 },
              moderate: { total: 0, attempted: 0, unattempted: 0 },
              difficult: { total: 0, attempted: 0, unattempted: 0 }
            };

            cQs.forEach(q => {
              const rawType = q.question_type ? q.question_type.toLowerCase() : '';
              let type = 'moderate'; // default
              if (rawType.includes('easy')) type = 'easy';
              else if (rawType.includes('difficult') || rawType.includes('hard')) type = 'difficult';
              else if (rawType.includes('moderate') || rawType.includes('medium')) type = 'moderate';
              const isAttempted = attemptedQuestionIds.has(q.id);
              
              stats[type].total++;
              if (isAttempted) {
                stats[type].attempted++;
              } else {
                stats[type].unattempted++;
              }
            });

            return {
              ...chapter,
              stats
            };
          });
        }

        return NextResponse.json({
            success: true,
            data: chaptersWithStats,
        });
    } catch (err) {
        console.error('AMC Chapters API Error:', err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
