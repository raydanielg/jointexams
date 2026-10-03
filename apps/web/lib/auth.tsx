"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"

import { api, isAuthenticated, logout as apiLogout, tokenStore } from "./api"
import type { AuthUser } from "./api"

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  roles: string[]
  /** is_superadmin per the backend contract = unrestricted. */
  isSuperAdmin: boolean
  schools: AuthUser["schools"]
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasAllPermissions: (codes: string[]) => boolean
  refresh: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)


  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const res = await api.get<AuthUser>("/auth/me/")
      setUser(res.data!)
      localStorage.setItem("emas_user", JSON.stringify(res.data))

    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const permissions = useMemo(() => {
    const set = new Set(user?.permissions ?? [])
    return set
  }, [user])

  const isSuperAdmin = !!user?.is_superadmin

  const hasPermission = useCallback(
    (code: string) => isSuperAdmin || permissions.has(code),
    [isSuperAdmin, permissions],
  )
  const hasAnyPermission = useCallback(
    (codes: string[]) => isSuperAdmin || codes.some((c) => permissions.has(c)),
    [isSuperAdmin, permissions],
  )
  const hasAllPermissions = useCallback(
    (codes: string[]) => isSuperAdmin || codes.every((c) => permissions.has(c)),
    [isSuperAdmin, permissions],
  )

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    router.replace("/login")
  }, [router])

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      roles: user?.roles ?? [],
      isSuperAdmin,
      schools: user?.schools ?? [],
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refresh,
      logout,
    }),
    [
      user,
      isLoading,
      isSuperAdmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refresh,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
