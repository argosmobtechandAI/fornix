import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { user_id, chapter_id } = await req.json();

        if (!user_id || !chapter_id) {
            return NextResponse.json(
                { success: false, message: 'user_id and chapter_id are required' },
                { status: 400 }
            ); 
        }

        // 1) Get all quiz_attempt IDs for this user + chapter
        const { data: attempts, error: attErr } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('user_id', user_id)
            .eq('chapter_id', chapter_id);

        if (attErr) throw attErr;

        const attemptIds = (attempts || []).map(a => a.id);

        // 2) Delete quiz_answers linked to those attempts
        if (attemptIds.length > 0) {
            const { error: ansErr } = await supabase
                .from('quiz_answers')
                .delete()
                .in('attempt_id', attemptIds);
            if (ansErr) throw ansErr;
        }

        // 3) Delete the quiz_attempts themselves
        const { error: delErr } = await supabase
            .from('quiz_attempts')
            .delete()
            .eq('user_id', user_id)
            .eq('chapter_id', chapter_id);

        if (delErr) throw delErr;

        return NextResponse.json({ success: true, message: 'Chapter progress reset successfully' });
    } catch (err) {
        console.error('Chapter Reset Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
