import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import type { UserRole } from '@/types/auth'

type RequireAnyRoleProps = {
  roles: UserRole[]
  fallback?: string
}

/** Izinkan outlet hanya jika role user termasuk daftar. */
export function RequireAnyRole({
  roles,
  fallback = '/portal',
}: RequireAnyRoleProps) {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span
          className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-800"
          aria-hidden
        />
        <span className="sr-only">Memuat otorisasi…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={fallback} replace />
  }
  return <Outlet />
}
