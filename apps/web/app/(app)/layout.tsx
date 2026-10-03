"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { OrganizationOnboarding } from "@/components/organization-onboarding"
import { AuthProvider, useAuth } from "@/lib/auth"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated, schools, isSuperAdmin } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  const needsOrg = !isSuperAdmin && schools.length === 0

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ms-1" />
            <Separator
              orientation="vertical"
              className="me-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <span className="text-sm font-medium text-muted-foreground">EMAS</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-6">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : needsOrg ? (
            <OrganizationOnboarding />
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  )
}
