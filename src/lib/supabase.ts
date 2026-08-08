import { createClient } from '@supabase/supabase-js';

// Config comes from build-time env (Vite inlines VITE_* vars). Publishable keys are
// safe to ship in client code by design — row-level security does the guarding.
// See .env.example and the deploy section of README.md.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Cloud sync is OPTIONAL. It lights up only when both env vars are present at build
 * time; otherwise the app runs fully local-first and every sync entry point hides
 * itself (see AuthPanel / Settings / Onboarding). This is what lets the game ship
 * and work with zero backend, and turn accounts on the moment the env is set.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// A client is always exported so imports never break. When unconfigured it points at
// a harmless placeholder that nothing ever calls (initSync bails, the UI hides) —
// createClient does no network I/O at construction, so this is inert.
export const supabase = createClient(
  SUPABASE_URL ?? 'https://unconfigured.supabase.co',
  SUPABASE_PUBLISHABLE_KEY ?? 'unconfigured',
);
