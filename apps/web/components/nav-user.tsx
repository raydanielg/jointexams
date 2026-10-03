"use client"

import Link from "next/link"

import { useAuth } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Key01Icon,
  Logout03Icon,
  SmartPhone01Icon,
  UnfoldMoreIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  EXAM_ADMIN: "Exam Admin",
  SCHOOL_COORDINATOR: "Coordinator",
  MARKS_ENTRY: "Marks Entry",
  REPORT_VIEWER: "Report Viewer",
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, roles, logout } = useAuth()

  const name = user ? `${user.first_name} ${user.last_name}`.trim() : "…"
  const email = user?.email ?? ""
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const roleLabel = roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ") || "User"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs">{roleLabel}</span>
            </div>
            <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar>
                    <AvatarFallback>{initials || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs">{email}</span>
                  </div>
                </div>
                <div className="px-1 pb-1.5">
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary" className="me-1 text-[10px]">
                      {ROLE_LABELS[r] ?? r}
                    </Badge>
                  ))}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/account" />}>
                <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
                My profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/account" />}>
                <HugeiconsIcon icon={Key01Icon} strokeWidth={2} />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/account" />}>
                <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} />
                Sessions
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
