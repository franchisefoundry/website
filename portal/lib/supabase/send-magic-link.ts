import { createClient } from '@supabase/supabase-js'

/**
 * Sends a magic link email to an existing user.
 * Uses the non-PKCE (implicit) flow so the link contains a token_hash
 * that /auth/confirm can verify without a code verifier cookie.
 *
 * NOTE: inviteUserByEmail() fails for existing users, and
 * admin.generateLink() generates a link but does NOT send the email.
 * This function actually sends the email via Supabase's configured SMTP.
 */
export async function sendMagicLink(email: string, redirectTo: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  })
  return error ? error.message : null
}
