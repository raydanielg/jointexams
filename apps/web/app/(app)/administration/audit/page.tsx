"use client"

import { useEffect, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { RequirePermission } from "@/components/guards"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

interface AuthEvent {
  id: number
  user_email: string | null
  email: string
  action: string
  ip_address: string | null
  created_at: string
}

interface Paged<T> {
  results: T[]
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuthEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Paged<AuthEvent>>("/auth/audit-log/")
      .then((r) => setEvents(r.data?.results ?? []))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  return (
    <RequirePermission permission={P.auditView}>
      <div>
        <h1 className="text-xl font-semibold">Authentication audit</h1>
        <p className="text-sm text-muted-foreground">
          Sign-ins, password changes and other security events.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent security events</CardTitle>
          <CardDescription>Most recent authentication activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {!events ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-end">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {e.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {e.user_email ?? e.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </RequirePermission>
  )
}
