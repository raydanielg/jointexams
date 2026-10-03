"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  LicenseDraftIcon,
  NotebookIcon,
  UserGroupIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"

import { useAuth } from "@/lib/auth"
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

interface Dashboard {
  examinations: {
    total: number
    draft: number
    active: number
    finalized: number
    published: number
  }
  total_candidates: number
  total_schools: number
  marks: { entered: number; pending: number }
  recent_examinations: {
    id: string
    name: string
    code: string
    status: string
    created_at: string
  }[]
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  READY: "secondary",
  ACTIVE: "default",
  MARKS_ENTRY: "default",
  UNDER_REVIEW: "secondary",
  FINALIZED: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const [data, setData] = useState<Dashboard | null>(null)
  const [userCount, setUserCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManageUsers = hasPermission(P.usersView)

  useEffect(() => {
    api
      .get<Dashboard>("/analytics/dashboard/")
      .then((r) => setData(r.data!))
      .catch((e) => setError(errorMessage(e, "Failed to load dashboard.")))
    if (canManageUsers) {
      api
        .get<{ count?: number; results?: unknown[] } | unknown[]>("/users/")
        .then((r) => {
          const d = r.data as { count?: number; results?: unknown[] } | unknown[]
          setUserCount(Array.isArray(d) ? d.length : (d.count ?? d.results?.length ?? 0))
        })
        .catch(() => undefined)
    }
  }, [canManageUsers])

  const stats = [
    {
      label: "Examinations",
      value: data ? data.examinations.total : null,
      hint: data ? `${data.examinations.published} published` : "",
      icon: LicenseDraftIcon,
    },
    {
      label: "Candidates",
      value: data ? data.total_candidates : null,
      hint: data ? `${data.total_schools} schools` : "",
      icon: UserGroupIcon,
    },
    {
      label: "Marks entered",
      value: data ? data.marks.entered : null,
      hint: data ? `${data.marks.pending} pending` : "",
      icon: NotebookIcon,
    },
    {
      label: "Active exams",
      value: data ? data.examinations.active : null,
      hint: data ? `${data.examinations.draft} drafts` : "",
      icon: DashboardSquare01Icon,
    },
  ]
  if (canManageUsers) {
    stats.push({
      label: "Users",
      value: userCount,
      hint: "Accounts in your scope",
      icon: UserMultiple02Icon,
    })
  }

  return (
    <RequirePermission>
      <div>
        <h1 className="text-xl font-semibold">
          {user ? `Karibu, ${user.first_name}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Examination overview for your organization.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium">
                {s.label}
              </CardDescription>
              <HugeiconsIcon
                icon={s.icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              {s.value === null ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{s.value}</div>
              )}
              {s.hint ? (
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent examinations</CardTitle>
          <CardDescription>Latest examinations in your scope.</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data.recent_examinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No examinations yet in your current access scope.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_examinations.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      <Link href={`/examinations/${exam.id}`} className="hover:underline">
                        {exam.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{exam.code}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[exam.status] ?? "outline"}>
                        {exam.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {new Date(exam.created_at).toLocaleDateString()}
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
