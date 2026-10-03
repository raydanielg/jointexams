"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "")
const ALL = "__all__"

interface PublicResult {
  candidate_number: string
  full_name: string
  school_name: string
  school_id: string
  score: string | null
  grade: string
  points: string | null
  division: string
  position: number | null
}

interface PublicData {
  exam: { id: string; name: string; code: string; term: string; period: string }
  schools: { id: string; name: string }[]
  single_subject: boolean
  results: PublicResult[]
}

export default function PublicResultsPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState(ALL)

  useEffect(() => {
    fetch(`${API_BASE}/results/public/${token}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => setData(j.data))
      .catch(() => setError("Results not found or not published yet."))
  }, [token])

  const rows = useMemo(() => {
    if (!data) return []
    return data.results.filter(
      (r) => schoolId === ALL || r.school_id === schoolId
    )
  }, [data, schoolId])

  function downloadPdf() {
    const qs = schoolId === ALL ? "" : `?school_id=${schoolId}`
    window.open(`${API_BASE}/results/public/${token}/pdf/${qs}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        {/* masthead — mirrors the PDF */}
        <div className="rounded-t-lg border bg-white px-8 pb-6 pt-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            The Prime Minister's Office
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Regional Administration and Local Government
          </p>
          <h1 className="mt-3 text-xl font-bold uppercase tracking-tight">
            {data ? data.exam.name : <Skeleton className="mx-auto h-6 w-64" />}
          </h1>
          {data ? (
            <p className="mt-1 text-sm text-slate-600">
              {data.schools.map((s) => s.name).join(" · ")}
            </p>
          ) : null}
          <div className="mt-4 border-t-4 border-slate-800 pt-1">
            <div className="border-t border-slate-800" />
          </div>
        </div>

        {/* filters + download */}
        <div className="flex flex-wrap items-center gap-2 border-x bg-card px-4 py-3">
          <Select
            value={schoolId}
            onValueChange={(v) => setSchoolId(v ?? ALL)}
            items={[
              { value: ALL, label: "All schools" },
              ...(data?.schools ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} label="All schools">All schools</SelectItem>
              {(data?.schools ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id} label={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {rows.length} candidate{rows.length === 1 ? "" : "s"}
          </span>
          <Button className="ms-auto" onClick={downloadPdf} disabled={!data}>
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-2 size-4" />
            Download PDF
          </Button>
        </div>

        {/* results table */}
        <div className="overflow-hidden rounded-b-lg border bg-white shadow-sm">
          {error ? (
            <p className="px-6 py-10 text-center text-sm text-destructive">{error}</p>
          ) : !data ? (
            <div className="p-6">
              <Skeleton className="mb-2 h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Candidate no.</th>
                  <th className="px-4 py-2.5">Full name</th>
                  <th className="px-4 py-2.5">School</th>
                  <th className="px-4 py-2.5 text-center">Score</th>
                  <th className="px-4 py-2.5 text-center">Gr</th>
                  <th className="px-4 py-2.5 text-center">
                    {data.single_subject ? "PTS" : "Div"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.candidate_number} className="border-b last:border-0 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{r.candidate_number}</td>
                    <td className="px-4 py-2 font-medium">{r.full_name}</td>
                    <td className="px-4 py-2 text-slate-600">{r.school_name}</td>
                    <td className="px-4 py-2 text-center">{r.score ?? "—"}</td>
                    <td className="px-4 py-2 text-center font-semibold">{r.grade || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      {data.single_subject ? (r.points ?? "—") : (r.division || "—")}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No results for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Powered by EMAS — Examination Management System
        </p>
      </div>
    </div>
  )
}
