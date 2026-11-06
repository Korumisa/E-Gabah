import { getSupabase } from '@/lib/supabase-client'

export type MfaTotpFactor = {
  id: string
  friendlyName: string
  status: string
}

export async function getMfaNeedsChallenge(): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

export async function listVerifiedTotpFactors(): Promise<MfaTotpFactor[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb.auth.mfa.listFactors()
  if (error || !data) return []
  return data.totp
    .filter((f) => f.status === 'verified')
    .map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name || 'Authenticator',
      status: f.status,
    }))
}

export async function challengeAndVerifyTotp(code: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const trimmed = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Kode harus 6 digit')
  }

  const { data: factors, error: listError } = await sb.auth.mfa.listFactors()
  if (listError) throw new Error(listError.message)
  const totpFactor =
    factors?.totp.find((f) => f.status === 'verified') ?? factors?.totp[0]
  if (!totpFactor) throw new Error('Tidak ada faktor MFA aktif')

  const { data: challenge, error: challengeError } = await sb.auth.mfa.challenge({
    factorId: totpFactor.id,
  })
  if (challengeError || !challenge) {
    throw new Error(challengeError?.message || 'Gagal membuat tantangan MFA')
  }

  const { error: verifyError } = await sb.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code: trimmed,
  })
  if (verifyError) {
    throw new Error(verifyError.message || 'Kode MFA tidak valid')
  }
}

export async function enrollTotpFactor(friendlyName = 'E-Gabah'): Promise<{
  factorId: string
  qrCode: string
  secret: string
}> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')

  // Bersihkan enroll yang belum diverifikasi agar QR tidak menumpuk.
  const { data: existing } = await sb.auth.mfa.listFactors()
  for (const factor of existing?.all ?? []) {
    if (factor.status === 'unverified') {
      await sb.auth.mfa.unenroll({ factorId: factor.id })
    }
  }

  const { data, error } = await sb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  })
  if (error || !data) {
    throw new Error(error?.message || 'Gagal memulai enroll MFA')
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const trimmed = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Kode harus 6 digit')
  }

  const { data: challenge, error: challengeError } = await sb.auth.mfa.challenge({
    factorId,
  })
  if (challengeError || !challenge) {
    throw new Error(challengeError?.message || 'Gagal membuat tantangan MFA')
  }

  const { error: verifyError } = await sb.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  })
  if (verifyError) {
    throw new Error(verifyError.message || 'Kode MFA tidak valid')
  }
}

export async function unenrollTotpFactor(factorId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi')
  const { error } = await sb.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message || 'Gagal menonaktifkan MFA')
  await sb.auth.refreshSession()
}

export async function cancelPendingTotpEnrollment(factorId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb || !factorId) return
  await sb.auth.mfa.unenroll({ factorId }).catch(() => undefined)
}
