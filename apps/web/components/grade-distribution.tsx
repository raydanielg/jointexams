"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import { paged, type ExamRow } from "@/lib/helpers"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#ca8a04",
  D: "#ea580c",
  E: "#c026d3",
  F: "#dc2626",
  ABSENT: "#64748b",
}

interface SchoolRow {
  school_id: string
  school: string
  total: number
  ABSENT: number
  [grade: string]: string | number
}

interface DistData {
  exam: { id: string; name: string; code: string }
  letters: string[]
  overall: Record<string, number>
  by_school: SchoolRow[]
}

export function GradeDistribution({ exams }: { exams: ExamRow[] }) {
  const [examId, setExamId] = useState("")
  const [data, setData] = useState<DistData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    if (!id) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/reports/distribution/?examination=${id}`)
      setData(res.data as DistData)
    } catch (err) {
      setError(errorMessage(err))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(examId)
  }, [examId, load])

  const maxTotal = useMemo(
    () => Math.max(1, ...(data?.by_school.map((s) => s.total) ?? [1])),
    [data]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Grade distribution</CardTitle>
          <CardDescription>
            A → F per school — plus candidates who did not sit (ABSENT).
          </CardDescription>
        </div>
        <Select
          value={examId}
          onValueChange={(v) => setExamId(v ?? "")}
          items={exams.map((e) => ({ value: e.id, label: e.name }))}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select examination" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id} label={e.name}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Pick an examination to see its grade distribution.
          </p>
        ) : (
          <>
            {/* Overall grade badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Overall
              </span>
              {data.letters.map((g) => (
                <Badge key={g} variant="outline" className="gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: GRADE_COLORS[g] ?? "#94a3b8" }}
                  />
                  {g}: <b>{data.overall[g] ?? 0}</b>
                </Badge>
              ))}
            </div>

            {/* Stacked comparison bars */}
            <div className="space-y-3">
              {data.by_school.map((s) => (
                <div key={s.school_id}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium">{s.school}</span>
                    <span className="text-muted-foreground">
                      {s.total} candidates · {s.ABSENT} absent
                    </span>
                  </div>
                  <div
                    className="flex h-5 overflow-hidden rounded-full bg-slate-100"
                    style={{ width: `${Math.max(8, (s.total / maxTotal) * 100)}%` }}
                  >
                    {data.letters.map((g) => {
                      const n = (s[g] as number) || 0
                      if (!n) return null
                      return (
                        <div
                          key={g}
                          title={`${g}: ${n}`}
                          className="h-full"
                          style={{
                            width: `${(n / s.total) * 100}%`,
                            background: GRADE_COLORS[g] ?? "#94a3b8",
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
              {!data.by_school.length ? (
                <p className="text-sm text-muted-foreground">
                  No results calculated for this examination yet.
                </p>
              ) : null}
            </div>

            {/* Count table */}
            {data.by_school.length ? (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-800 text-white">
                      <th className="px-3 py-2 text-left text-xs font-semibold">School</th>
                      {data.letters.map((g) => (
                        <th key={g} className="px-3 py-2 text-center text-xs font-semibold">
                          {g}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_school.map((s) => (
                      <tr key={s.school_id} className="border-b last:border-0 odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-1.5 font-medium">{s.school}</td>
                        {data.letters.map((g) => (
                          <td key={g} className="px-3 py-1.5 text-center tabular-nums">
                            {(s[g] as number) || 0}
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-center font-semibold tabular-nums">
                          {s.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-semibold">
                      <td className="px-3 py-1.5">All schools</td>
                      {data.letters.map((g) => (
                        <td key={g} className="px-3 py-1.5 text-center tabular-nums">
                          {data.overall[g] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center tabular-nums">
                        {data.by_school.reduce((t, s) => t + s.total, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
