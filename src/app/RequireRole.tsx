import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { canAccessPath } from '@/features/nav/nav-config'

export function RequireRole() {
  const { user, authReady } = useAuth()
  const location = useLocation()

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

  if (!canAccessPath(user.role, location.pathname)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
