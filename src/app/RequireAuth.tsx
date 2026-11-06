import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function RequireAuth() {
  const { isAuthenticated, authReady, mfaRequired } = useAuth()
  const location = useLocation()
  const here = `${location.pathname}${location.search}`

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <span
          className="size-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-800"
          aria-hidden
        />
        <span className="sr-only">Memuat sesi…</span>
      </div>
    )
  }

  if (mfaRequired || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: here }} />
  }

  return <Outlet />
}
