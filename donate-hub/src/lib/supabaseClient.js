import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) console.warn('DonateHub: VITE_SUPABASE_URL and a VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY are required to connect to Supabase.')
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-anon-key')
export const hasSupabaseConfig = Boolean(url && key)
