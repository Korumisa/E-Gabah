import { readAppSettings } from '@/features/settings/app-settings'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase-client'

/** Catat login + coba kirim email (Edge Function `login-alert` bila di-deploy). */
export async function notifyLoginAlert(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const settings = readAppSettings()
  if (!settings.security.loginAlert) return

  const sb = getSupabase()
  if (!sb) return

  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null

  try {
    await sb.rpc('record_login_alert', {
      p_user_agent: userAgent,
      p_ip: null,
    })
  } catch {
    /* non-blocking */
  }

  try {
    await sb.functions.invoke('login-alert', {
      body: { userAgent },
    })
  } catch {
    /* Function belum di-deploy / RESEND belum di-set — log DB tetap ada. */
  }
}
