import { supabase } from './src/lib/supabaseAdmin.js';
async function run() {
  const { data, error } = await supabase.from('chapters').select('*').limit(1);
  console.log(data);
  console.log(error);
}
run();
