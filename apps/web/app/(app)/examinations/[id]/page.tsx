"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { PermissionGate, RequirePermission } from "@/components/guards"
import { paged, STATUS_VARIANT } from "@/lib/helpers"
import { MarksSheet } from "@/components/marks-sheet"
import { ExamResults } from "@/components/exam-results"
import {
  DEFAULT_BANDS,
  DEFAULT_DIVISIONS,
  GradeBandsEditor,
  GradeBandsView,
  type GradeBandInput,
} from "@/components/grading-editor"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Input } from "@workspace/ui/components/input"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

interface ExamDetail {
  id: string
  name: string
  code: string
  status: string
  description?: string
  organizer_name: string
  participating_school_names: string[]
  grading_scheme: string | null
  subjects_detail: {
    id: string
    subject: string
    subject_name?: string
    subject_code?: string
    maximum_marks: number
    pass_mark: number
    calculation_method: string
    status: string
  }[]
}

interface Subject {
  id: string
  name: string
  code: string
}

interface CandidateList {
  id: string
  name: string
  candidate_count: number
}

interface Enrolled {
  id: string
  candidate_number: string
  candidate_name: string
  school_name: string
  status: string
}

interface ResultRow {
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

interface SheetRow {
  exam_candidate_id: string
  candidate_number: string
  candidate_name: string
  school_name: string
  component_id: string
  component_name: string
  maximum_marks: number
  value: number | null
  status: string
}

const TRANSITION_LABEL: Record<string, string> = {
  DRAFT: "Mark as READY",
  READY: "Activate",
  ACTIVE: "Open marks entry",
  MARKS_ENTRY: "Submit for review",
  UNDER_REVIEW: "Finalize",
}
const TRANSITION_TARGET: Record<string, string> = {
  DRAFT: "READY",
  READY: "ACTIVE",
  ACTIVE: "MARKS_ENTRY",
  MARKS_ENTRY: "UNDER_REVIEW",
  UNDER_REVIEW: "FINALIZED",
}


export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = useAuth()
  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManage = hasPermission(P.examsUpdate) || hasPermission(P.examsTransition)

