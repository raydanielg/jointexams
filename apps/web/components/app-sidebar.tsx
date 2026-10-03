"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AuditIcon,
  BookOpen02Icon,
  Building03Icon,
  DashboardSquare01Icon,
  LicenseDraftIcon,
  NotebookIcon,
  RankingIcon,
  SentIcon,
  Settings01Icon,
  ShieldKeyIcon,
  UserGroupIcon,
  UserListIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"

const icon = (i: any) => <HugeiconsIcon icon={i} strokeWidth={2} />

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  anyOf: string[]
}

/** Top-level EMAS modules. An item renders when the user holds at least one
 * of the listed permission codes — missing permissions are denied, not
 * assumed. SUPER_ADMIN passes automatically. */
const MODULES: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: icon(DashboardSquare01Icon), anyOf: [] },
  { title: "Organizations", url: "/organization", icon: icon(Building03Icon), anyOf: [] },
  { title: "Examinations", url: "/examinations", icon: icon(LicenseDraftIcon), anyOf: [P.examsView] },
  { title: "Candidates", url: "/candidates", icon: icon(UserGroupIcon), anyOf: [P.candidatesView] },
  { title: "Subjects", url: "/subjects", icon: icon(BookOpen02Icon), anyOf: [P.subjectsView] },
  { title: "Marks", url: "/marks", icon: icon(NotebookIcon), anyOf: [P.marksView, P.marksEnter] },
  { title: "Results", url: "/results", icon: icon(RankingIcon), anyOf: [P.resultsView] },
  { title: "Reports", url: "/reports", icon: icon(BookOpen02Icon), anyOf: [P.reportsView] },
  { title: "SMS Campaigns", url: "/sms", icon: icon(SentIcon), anyOf: [P.smsSend] },
]

const ADMIN_ITEMS: NavItem[] = [
  { title: "Users", url: "/administration/users", icon: icon(UserMultiple02Icon), anyOf: [P.usersView] },
  { title: "Roles & Permissions", url: "/administration/roles", icon: icon(ShieldKeyIcon), anyOf: [P.usersView, P.usersManage] },
  { title: "Audit Log", url: "/administration/audit", icon: icon(AuditIcon), anyOf: [P.auditView] },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { hasAnyPermission, isLoading, isSuperAdmin } =
    useAuth()

  const mainItems = MODULES.filter((i) => i.anyOf.length === 0 || hasAnyPermission(i.anyOf)).map(
    ({ anyOf: _a, ...rest }) => rest,
  )
  const adminItems = ADMIN_ITEMS.filter((i) => hasAnyPermission(i.anyOf)).map(
    ({ anyOf: _a, ...rest }) => rest,
  )

  const secondary = [
    { title: "Settings", url: "/account", icon: icon(Settings01Icon) },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={LicenseDraftIcon} strokeWidth={2} className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">EMAS</span>
                <span className="truncate text-xs">Examination Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div className="flex flex-col gap-2 px-4 pt-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : (
          <>
            <NavMain items={mainItems} />
            {adminItems.length > 0 ? (
              <NavProjects label="Administration" projects={adminItems.map((i) => ({ name: i.title, url: i.url, icon: i.icon }))} />
            ) : null}
            <NavSecondary items={secondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
