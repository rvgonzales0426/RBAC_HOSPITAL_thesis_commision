import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials. Copy .env.example to .env and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

/**
 * The one Supabase client for the app.
 *
 * House rule: this module is imported by Pinia stores and nothing else.
 * Components and composables call store actions. Grep for "from '@/lib/supabase'"
 * — every hit should be in src/stores/.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'thesis-template-auth',
  },
})

/** Turns a Supabase/Postgres error into something worth showing a user. */
export function toMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!error) return fallback
  const message = (error as { message?: string }).message
  if (!message) return fallback

  const map: Record<string, string> = {
    'Invalid login credentials': 'That email and password combination is not correct.',
    'Email not confirmed': 'Confirm your email address first — check your inbox for the link.',
    'User already registered': 'An account with that email already exists. Sign in instead.',
    'New password should be different from the old password.':
      'Choose a password you have not used on this account before.',
  }
  if (map[message]) return map[message]

  // Unique indexes the OPD schema relies on, named so the message can be kind.
  const constraints: Record<string, string> = {
    visits_one_open_per_patient: 'This patient is already in the queue.',
    patients_philhealth_idx: 'A patient with that PhilHealth number is already registered.',
    lab_order_items_order_id_test_type_id_key: 'That test is already on this order.',
  }
  for (const [name, text] of Object.entries(constraints)) {
    if (message.includes(name)) return text
  }

  // Postgres RLS rejections are accurate but unreadable.
  // .single() on an update RLS filtered down to zero rows.
  if (message.includes('Cannot coerce the result to a single JSON object')) {
    return 'That record could not be changed. It may be locked, or no longer yours to edit.'
  }

  // Column-grant rejections read "permission denied for table x".
  if (message.includes('row-level security') || message.startsWith('permission denied for')) {
    return 'You do not have permission to do that.'
  }
  return message
}
