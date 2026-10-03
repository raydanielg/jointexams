"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/lib/auth"
import { api, errorMessage } from "@/lib/api"
import { RequirePermission } from "@/components/guards"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

interface Session {
  id: string
  device: string
  ip_address: string | null
  user_agent: string
  is_active: boolean
  is_current: boolean
  last_activity_at: string
  expires_at: string
  created_at: string
}

export default function AccountPage() {
  const { user, roles, refresh, logout } = useAuth()
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [phone, setPhone] = useState("")
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    if (user) {
      setFirst(user.first_name)
      setLast(user.last_name)
      setPhone(user.phone ?? "")
    }
  }, [user])

  useEffect(() => {
    api
      .get<Session[]>("/auth/sessions/")
      .then((r) => setSessions(r.data ?? []))
      .catch(() => setSessions([]))
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    try {
      await api.patch("/auth/profile/", { first_name: first, last_name: last, phone })
      await refresh()
      setProfileMsg("Profile updated.")
    } catch (err) {
      setProfileMsg(errorMessage(err, "Unable to save your changes."))
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwMsg(null)
    const form = new FormData(e.currentTarget)
    try {
      await api.post("/auth/change-password/", {
        current_password: form.get("current_password"),
        new_password: form.get("new_password"),
        confirm_password: form.get("confirm_password"),
      })
      setPwMsg("Password changed. Other sessions were signed out.")
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setPwMsg(errorMessage(err, "Unable to change password."))
    }
  }

  async function revokeSession(id: string) {
    await api.post(`/auth/sessions/${id}/revoke/`)
    setSessions((s) => s?.map((x) => (x.id === id ? { ...x, is_active: false } : x)) ?? s)
  }

  async function logoutAll() {
    await api.post("/auth/logout-all/")
    logout()
  }

  const roleLabel = roles.join(", ")

  return (
    <RequirePermission>
      <div>
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Profile, password and signed-in devices.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>
                {user?.email}
                {roleLabel ? ` — ${roleLabel}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="flex max-w-md flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last">Last name</Label>
                  <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                {profileMsg ? <p className="text-sm text-muted-foreground">{profileMsg}</p> : null}
                <Button type="submit" className="self-start">Save changes</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
              <CardDescription>
                Changing your password signs out all other devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="flex max-w-md flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input id="current_password" name="current_password" type="password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input id="new_password" name="new_password" type="password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input id="confirm_password" name="confirm_password" type="password" required />
                </div>
                {pwMsg ? <p className="text-sm text-muted-foreground">{pwMsg}</p> : null}
                <Button type="submit" className="self-start">Change password</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Active sessions</CardTitle>
                <CardDescription>Devices signed in to your account.</CardDescription>
              </div>
              <Button variant="outline" onClick={logoutAll}>
                Log out all devices
              </Button>
            </CardHeader>
            <CardContent>
              {!sessions ? (
                <Skeleton className="h-24 w-full" />
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-end">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.device}</TableCell>
                        <TableCell className="text-muted-foreground">{s.ip_address ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(s.last_activity_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {s.is_current ? (
                            <Badge>Current</Badge>
                          ) : s.is_active ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          {s.is_active && !s.is_current ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeSession(s.id)}
                            >
                              Revoke
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </RequirePermission>
  )
}
