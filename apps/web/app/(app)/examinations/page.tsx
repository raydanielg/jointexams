"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowRight01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { OrgFilter, OrgSelect } from "@/components/org-select"
import { paged, STATUS_VARIANT, type ExamRow } from "@/lib/helpers"
import {
  DEFAULT_BANDS,
  DEFAULT_DIVISIONS,
  GradeBandsEditor,
  type GradeBandInput,
} from "@/components/grading-editor"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { PermissionGate } from "@/components/guards"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
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
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

const NEXT_STATUS: Record<string, string> = {
  DRAFT: "READY",
  READY: "ACTIVE",
  ACTIVE: "MARKS_ENTRY",
  MARKS_ENTRY: "UNDER_REVIEW",
  UNDER_REVIEW: "FINALIZED",
}


export function ExaminationsPage() {
  const { hasPermission } = useAuth()
  const [exams, setExams] = useState<ExamRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgFilter, setOrgFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const canManage = hasPermission(P.examsUpdate) || hasPermission(P.examsTransition)
  const canDelete = hasPermission(P.examsUpdate)

  const load = useCallback(async () => {
    try {
      const qs = orgFilter ? `?school=${orgFilter}` : ""
      const res = await api.get(`/examinations/${qs}`)
      setExams(paged<ExamRow>(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [orgFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function transition(exam: ExamRow, status: string) {
    try {
      await api.post(`/examinations/${exam.id}/transition/`, { status })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(exam: ExamRow) {
    try {
      await api.delete(`/examinations/${exam.id}/`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <ModulePage
      title="Examinations"
      description="Create and manage examinations for your organization."
      permission={P.examsView}
      actions={
        <>
        <OrgFilter value={orgFilter} onChange={setOrgFilter} />
        <PermissionGate permission={P.examsCreate}>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              New examination
            </SheetTrigger>
            <CreateExamDialog
              onDone={() => {
                setCreateOpen(false)
                void load()
              }}
            />
          </Sheet>
        </PermissionGate>
        </>
      }
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All examinations</CardTitle>
          <CardDescription>Examinations your organization organizes or participates in.</CardDescription>
        </CardHeader>
        <CardContent>
          {!exams ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : exams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No examinations yet — create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Candidates</TableHead>
                  <TableHead className="text-end">Subjects</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <Link href={`/examinations/${e.id}`} className="hover:underline">
                        {e.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.code}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[e.status] ?? "outline"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">{e.candidate_count}</TableCell>
                    <TableCell className="text-end">{e.subject_count}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/examinations/${e.id}`} />}>
                          Open
                        </Button>
                        {canManage && NEXT_STATUS[e.status] ? (
                          <Button
                            size="sm"
                            onClick={() => transition(e, NEXT_STATUS[e.status]!)}
                          >
                            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="me-1 size-3.5" />
                            {NEXT_STATUS[e.status]}
                          </Button>
                        ) : null}
                        {canDelete && e.status === "DRAFT" ? (
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={<Button variant="ghost" size="sm" />}
                            >
                              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4 text-destructive" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete examination?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  &quot;{e.name}&quot; will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => remove(e)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
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

export default ExaminationsPage

function CreateExamDialog({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bands, setBands] = useState<GradeBandInput[]>(DEFAULT_BANDS)
  const [customBands, setCustomBands] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      const created = await api.post<{ id: string }>("/examinations/", {
        school: f.get("school"),
        name: f.get("name"),
        code: f.get("code"),
        description: f.get("description") || "",
      })
      const examId = created.data!.id
      if (customBands) {
        const scheme = await api.post<{ id: string }>(
          "/grading/schemes/create-with-bands/",
          {
            name: `${f.get("name")} grading`,
            description: "Custom scheme for this examination.",
            bands: bands,
            division_bands: DEFAULT_DIVISIONS,
          }
        )
        await api.patch(`/examinations/${examId}/`, {
          grading_scheme: scheme.data!.id,
        })
      }
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the examination."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">New examination</SheetTitle>
        <SheetDescription>
          Create a draft examination — add subjects and candidates next.
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <OrgSelect />

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Mock Examination 2026" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" placeholder="e.g. MOCK-2026" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="Optional" />
        </div>
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={customBands}
              onCheckedChange={(c) => setCustomBands(!!c)}
            />
            Customize grading
          </label>
          <p className="text-xs text-muted-foreground">
            Default: A ≥ 75, B ≥ 65, C ≥ 45, D ≥ 30, F &lt; 30 — divisions I–IV &amp; 0.
          </p>
          {customBands ? (
            <GradeBandsEditor value={bands} onChange={setBands} />
          ) : null}
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Creating…" : "Create examination"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}
