import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { chapter_id } = await req.json();

    if (!chapter_id) {
      return NextResponse.json(
        { success: false, message: 'chapter_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('topics')
      .select('id, name, description, content, parent_id')
      .eq('chapter_id', chapter_id)
      .order('name');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('Chapter Topics API Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
