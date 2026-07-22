import { createClient } from '@supabase/supabase-js';

// Publishable key — safe to ship in client code by design; row-level security does the guarding.
const SUPABASE_URL = 'https://vsfifmzjukiwxmrnakba.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iX8RRcPabPHVznKAVs4qvg_oPN9S-eR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
