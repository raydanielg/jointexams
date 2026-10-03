"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { ExamResults } from "@/components/exam-results"
import { paged, type ExamRow } from "@/lib/helpers"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

export default function ResultsPage() {
  const [exams, setExams] = useState<ExamRow[] | null>(null)
  const [examId, setExamId] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get("/examinations/")
      .then((r) => setExams(paged<ExamRow>(r.data)))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  return (
    <ModulePage
      title="Results"
      description="Calculated results, positions and publication status."
      permission={P.resultsView}
      actions={
        <div className="flex w-96 items-center gap-2">
          <Select value={examId} onValueChange={(v) => setExamId(v ?? "")} items={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))}>
            <SelectTrigger><SelectValue placeholder="Select examination" /></SelectTrigger>
            <SelectContent>
              {(exams ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {examId ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/results/preview?exam=${examId}`} />}
            >
              Preview
            </Button>
          ) : null}
        </div>
      }
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!exams ? (
        <Skeleton className="h-40 w-full" />
      ) : exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No examinations available.
        </p>
      ) : !examId ? (
        <p className="text-sm text-muted-foreground">
          Select an examination to view its results.
        </p>
      ) : (
        <ExamResults examId={examId} />
      )}
    </ModulePage>
  )
}
