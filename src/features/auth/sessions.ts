import { getSupabase } from '@/lib/supabase-client'

export type AuthSessionRow = {
  id: string
  created_at: string | null
  updated_at: string | null
  user_agent: string | null
  ip: string | null
  aal: string | null
  is_current: boolean
}

function labelUserAgent(ua: string | null): string {
  if (!ua) return 'Perangkat tidak dikenal'
  const chrome = /Chrome\/[\d.]+/.test(ua) && !/Edg\//.test(ua)
  const edge = /Edg\//.test(ua)
  const safari = /Safari\//.test(ua) && !/Chrome\//.test(ua)
  const firefox = /Firefox\//.test(ua)
  const browser = edge
    ? 'Edge'
    : chrome
      ? 'Chrome'
      : safari
        ? 'Safari'
        : firefox
          ? 'Firefox'
          : 'Browser'
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad/i.test(ua)
        ? 'iOS'
        : /Mac OS/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'OS'
  return `${browser} · ${os}`
}

export function formatSessionDevice(row: AuthSessionRow): string {
  return labelUserAgent(row.user_agent)
}

export function formatSessionWhen(row: AuthSessionRow): string {
  const raw = row.updated_at || row.created_at
  if (!raw) return '—'
  try {
    return new Date(raw).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return raw
  }
}

export async function listMyAuthSessions(): Promise<AuthSessionRow[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb.rpc('list_my_auth_sessions')
  if (error) throw new Error(error.message)
  return (data ?? []) as AuthSessionRow[]
}

export async function revokeMyAuthSession(sessionId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const { error } = await sb.rpc('revoke_my_auth_session', {
    p_session_id: sessionId,
  })
  if (error) throw new Error(error.message)
}

export async function revokeOtherAuthSessions(): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const { error } = await sb.auth.signOut({ scope: 'others' })
  if (error) throw new Error(error.message)
}

export async function adminRevokeUserSessions(userId: string): Promise<number> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const { data, error } = await sb.rpc('admin_revoke_user_sessions', {
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  return typeof data === 'number' ? data : 0
}
