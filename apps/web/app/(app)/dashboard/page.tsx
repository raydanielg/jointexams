"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  LicenseDraftIcon,
  NotebookIcon,
  SchoolIcon,
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
  exams_by_month: { month: string; count: number }[]
  exams_by_status: { status: string; count: number }[]
  candidates_by_school: { school: string; count: number }[]
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  READY: "#f59e0b",
  ACTIVE: "#2563eb",
  MARKS_ENTRY: "#8b5cf6",
  UNDER_REVIEW: "#06b6d4",
  FINALIZED: "#16a34a",
  PUBLISHED: "#065f46",
  ARCHIVED: "#475569",
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
      label: "Schools",
      value: data ? data.total_schools : null,
      hint: "Participating organizations",
      icon: SchoolIcon,
    },
    {
      label: "Marks entered",
      value: data ? data.marks.entered : null,
      hint: data ? `${data.marks.pending} pending` : "",
      icon: NotebookIcon,
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

  const statusTotal = useMemo(
    () => data?.exams_by_status.reduce((t, s) => t + s.count, 0) ?? 0,
    [data]
  )
  const maxSchool = useMemo(
    () => Math.max(1, ...(data?.candidates_by_school.map((s) => s.count) ?? [1])),
    [data]
  )

  return (
    <RequirePermission>
      <div>
        <h1 className="text-xl font-semibold">
          {user ? `Karibu, ${user.first_name}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Examination overview across your organizations.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <HugeiconsIcon icon={s.icon} strokeWidth={1.5} className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {s.value === null ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-3xl font-bold tabular-nums">{s.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Line chart — exams created per month */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Examinations over time</CardTitle>
            <CardDescription>New examinations per month.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-48 w-full" />
            ) : data.exams_by_month.length < 2 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                Not enough data yet — chart appears once examinations span multiple months.
              </p>
            ) : (
              <LineChart points={data.exams_by_month} />
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Exam status</CardTitle>
            <CardDescription>{statusTotal} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              data.exams_by_status.map((s) => (
                <div key={s.status}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">
                      {s.status.replaceAll("_", " ").toLowerCase()}
                    </span>
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(s.count / Math.max(1, statusTotal)) * 100}%`,
                        background: STATUS_COLORS[s.status] ?? "#64748b",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Candidates per school */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates per school</CardTitle>
            <CardDescription>Top 10 by enrollment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : !data.candidates_by_school.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No enrollments yet.
              </p>
            ) : (
              data.candidates_by_school.map((s) => (
                <div key={s.school}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate font-medium">{s.school}</span>
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(s.count / maxSchool) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent exams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent examinations</CardTitle>
            <CardDescription>Latest across your organizations.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-end">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_examinations.slice(0, 8).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={`/examinations/${e.id}`}>
                          {e.name}
                        </Link>
                        <span className="ms-2 text-xs text-muted-foreground">{e.code}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>
                          {e.status.replaceAll("_", " ").toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  )
}

function LineChart({ points }: { points: { month: string; count: number }[] }) {
  const w = 560
  const h = 190
  const pad = 28
  const max = Math.max(...points.map((p) => p.count), 1)
  const step = (w - pad * 2) / Math.max(1, points.length - 1)
  const xy = points.map((p, i) => ({
    x: pad + i * step,
    y: h - pad - (p.count / max) * (h - pad * 2),
    ...p,
  }))
  const path = xy.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ")
  const last = xy[xy.length - 1]!
  const area = `${path} L${last.x},${h - pad} L${pad},${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={pad} x2={w - pad}
          y1={h - pad - f * (h - pad * 2)}
          y2={h - pad - f * (h - pad * 2)}
          stroke="#e2e8f0" strokeDasharray="4"
        />
      ))}
      <path d={area} fill="url(#fill)" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" />
      {xy.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#2563eb" />
          <text x={p.x} y={h - pad + 14} textAnchor="middle" fontSize="10" fill="#64748b">
            {p.month.slice(5)}
          </text>
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#1e293b">
            {p.count}
          </text>
        </g>
      ))}
    </svg>
  )
}
