import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[prepreg-tracker] Supabase env vars missing. Copy .env.example to .env and fill in ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The app will render with empty data until then.'
  )
}

// Use placeholder values when env vars are absent so createClient doesn't throw.
// All queries against the placeholder URL will fail gracefully (base44Client catches them).
export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key-for-local-dev-only'
)
