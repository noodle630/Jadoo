import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const REMOVED_SECRET= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running analytics migration...');
    
    const sql = fs.readFileSync('supabase-migrations/analytics.sql', 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Migration failed:', error);
    } else {
      console.log('Analytics migration completed successfully!');
    }
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration(); 