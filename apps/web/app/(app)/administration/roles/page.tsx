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

interface RoleInfo {
  role: string
  label: string
  permissions: string[]
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<RoleInfo[]>("/roles/")
      .then((r) => setRoles(r.data ?? []))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  return (
    <RequirePermission anyOf={[P.usersView, P.usersManage]}>
      <div>
        <h1 className="text-xl font-semibold">Roles &amp; permissions</h1>
        <p className="text-sm text-muted-foreground">
          What each role can do inside EMAS.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!roles ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.role}>
              <CardHeader>
                <CardTitle className="text-base">{r.label}</CardTitle>
                <CardDescription>{r.role}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {r.permissions.map((p) => (
                  <Badge key={p} variant="outline" className="font-mono text-[10px]">
                    {p}
                  </Badge>
                ))}
                {r.permissions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No direct permissions.</span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </RequirePermission>
  )
}
