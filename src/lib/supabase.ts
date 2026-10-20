import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const AUTH_COOKIE_NAME = 'sb-access-token';

export const setAuthCookie = (token: string, maxAge: number = 60 * 60 * 24 * 7) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
};

export const clearAuthCookie = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
};

// Public client for browser UI & Realtime Subscriptions
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Sinkronisasi token sesi ke cookie browser untuk dibaca Next.js middleware
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      setAuthCookie(session.access_token, session.expires_in ?? 60 * 60 * 24 * 7);
    } else if (event === 'SIGNED_OUT' || !session) {
      clearAuthCookie();
    }
  });
}

// Admin client for server-side API routes (bypasses RLS)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