  const load = useCallback(async () => {
    try {
      const res = await api.get<ExamDetail>(`/examinations/${id}/`)
      setExam(res.data!)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function transition() {
    const target = exam ? TRANSITION_TARGET[exam.status] : undefined
    if (!exam || !target) return
    try {
      await api.post(`/examinations/${exam.id}/transition/`, { status: target })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error && !exam) {
    return (
      <RequirePermission permission={P.examsView}>
        <p className="text-sm text-destructive">{error}</p>
      </RequirePermission>
    )
  }
  if (!exam) {
    return (
      <RequirePermission permission={P.examsView}>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission={P.examsView}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{exam.name}</h1>
            <Badge variant={STATUS_VARIANT[exam.status] ?? "outline"}>{exam.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {exam.code} · {exam.organizer_name}
            {exam.participating_school_names?.length > 1
              ? ` · ${exam.participating_school_names.length} schools`
              : ""}
          </p>
        </div>
        {canManage && TRANSITION_TARGET[exam.status] ? (
          <Button onClick={transition}>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="me-1 size-4" />
            {TRANSITION_LABEL[exam.status]}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="subjects">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects">
          <SubjectsTab exam={exam} onChanged={load} canManage={canManage} />
        </TabsContent>
        <TabsContent value="candidates">
          <CandidatesTab exam={exam} canManage={canManage} />
        </TabsContent>
        <TabsContent value="marks">
          <MarksSheet subjects={exam.subjects_detail} schemeId={exam.grading_scheme} />
        </TabsContent>
        <TabsContent value="results">
          <ExamResults examId={exam.id} onChanged={load} />
        </TabsContent>
        <TabsContent value="grading">
          <GradingTab exam={exam} canManage={canManage} onChanged={load} />
        </TabsContent>
      </Tabs>
    </RequirePermission>
  )
}

function SubjectsTab({ exam, onChanged, canManage }: {
  exam: ExamDetail
  onChanged: () => Promise<void>
  canManage: boolean
}) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get<Subject[]>("/subjects/").then((r) => setSubjects(paged(r.data))).catch(() => {})
  }, [])

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/exam-subjects/", {
        examination: exam.id,
        subject: f.get("subject"),
        maximum_marks: Number(f.get("maximum_marks") || 100),
        pass_mark: Number(f.get("pass_mark") || 50),
      })
      setOpen(false)
      await onChanged()
    } catch (err) {
      setMsg(errorMessage(err, "Could not add subject."))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Examination subjects</CardTitle>
          <CardDescription>Subjects and components assessed in this examination.</CardDescription>
        </div>
        {canManage && exam.status === "DRAFT" ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button size="sm" />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              Add subject
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-base">Add subject</SheetTitle>
                <SheetDescription>Pick a subject and set its marks.</SheetDescription>
              </SheetHeader>
              <form onSubmit={add} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select name="subject" required items={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id} label={`${s.name} (${s.code})`}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Maximum marks</Label>
                    <Input name="maximum_marks" type="number" defaultValue={100} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pass mark</Label>
                    <Input name="pass_mark" type="number" defaultValue={50} required />
                  </div>
                </div>
                {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
                <SheetFooter className="px-0 pb-0 pt-4"><Button type="submit" size="lg">Add</Button></SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent>
        {exam.subjects_detail.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-end">Max marks</TableHead>
                <TableHead className="text-end">Pass mark</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exam.subjects_detail.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.subject_name ?? s.subject_code ?? s.subject}
                  </TableCell>
                  <TableCell className="text-end">{s.maximum_marks}</TableCell>
                  <TableCell className="text-end">{s.pass_mark}</TableCell>
                  <TableCell className="text-muted-foreground">{s.calculation_method}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function CandidatesTab({ exam, canManage }: { exam: ExamDetail; canManage: boolean }) {
  const [rows, setRows] = useState<Enrolled[] | null>(null)
  const [lists, setLists] = useState<CandidateList[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/examinations/${exam.id}/candidates/`)
      setRows(paged(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [exam.id])

  useEffect(() => {
    void load()
    api.get<CandidateList[]>("/candidate-lists/").then((r) => setLists(paged(r.data))).catch(() => {})
  }, [load])

  async function enroll() {
    try {
      await api.post("/enrollments/enroll-lists/", {
        examination: exam.id,
        list_ids: picked,
      })
      setOpen(false)
      setPicked([])
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Enrolled candidates</CardTitle>
          <CardDescription>Candidates sitting this examination.</CardDescription>
        </div>
        {canManage && exam.status === "DRAFT" ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button size="sm" />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              Enroll lists
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-base">Enroll candidate lists</SheetTitle>
                <SheetDescription>All candidates in the selected lists join this examination.</SheetDescription>
              </SheetHeader>
              <div className="flex max-h-96 flex-col gap-3 overflow-y-auto px-6 py-2">
                {lists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No candidate lists — create one under Candidates → Candidate Lists.
                  </p>
                ) : (
                  lists.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={picked.includes(l.id)}
                        onCheckedChange={(c) =>
                          setPicked((p) => (c ? [...p, l.id] : p.filter((x) => x !== l.id)))
                        }
                      />
                      {l.name} ({l.candidate_count})
                    </label>
                  ))
                )}
              </div>
              <SheetFooter>
                <Button size="lg" onClick={enroll} disabled={picked.length === 0}>
                  Enroll {picked.length} {picked.length === 1 ? "list" : "lists"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!rows ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No candidates enrolled yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.candidate_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.candidate_number}</TableCell>
                  <TableCell className="text-muted-foreground">{r.school_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}


interface SchemeBand {
  grade: string
  min_percentage: number
  max_percentage: number
  points: number
  remark?: string
}

interface Scheme {
  id: string
  name: string
  is_default: boolean
  bands: SchemeBand[]
  division_bands: { id: string; name: string; min_points: number; max_points: number }[]
}

function GradingTab({ exam, canManage, onChanged }: {
  exam: ExamDetail
  canManage: boolean
  onChanged: () => Promise<void>
}) {
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [bands, setBands] = useState<GradeBandInput[]>(DEFAULT_BANDS)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      if (exam.grading_scheme) {
        const res = await api.get<Scheme>(`/grading/schemes/${exam.grading_scheme}/`)
        setScheme(res.data!)
      } else {
        const res = await api.get("/grading/schemes/")
        const all = paged<Scheme>(res.data)
        setScheme(all.find((s) => s.is_default) ?? all[0] ?? null)
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [exam.grading_scheme])

  useEffect(() => {
    void load()
  }, [load])

  function openEditor() {
    if (scheme?.bands?.length) {
      setBands(
        scheme.bands.map((b) => ({
          grade: b.grade,
          min_percentage: Number(b.min_percentage),
          max_percentage: Number(b.max_percentage),
          points: Number(b.points),
        }))
      )
    }
    setEditOpen(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<Scheme>("/grading/schemes/create-with-bands/", {
        name: `${exam.name} grading`,
        description: `Custom scheme for ${exam.code}.`,
        bands,
        division_bands: DEFAULT_DIVISIONS,
      })
      await api.patch(`/examinations/${exam.id}/`, { grading_scheme: res.data!.id })
      setEditOpen(false)
      await Promise.all([load(), onChanged()])
    } catch (err) {
      setError(errorMessage(err, "Could not save grading bands."))
    } finally {
      setSaving(false)
    }
  }

  const editable = canManage && exam.status === "DRAFT"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Grading</CardTitle>
          <CardDescription>
            {scheme
              ? `${scheme.name}${scheme.is_default ? " (organization default)" : ""}`
              : "Grade bands for this examination."}
          </CardDescription>
        </div>
        {editable ? (
          <Sheet open={editOpen} onOpenChange={setEditOpen}>
            <SheetTrigger render={<Button variant="outline" size="sm" />} onClick={openEditor}>
              Customize grading
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-base">Customize grading</SheetTitle>
                <SheetDescription>
                  Grade bands apply to this examination only. Your organization&apos;s
                  default stays untouched.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
                <GradeBandsEditor value={bands} onChange={setBands} />
                <p className="text-xs text-muted-foreground">
                  Divisions: I = 7–17 pts, II = 18–21, III = 22–25, IV = 26–33, 0 = 34–35
                  (A=1 … F=5 per subject).
                </p>
              </div>
              <SheetFooter>
                <Button size="lg" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save grading"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!scheme ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <GradeBandsView bands={scheme.bands} />
            {scheme.division_bands.length ? (
              <p className="text-sm text-muted-foreground">
                Divisions:{" "}
                {scheme.division_bands
                  .map((d) => `${d.name} (${d.min_points}–${d.max_points} pts)`)
                  .join(", ")}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
