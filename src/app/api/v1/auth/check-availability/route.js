import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: 'Either email or phone must be provided' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let emailExists = false;
    let phoneExists = false;

    if (email) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .limit(1);
        
      if (error) throw error;
      if (data && data.length > 0) emailExists = true;
    }

    if (phone) {
      // If phone has country code from react-phone-input-2, e.g., 917017580125
      const cleanPhone = phone.replace(/\D/g, '');
      
      // We check exact match, or variations if needed.
      // We'll check standard variations just to be safe.
      let phoneVariations = [phone];
      if (!phone.startsWith('+')) {
        phoneVariations.push('+' + phone); // +9170...
      }
      if (phone.startsWith('91')) {
        phoneVariations.push(phone.substring(2)); // 70...
      }
      
      const phoneOrStr = phoneVariations.map(v => `phone.eq.${v}`).join(',');

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .or(phoneOrStr)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) phoneExists = true;
    }

    return NextResponse.json({
      success: true,
      available: !emailExists && !phoneExists,
      emailExists,
      phoneExists
    });

  } catch (error) {
    console.error('Check Availability Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
