import { supabase } from './src/lib/supabase.ts';

async function checkData() {
  const { data: subjects } = await supabase.from('subjects').select('*');
  const { data: groups } = await supabase.from('groups').select('*');
  const { data: criteria } = await supabase.from('subject_criteria').select('*');
  
  console.log('Subjects:', subjects);
  console.log('Groups:', groups);
  console.log('Criteria:', criteria);
}

checkData();
