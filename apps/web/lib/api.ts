const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1"

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: Record<string, unknown> }
  message?: string
}

export interface ApiErrorShape {
  status: number
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>

  constructor(shape: ApiErrorShape) {
    super(shape.message)
    this.status = shape.status
    this.code = shape.code
    this.details = shape.details
  }
}

export interface LoginResult {
  access: string
  refresh: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
  phone?: string
  status?: string
  is_active?: boolean
  is_superadmin: boolean
  email_verified?: boolean
  last_login_at?: string | null
  roles: string[]
  permissions: string[]
  schools: { school_id: string; school_name: string; role: string }[]
  created_at?: string
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const KEY_ACCESS = "emas_access"
const KEY_REFRESH = "emas_refresh"
const KEY_USER = "emas_user"

export const tokenStore = {
  get access() {
    return typeof window !== "undefined" ? localStorage.getItem(KEY_ACCESS) : null
  },
  get refresh() {
    return typeof window !== "undefined" ? localStorage.getItem(KEY_REFRESH) : null
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(KEY_ACCESS, access)
    localStorage.setItem(KEY_REFRESH, refresh)
  },
  clear() {
    localStorage.removeItem(KEY_ACCESS)
    localStorage.removeItem(KEY_REFRESH)
    localStorage.removeItem(KEY_USER)
  },
}

// ---------------------------------------------------------------------------
// Centralized fetch — handles the {success,data,error} envelope, JWT attach,
// one refresh+retry on 401, and typed errors on 4xx/5xx.
// ---------------------------------------------------------------------------

let refreshing: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh
  if (!refresh) return false
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const body = await res.json()
    // TokenRefreshView returns a bare {access, refresh} payload.
    const access = body.access ?? body.data?.access
    const newRefresh = body.refresh ?? body.data?.refresh
    if (!access) return false
    tokenStore.setTokens(access, newRefresh ?? refresh)
    return true
  } catch {
    return false
  }
}

function onAuthExpired() {
  tokenStore.clear()
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login"
  }
}

/** Endpoints that never carry auth/scope headers — sending a stale bearer
 * token here makes DRF reject the request before the handler runs. */
const PUBLIC_PATHS = [
  "/auth/login/",
  "/auth/register/",
  "/auth/token/refresh/",
  "/auth/forgot-password/",
  "/auth/reset-password/",
  "/auth/verify-email/",
  "/auth/resend-verification/",
  "/auth/accept-invitation/",
]

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<ApiResponse<T>> {
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (!isPublic && tokenStore.access) {
    headers["Authorization"] = `Bearer ${tokenStore.access}`
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "The server is currently unavailable.",
    })
  }

  if (res.status === 401 && !retried && !isPublic) {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null
    })
    if (await refreshing) return apiFetch<T>(path, options, true)
    onAuthExpired()
    throw new ApiError({
      status: 401,
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please sign in again.",
    })
  }

  let body: ApiResponse<T>
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    body = { success: false }
  }

  if (!res.ok || !body.success) {
    throw new ApiError({
      status: res.status,
      code: body.error?.code ?? "SERVER_ERROR",
      message:
        body.error?.message ??
        (res.status === 500
          ? "Something went wrong. Please try again."
          : "Request failed."),
      details: body.error?.details,
    })
  }
  return body
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  /** Multipart upload — do NOT set Content-Type (browser adds the boundary). */
  upload: async <T>(path: string, form: FormData): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {}
    if (tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: form,
    }).catch(() => {
      throw new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Unable to reach the server." })
    })
    const body = (await res.json().catch(() => null)) as ApiResponse<T> | null
    if (!res.ok || body?.success === false) {
      const err = body?.error ?? { code: "SERVER_ERROR", message: "The server is unavailable." }
      throw new ApiError({ ...err, status: res.status } as ApiErrorShape)
    }
    return body as ApiResponse<T>
  },
}

// ---------------------------------------------------------------------------
// Auth entry points
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await apiFetch<LoginResult>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  tokenStore.setTokens(res.data!.access, res.data!.refresh)
  localStorage.setItem(KEY_USER, JSON.stringify(res.data!.user))
  return res.data!
}

export async function register(
  fullName: string,
  email: string,
  phone: string,
  password: string,
): Promise<LoginResult> {
  const res = await apiFetch<LoginResult>("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName, email, phone, password }),
  })
  tokenStore.setTokens(res.data!.access, res.data!.refresh)
  localStorage.setItem(KEY_USER, JSON.stringify(res.data!.user))
  return res.data!
}

export function logout() {
  const refresh = tokenStore.refresh
  if (refresh) {
    void apiFetch("/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }) }).catch(
      () => undefined,
    )
  }
  tokenStore.clear()
}

export function isAuthenticated(): boolean {
  return !!tokenStore.access
}

/** Translate an ApiError into a short human-readable message. */
export function errorMessage(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "You don't have permission to perform this action."
    if (e.status === 401) return "Your session has expired. Please sign in again."
    return e.message || fallback
  }
  return fallback
}
