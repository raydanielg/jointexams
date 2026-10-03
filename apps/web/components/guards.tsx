"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockIcon } from "@hugeicons/core-free-icons"

import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Renders children only when the user holds the permission (or any of them). */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: {
  permission?: string
  anyOf?: string[]
  allOf?: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth()
  if (isLoading) return null
  const allowed =
    (permission ? hasPermission(permission) : true) &&
    (anyOf ? hasAnyPermission(anyOf) : true) &&
    (allOf ? hasAllPermissions(allOf) : true)
  return allowed ? <>{children}</> : <>{fallback}</>
}

/** Access-denied screen used both for the /403 route and inline guards. */
export function AccessDenied() {
  const router = useRouter()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
        <HugeiconsIcon icon={LockIcon} strokeWidth={2} className="size-5 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You don&apos;t have permission to access this page. If you believe this
          is a mistake, contact your administrator.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>Go to dashboard</Button>
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

/**
 * Page-level route guard. While auth state loads it renders a loading shell;
 * unauthenticated users are redirected to /login; missing permission renders
 * the access-denied view instead of the page.
 */
export function RequirePermission({
  permission,
  anyOf,
  allOf,
  children,
}: {
  permission?: string
  anyOf?: string[]
  allOf?: string[]
  children: React.ReactNode
}) {
  const { isLoading, isAuthenticated, hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return <PageLoading />
  if (!isAuthenticated) return <PageLoading />

  const allowed =
    (permission ? hasPermission(permission) : true) &&
    (anyOf ? hasAnyPermission(anyOf) : true) &&
    (allOf ? hasAllPermissions(allOf) : true)

  if (!allowed) return <AccessDenied />
  return <>{children}</>
}
