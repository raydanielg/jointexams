"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Download01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { PermissionGate } from "@/components/guards"
import { paged, type ExamRow } from "@/lib/helpers"
import { GradeDistribution } from "@/components/grade-distribution"
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

interface ReportJob {
  id: string
  examination_code: string
  report_type: string
  format: string
  status: string
  error?: string | null
  created_at: string
  completed_at?: string | null
}

const REPORT_TYPES: [string, string][] = [
  ["FULL_RESULTS", "Full examination results"],
  ["RESULT_SLIP", "Result slips"],
  ["CANDIDATE_RESULT", "Candidate result"],
  ["SUBJECT_RESULTS", "Subject results"],
  ["POSITION_REPORT", "Position report"],
  ["GRADE_DISTRIBUTION", "Grade distribution"],
  ["PERFORMANCE_ANALYSIS", "Performance analysis"],
  ["MISSING_MARKS", "Missing marks"],
  ["ABSENT_CANDIDATES", "Absent candidates"],
  ["MARKS_COMPLETION", "Marks completion"],
  ["EXAM_SUMMARY", "Examination summary"],
  ["MARK_SHEET", "Mark sheet"],
]

const FORMATS: [string, string][] = [
  ["PDF", "PDF"],
  ["XLSX", "Excel"],
  ["CSV", "CSV"],
]

const JOB_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "default",
  QUEUED: "secondary",
  RUNNING: "secondary",
  FAILED: "destructive",
  PENDING: "outline",
}

export default function ReportsPage() {
  const [jobs, setJobs] = useState<ReportJob[] | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get("/reports/")
      setJobs(paged<ReportJob>(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
    api
      .get("/examinations/")
      .then((r) => setExams(paged<ExamRow>(r.data)))
      .catch(() => {})
  }, [load])

  async function download(job: ReportJob) {
    try {
      const res = await api.get<undefined>(`/reports/${job.id}/download/`)
      // download returns a file — handled via blob path below
      void res
    } catch (err) {
      setError(errorMessage(err))
    }
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "")
      const r = await fetch(`${base}/reports/${job.id}/download/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("emas_access")}`,
        },
      })
      if (!r.ok) throw new Error()
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${job.report_type.toLowerCase()}-${job.examination_code}.${job.format.toLowerCase()}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Report is not ready to download yet.")
    }
  }

  return (
    <ModulePage
      title="Reports"
      description="Generate and download examination reports."
      anyOf={[P.reportsView, P.reportsGenerate]}
      actions={
        <PermissionGate permission={P.reportsGenerate}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              Generate report
            </SheetTrigger>
            <GenerateReportDialog
              exams={exams}
              onDone={() => {
                setOpen(false)
                void load()
              }}
            />
          </Sheet>
        </PermissionGate>
      }
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <GradeDistribution exams={exams ?? []} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generated reports</CardTitle>
          <CardDescription>Report jobs run for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {!jobs ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Examination</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Created</TableHead>
                  <TableHead className="text-end"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">
                      {REPORT_TYPES.find(([k]) => k === j.report_type)?.[1] ?? j.report_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{j.examination_code}</TableCell>
                    <TableCell>{j.format}</TableCell>
                    <TableCell>
                      <Badge variant={JOB_VARIANT[j.status] ?? "outline"}>{j.status}</Badge>
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {new Date(j.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      {j.status === "COMPLETED" ? (
                        <Button variant="outline" size="sm" onClick={() => download(j)}>
                          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-1 size-3.5" />
                          Download
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
    </ModulePage>
  )
}

function GenerateReportDialog({
  exams,
  onDone,
}: {
  exams: ExamRow[]
  onDone: () => void
}) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/reports/generate/", {
        examination: f.get("examination"),
        report_type: f.get("report_type"),
        format: f.get("format"),
        run_async: false,
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not generate the report."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Generate report</SheetTitle>
        <SheetDescription>Choose an examination and report type.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-2">
          <Label>Examination</Label>
          <Select name="examination" required items={exams.map((e) => ({ value: e.id, label: e.name }))}>
            <SelectTrigger><SelectValue placeholder="Select examination" /></SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Report type</Label>
          <Select name="report_type" required items={REPORT_TYPES.map(([v, l]) => ({ value: v, label: l }))}>
            <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(([k, label]) => (
                <SelectItem key={k} value={k} label={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Format</Label>
          <Select name="format" required defaultValue="PDF" items={FORMATS.map(([v, l]) => ({ value: v, label: l }))}>
            <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              {FORMATS.map(([k, label]) => (
                <SelectItem key={k} value={k} label={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Generating…" : "Generate"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}
