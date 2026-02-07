import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqrwmrumqlghwzlgqyja.supabase.co';
const supabaseAnonKey = 'sb_publishable_yNTHRmXw3-QB5yYrWUJlLw_AZ2jd2hM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
