"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon, Download01Icon, Upload04Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { PermissionGate } from "@/components/guards"
import { OrgSelect } from "@/components/org-select"
import { paged } from "@/lib/helpers"
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

interface Candidate {
  id: string
  candidate_number: string
  full_name: string
  gender: string
  phone: string
  guardian_phone: string
  status: string
  school_name: string
}

export default function CandidatesPage() {
  const [rows, setRows] = useState<Candidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [schoolFilter, setSchoolFilter] = useState("")

  const load = useCallback(async () => {
    try {
      const qs = schoolFilter ? `?school=${schoolFilter}` : ""
      const res = await api.get(`/candidates/${qs}`)
      setRows(paged<Candidate>(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [schoolFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(c: Candidate) {
    try {
      await api.delete(`/candidates/${c.id}/`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <ModulePage
      title="Candidates"
      description="Candidate records in your organization."
      permission={P.candidatesView}
      actions={
        <>
          <PermissionGate permission={P.candidatesView}>
            <SchoolFilter value={schoolFilter} onChange={setSchoolFilter} />
          </PermissionGate>
          <PermissionGate permission={P.candidatesCreate}>
            <Button variant="outline" nativeButton={false} render={<Link href="/candidate-lists" />}>
              Candidate lists
            </Button>
          </PermissionGate>
          <PermissionGate permission={P.candidatesCreate}>
            <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
              <SheetTrigger render={<Button variant="outline" />}>
                <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="me-1 size-4" />
                Bulk upload
              </SheetTrigger>
              <BulkUploadDrawer
                onDone={() => {
                  setUploadOpen(false)
                  void load()
                }}
              />
            </Sheet>
          </PermissionGate>
          <PermissionGate permission={P.candidatesCreate}>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button />}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
                Add candidate
              </SheetTrigger>
              <CreateCandidateDialog
                onDone={() => {
                  setOpen(false)
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
          <CardTitle className="text-base">All candidates</CardTitle>
          <CardDescription>Every candidate registered in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Guardian phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{c.candidate_number}</TableCell>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.school_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.guardian_phone || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell className="text-end">
                      <PermissionGate permission={P.candidatesDelete}>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {c.full_name} will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => remove(c)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </PermissionGate>
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

function CreateCandidateDialog({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/candidates/", {
        school: f.get("school"),
        candidate_number: f.get("candidate_number"),
        first_name: f.get("first_name"),
        middle_name: f.get("middle_name") || "",
        last_name: f.get("last_name"),
        gender: f.get("gender"),
        phone: f.get("phone") || "",
        guardian_name: f.get("guardian_name") || "",
        guardian_phone: f.get("guardian_phone") || "",
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the candidate."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Add candidate</SheetTitle>
        <SheetDescription>Register a new candidate in your organization.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <OrgSelect />

        <div className="grid gap-2">
          <Label htmlFor="candidate_number">Candidate number</Label>
          <Input id="candidate_number" name="candidate_number" placeholder="e.g. CAND-001" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label>First name</Label>
            <Input name="first_name" required />
          </div>
          <div className="grid gap-2">
            <Label>Middle name</Label>
            <Input name="middle_name" />
          </div>
          <div className="grid gap-2">
            <Label>Last name</Label>
            <Input name="last_name" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select name="gender" required items={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "UNSPECIFIED", label: "Unspecified" }]}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE" label="Male">Male</SelectItem>
                <SelectItem value="FEMALE" label="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input name="phone" placeholder="+255…" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Guardian name</Label>
            <Input name="guardian_name" />
          </div>
          <div className="grid gap-2">
            <Label>Guardian phone</Label>
            <Input name="guardian_phone" placeholder="+255…" />
          </div>
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Add candidate"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}

interface CenterOption {
  id: string
  school_name: string
  school_code: string
  parent: string | null
}

function SchoolFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { schools } = useAuth()
  if (schools.length < 2) return null

  return (
    <div className="w-52">
      <Select
        value={value}
        onValueChange={(v) => onChange(v ?? "")}
        items={[
          { value: "", label: "All organizations" },
          ...schools.map((s) => ({ value: s.school_id, label: s.school_name })),
        ]}
      >
        <SelectTrigger><SelectValue placeholder="All organizations" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="" label="All organizations">All organizations</SelectItem>
          {schools.map((s) => (
            <SelectItem key={s.school_id} value={s.school_id} label={s.school_name}>
              {s.school_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface ImportSessionResult {
  id: string
  status: string
  total_rows: number
  success_rows: number
  failed_rows: number
  duplicate_rows: number
  errors: { row: number; field: string; message: string }[]
}

interface ImportedCandidate {
  id: string
  full_name: string
  candidate_number: string
}

interface PreviewRow {
  row: number
  candidate_number: string
  full_name: string
  phone: string
  status: "ok" | "error"
  messages: string[]
}

function BulkUploadDrawer({ onDone }: { onDone: () => void }) {
  const { schools } = useAuth()
  const [school, setSchool] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [result, setResult] = useState<ImportSessionResult | null>(null)
  const [imported, setImported] = useState<ImportedCandidate[]>([])

  useEffect(() => {
    if (!school && schools[0]) setSchool(schools[0].school_id)
  }, [schools, school])

  async function downloadTemplate() {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "")
    const res = await fetch(`${base}/imports/template/?type=CANDIDATES`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("emas_access")}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "candidates_template.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function loadPreview() {
    if (!file) {
      setMsg("Choose a file first.")
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("school", school)
      const res = await api.upload<{ rows: PreviewRow[] }>("/imports/preview/", form)
      setPreview(res.data!.rows)
    } catch (err) {
      setMsg(errorMessage(err, "Could not parse the file."))
    } finally {
      setBusy(false)
    }
  }

  function editRow(i: number, field: "full_name" | "phone", v: string) {
    if (!preview) return
    setPreview(preview.map((r, j) => (j === i ? { ...r, [field]: v } : r)))
  }

  async function confirm() {
    setBusy(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append("import_type", "CANDIDATES")
      if (file) form.append("file", file)
      form.append("run_async", "false")
      form.append("strict", "false")
      form.append("school", school)
      form.append(
        "edited_rows",
        JSON.stringify(
          (preview ?? []).map((r) => ({ full_name: r.full_name, phone: r.phone }))
        )
      )
      const res = await api.upload<ImportSessionResult>("/imports/upload/", form)
      setResult(res.data!)
      if (res.data!.success_rows > 0) {
        const list = await api.get(
          `/candidates/?school=${school}&ordering=-created_at&page_size=${res.data!.success_rows}`
        )
        setImported(paged<ImportedCandidate>(list.data))
      }
    } catch (err) {
      setMsg(errorMessage(err, "Upload failed."))
    } finally {
      setBusy(false)
    }
  }

  const errorRows = preview?.filter((r) => r.status === "error") ?? []

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle className="text-base">Bulk upload candidates</SheetTitle>
        <SheetDescription>
          Upload a spreadsheet of full names — numbers are assigned automatically.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {!preview && !result ? (
          <>
            <div className="grid gap-2">
              <Label>School</Label>
              <Select
                value={school}
                onValueChange={(v) => setSchool(v ?? "")}
                items={schools.map((c) => ({ value: c.school_id, label: c.school_name }))}
              >
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((c) => (
                    <SelectItem key={c.school_id} value={c.school_id} label={c.school_name}>
                      {c.school_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" type="button" onClick={downloadTemplate}>
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-2 size-4" />
              Download template
            </Button>
            <div className="grid gap-2">
              <Label htmlFor="file">Candidate file (.xlsx or .csv)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Just <span className="font-medium">full_name</span> and{" "}
                <span className="font-medium">phone</span> (optional). Candidate
                numbers are generated automatically.
              </p>
            </div>
          </>
        ) : preview && !result ? (
          <>
            <div className="rounded-md border p-3 text-sm">
              <span className="font-medium">{preview.length}</span> rows —{" "}
              <span className="text-green-600 font-medium">
                {preview.length - errorRows.length} ready
              </span>
              {errorRows.length ? (
                <span className="text-destructive">, {errorRows.length} need fixing</span>
              ) : null}
              . Edit cells below, then confirm.
            </div>
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[2rem_1fr_1fr] border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>#</span><span>Full name</span><span>Phone</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {preview.map((r, i) => (
                  <div
                    key={r.row}
                    className={`grid grid-cols-[2rem_1fr_1fr] items-center gap-2 border-b px-3 py-1.5 last:border-0 ${r.status === "error" ? "bg-destructive/5" : ""}`}
                  >
                    <span className="text-xs text-muted-foreground">{r.row}</span>
                    <Input
                      className="h-8"
                      value={r.full_name}
                      onChange={(e) => editRow(i, "full_name", e.target.value)}
                    />
                    <Input
                      className="h-8"
                      value={r.phone}
                      onChange={(e) => editRow(i, "phone", e.target.value)}
                    />
                    {r.messages.length ? (
                      <p className="col-span-3 text-xs text-destructive">{r.messages.join(" ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidate numbers will be auto-assigned ({`SCHOOL-0001…`}).
            </p>
          </>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-green-600/30 bg-green-600/5 p-3 text-sm">
              <span className="font-medium">Import complete:</span>{" "}
              {result.success_rows} of {result.total_rows} candidates added
              {result.failed_rows ? `, ${result.failed_rows} skipped` : ""}.
            </div>
            {result.errors?.length ? (
              <div className="max-h-28 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                {result.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-destructive">Row {e.row}: {e.field} — {e.message}</p>
                ))}
              </div>
            ) : null}
            {imported.length ? (
              <div className="overflow-hidden rounded-md border">
                <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Newly added candidates
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {imported.map((c, i) => (
                    <div
                      key={c.id}
                      className="animate-in fade-in slide-in-from-bottom-2 border-b px-3 py-2 text-sm last:border-0"
                      style={{ animationDelay: `${Math.min(i * 80, 1200)}ms`, animationFillMode: "backwards" }}
                    >
                      <span className="font-medium">{c.full_name}</span>
                      <span className="ms-2 text-muted-foreground">{c.candidate_number}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      </div>
      <SheetFooter>
        {result ? (
          <Button size="lg" onClick={onDone}>Done</Button>
        ) : preview ? (
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>Back</Button>
            <Button size="lg" className="flex-1" onClick={confirm} disabled={busy}>
              {busy ? "Uploading…" : `Upload ${preview.length} candidates`}
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={loadPreview} disabled={busy || !file}>
            {busy ? "Reading file…" : "Preview"}
          </Button>
        )}
      </SheetFooter>
    </SheetContent>
  )
}
