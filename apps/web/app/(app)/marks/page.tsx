"use client"

import { useEffect, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { MarksSheet } from "@/components/marks-sheet"
import { paged, type ExamRow } from "@/lib/helpers"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

interface ExamDetailLite {
  id: string
  name: string
  grading_scheme: string | null
  subjects_detail: { id: string; subject_name?: string; subject_code?: string; subject: string }[]
}

export default function MarksPage() {
  const [exams, setExams] = useState<ExamRow[] | null>(null)
  const [examId, setExamId] = useState("")
  const [exam, setExam] = useState<ExamDetailLite | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get("/examinations/")
      .then((r) => setExams(paged<ExamRow>(r.data)))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(() => {
    if (!examId) {
      setExam(null)
      return
    }
    setExam(null)
    api
      .get<ExamDetailLite>(`/examinations/${examId}/`)
      .then((r) => setExam(r.data!))
      .catch((e) => setError(errorMessage(e)))
  }, [examId])

  return (
    <ModulePage
      title="Marks"
      description="Enter and review marks for examinations in progress."
      anyOf={[P.marksView, P.marksEnter]}
      actions={
        <div className="w-72">
          <Select value={examId} onValueChange={(v) => setExamId(v ?? "")} items={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))}>
            <SelectTrigger><SelectValue placeholder="Select examination" /></SelectTrigger>
            <SelectContent>
              {(exams ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!exams ? (
        <Skeleton className="h-40 w-full" />
      ) : exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No examinations available. Create one first.
        </p>
      ) : !examId ? (
        <p className="text-sm text-muted-foreground">
          Select an examination to open its marks sheets.
        </p>
      ) : !exam ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <MarksSheet subjects={exam.subjects_detail} schemeId={exam.grading_scheme} />
      )}
    </ModulePage>
  )
}
