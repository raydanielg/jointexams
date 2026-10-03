"use client"

import { useCallback, useEffect, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { PermissionGate } from "@/components/guards"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

export interface ResultRow {
  id: string
  candidate_name: string
  candidate_number: string
  school_name: string
  total_score: number
  average_percentage: number
  grade: string
  division: string
  position: number
  status: string
}

export function paged<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = data as { results?: T[] }
  return d?.results ?? []
}

export function ExamResults({ examId, onChanged }: { examId: string; onChanged?: () => void }) {
  const [rows, setRows] = useState<ResultRow[] | null>(null)
  const [exam, setExam] = useState<{ status: string; public_token: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [res, ex] = await Promise.all([
        api.get(`/results/examination/?examination=${examId}`),
        api.get(`/examinations/${examId}/`),
      ])
      setRows(paged(res.data))
      setExam(ex.data as { status: string; public_token: string | null })
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [examId])

  useEffect(() => {
    void load()
  }, [load])

  async function action(path: string) {
    setBusy(path)
    setError(null)
    try {
      await api.post(`/results/workflow/${path}/`, { examination: examId })
      await load()
      onChanged?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Results</CardTitle>
          <CardDescription>Calculated candidate results and publication workflow.</CardDescription>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission={P.resultsCalculate}>
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => action("calculate")}>
              {busy === "calculate" ? "Calculating…" : "Calculate"}
            </Button>
          </PermissionGate>
          <PermissionGate permission={P.resultsFinalize}>
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => action("finalize")}>
              Finalize
            </Button>
          </PermissionGate>
          <PermissionGate permission={P.resultsPublish}>
            <Button size="sm" disabled={!!busy} onClick={() => action("publish")}>
              Publish
            </Button>
          </PermissionGate>
        </div>
      </CardHeader>
      <CardContent>
        {exam?.status === "PUBLISHED" && exam.public_token ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-green-600/30 bg-green-50 px-3 py-2">
            <p className="truncate text-sm text-green-800">
              <span className="font-semibold">Published</span> — share link:{" "}
              <code className="text-xs">{publicUrl(exam.public_token)}</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(publicUrl(exam.public_token!))}
            >
              Copy link
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!rows ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results yet — enter marks, then run Calculate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-end">Total</TableHead>
                  <TableHead className="text-end">Avg %</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Div</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.position ?? "—"}</TableCell>
                    <TableCell>
                      {r.candidate_name}
                      <span className="block text-xs text-muted-foreground">{r.candidate_number}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.school_name}</TableCell>
                    <TableCell className="text-end">{r.total_score}</TableCell>
                    <TableCell className="text-end">{Number(r.average_percentage).toFixed(1)}</TableCell>
                    <TableCell><Badge variant="secondary">{r.grade ?? "—"}</Badge></TableCell>
                    <TableCell>{r.division ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


function publicUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/public/results/${token}`
}
