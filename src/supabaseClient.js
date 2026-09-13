import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nbvjkqcsvheugnbupgcq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_5SyNnRdhAFFXgC7KiqJu8A_HaOiubwq'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
