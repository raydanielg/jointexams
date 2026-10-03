"use client"

import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/lib/auth"
import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { PermissionGate, RequirePermission } from "@/components/guards"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreVerticalIcon, UserAdd01Icon } from "@hugeicons/core-free-icons"

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  status: string
  roles: string[]
  is_superadmin: boolean
  email_verified: boolean
  last_login_at?: string | null
  created_at?: string
}

interface Paged<T> {
  results: T[]
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  INACTIVE: "outline",
  SUSPENDED: "destructive",
  PENDING_VERIFICATION: "secondary",
}

const ROLES = [
  "EXAM_ADMIN",
  "SCHOOL_COORDINATOR",
  "MARKS_ENTRY",
  "REPORT_VIEWER",
]

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null)

  const canManage = hasPermission(P.usersManage) || hasPermission(P.usersDisable)
  const canCreate = hasPermission(P.usersCreate)

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paged<AdminUser> | AdminUser[]>("/users/")
      const data = res.data
      setUsers(Array.isArray(data) ? data : (data?.results ?? []))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(u: AdminUser, action: "activate" | "suspend" | "deactivate") {
    try {
      await api.post(`/users/${u.id}/${action}/`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function saveRoles(u: AdminUser, roles: string[]) {
    try {
      await api.post(`/users/${u.id}/roles/`, { roles })
      setRoleTarget(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <RequirePermission permission={P.usersView}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            People who can sign in to EMAS.
          </p>
        </div>
        <PermissionGate permission={P.usersCreate}>
          <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} className="me-1 size-4" />
              Invite user
            </SheetTrigger>
            <InviteDialog onDone={() => { setInviteOpen(false); void load() }} />
          </Sheet>
        </PermissionGate>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users</CardTitle>
          <CardDescription>Accounts within your administrative scope.</CardDescription>
        </CardHeader>
        <CardContent>
          {!users ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users found in your access scope.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  {canManage ? <TableHead className="text-end">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {`${u.first_name} ${u.last_name}`.trim() || "—"}
                      {u.is_superadmin ? (
                        <Badge variant="secondary" className="ms-2 text-[10px]">SUPER</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="me-1 text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[u.status] ?? "outline"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRoleTarget(u)}>
                              Manage roles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status !== "ACTIVE" ? (
                              <DropdownMenuItem onClick={() => setStatus(u, "activate")}>
                                Activate
                              </DropdownMenuItem>
                            ) : null}
                            {u.status === "ACTIVE" ? (
                              <DropdownMenuItem onClick={() => setStatus(u, "suspend")}>
                                Suspend
                              </DropdownMenuItem>
                            ) : null}
                            {u.status !== "INACTIVE" ? (
                              <DropdownMenuItem onClick={() => setStatus(u, "deactivate")}>
                                Deactivate
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <RoleDialog user={roleTarget} onSave={saveRoles} />
      </Sheet>
    </RequirePermission>
  )
}

function InviteDialog({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/users/", {
        email: f.get("email"),
        first_name: f.get("first_name"),
        last_name: f.get("last_name"),
        phone: f.get("phone"),
        role: f.get("role") || undefined,
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the invitation."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Invite user</SheetTitle>
        <SheetDescription>
          The user receives an email invitation to set their own password.
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" name="first_name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" name="last_name" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="grid gap-2">
          <Label>Initial role (optional)</Label>
          <Select name="role" items={ROLES.map((r) => ({ value: r, label: r }))}>
            <SelectTrigger>
              <SelectValue placeholder="No role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} label={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Sending…" : "Send invitation"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}

function RoleDialog({
  user,
  onSave,
}: {
  user: AdminUser | null
  onSave: (u: AdminUser, roles: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    setSelected(user?.roles ?? [])
  }, [user])

  function toggle(r: string) {
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]))
  }

  if (!user) return null
  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Manage roles</SheetTitle>
        <SheetDescription>{user.email}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-2 px-6 py-2">
        {ROLES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(r)}
              onChange={() => toggle(r)}
              className="size-4 accent-primary"
            />
            {r}
          </label>
        ))}
      </div>
      <SheetFooter>
        <Button size="lg" onClick={() => onSave(user, selected)}>Save roles</Button>
      </SheetFooter>
    </SheetContent>
  )
}
