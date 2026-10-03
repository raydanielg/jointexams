"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Download01Icon, PrinterIcon, Refresh01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { PermissionGate, RequirePermission } from "@/components/guards"
import { paged } from "@/lib/helpers"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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

interface ListDetail {
  id: string
  name: string
  cohort: string | null
  description: string
  status: string
  candidate_count: number
}

interface ListCandidate {
  id: string
  full_name: string
  candidate_number: string
  gender: string
  school_name: string
  school: string
}

const ALL = "__all__"

async function fetchPdf(id: string, schoolId: string, order: string): Promise<string> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "")
  const res = await fetch(
    `${base}/candidate-lists/${id}/pdf/?` +
      `${schoolId ? `school=${schoolId}&` : ""}order=${order}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("emas_access")}` } }
  )
  if (!res.ok) throw new Error(`PDF failed: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export default function CandidateListPreviewPage() {
  const params = useParams<{ id: string }>()
  const { schools } = useAuth()
  const [list, setList] = useState<ListDetail | null>(null)
  const [rows, setRows] = useState<ListCandidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [schoolFilter, setSchoolFilter] = useState(ALL)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("number_asc")
  const [genOpen, setGenOpen] = useState(false)
  const [savingNum, setSavingNum] = useState<string | null>(null)

  const schoolId = schoolFilter === ALL ? "" : schoolFilter

  const load = useCallback(async () => {
    try {
      const [l, first] = await Promise.all([
        api.get<ListDetail>(`/candidate-lists/${params.id}/`),
        api.get(
          `/candidate-lists/${params.id}/candidates/?page_size=200` +
            `${schoolId ? `&school_id=${schoolId}` : ""}` +
            `${search ? `&q=${encodeURIComponent(search)}` : ""}`
        ),
      ])
      setList(l.data!)
      const data = first.data as
        | { results?: ListCandidate[]; next?: string | null }
        | ListCandidate[]
      const rows: ListCandidate[] = Array.isArray(data)
        ? [...data]
        : [...(data.results ?? [])]
      const toPath = (url: string) =>
        url.includes("/api/v1/") ? url.split("/api/v1/")[1]!.replace(/^/, "/") : url
      let next = Array.isArray(data) ? null : (data.next ?? null)
      while (next) {
        const more = await api.get(toPath(next))
        const md = more.data as { results?: ListCandidate[]; next?: string | null }
        rows.push(...(md.results ?? []))
        next = md.next ?? null
      }
      setRows(rows)
    } catch (err) {
      setError(errorMessage(err, "Could not load the list."))
    }
  }, [params.id, schoolId, search])

  useEffect(() => {
    void load()
  }, [load])

  async function saveNumber(c: ListCandidate, number: string) {
    const next = number.trim()
    if (!next || next === c.candidate_number) return
    setSavingNum(c.id)
    try {
      await api.patch(`/candidates/${c.id}/`, { candidate_number: next })
      setRows((rows) =>
        rows?.map((r) => (r.id === c.id ? { ...r, candidate_number: next } : r)) ?? null
      )
    } catch (err) {
      setError(errorMessage(err, "Could not update the number."))
    } finally {
      setSavingNum(null)
    }
  }

  const sortedRows = [...(rows ?? [])].sort((a, b) => {
    if (sort === "name_desc") return b.full_name.localeCompare(a.full_name)
    if (sort === "number_asc") return a.candidate_number.localeCompare(b.candidate_number)
    if (sort === "number_desc") return b.candidate_number.localeCompare(a.candidate_number)
    return a.full_name.localeCompare(b.full_name)
  })

  return (
    <RequirePermission permission={P.candidatesView}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/candidate-lists" />}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="me-1 size-4" />
              Lists
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{list?.name ?? "…"}</h1>
              <p className="text-sm text-muted-foreground">
                {list ? `${list.candidate_count} candidates` : ""}
                {list?.cohort ? ` · Cohort ${list.cohort}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate permission={P.candidatesUpdate}>
              <Sheet open={genOpen} onOpenChange={setGenOpen}>
                <Button variant="outline" size="lg" onClick={() => setGenOpen(true)}>
                  <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} className="me-2 size-4" />
                  Generate numbers
                </Button>
                <GenerateNumbersDrawer
                  listId={params.id}
                  sort={sort}
                  schoolId={schoolId}
                  schoolLabel={schoolFilter === ALL ? "all organizations" : schools.find((s) => s.school_id === schoolId)?.school_name ?? ""}
                  cohort={list?.cohort ?? ""}
                  onDone={() => {
                    setGenOpen(false)
                    void load()
                  }}
                />
              </Sheet>
            </PermissionGate>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href={`/candidate-lists/${params.id}/checklist`} />}
            >
              <HugeiconsIcon icon={PrinterIcon} strokeWidth={2} className="me-2 size-4" />
              Checklist
            </Button>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={`/candidate-lists/${params.id}/preview`} />}
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-2 size-4" />
              Preview
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates</CardTitle>
            <CardDescription>
              Filter by organization or search a name/number.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Select
                value={schoolFilter}
                onValueChange={(v) => setSchoolFilter(v ?? ALL)}
                items={[
                  { value: ALL, label: "All organizations" },
                  ...schools.map((s) => ({ value: s.school_id, label: s.school_name })),
                ]}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} label="All organizations">
                    All organizations
                  </SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.school_id} value={s.school_id} label={s.school_name}>
                      {s.school_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-64"
                placeholder="Search name or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={sort}
                onValueChange={(v) => setSort(v ?? "number_asc")}
                items={[
                  { value: "name_asc", label: "Name A → Z" },
                  { value: "name_desc", label: "Name Z → A" },
                  { value: "number_asc", label: "Number ↑" },
                  { value: "number_desc", label: "Number ↓" },
                ]}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc" label="Name A → Z">Name A → Z</SelectItem>
                  <SelectItem value="name_desc" label="Name Z → A">Name Z → A</SelectItem>
                  <SelectItem value="number_asc" label="Number ↑">Number ↑</SelectItem>
                  <SelectItem value="number_desc" label="Number ↓">Number ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!rows ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : sortedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No candidates match.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Organization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">
                        <NumberCell
                          value={c.candidate_number}
                          busy={savingNum === c.id}
                          onSave={(v) => saveNumber(c, v)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.school_name}</TableCell>
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


function NumberCell({
  value, busy, onSave,
}: {
  value: string
  busy: boolean
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        type="button"
        className="underline-offset-2 hover:underline"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="Click to edit"
      >
        {busy ? "Saving…" : value}
      </button>
    )
  }
  return (
    <Input
      className="h-7 w-36"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        onSave(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false)
          onSave(draft)
        }
        if (e.key === "Escape") setEditing(false)
      }}
    />
  )
}

function GenerateNumbersDrawer({
  listId, sort, schoolId, schoolLabel, cohort, onDone,
}: {
  listId: string
  sort: string
  schoolId: string
  schoolLabel: string
  cohort: string
  onDone: () => void
}) {
  const [prefix, setPrefix] = useState("JNT")
  const [year, setYear] = useState(cohort || String(new Date().getFullYear()))
  const [mode, setMode] = useState(schoolId ? "per_school" : "combined")
  const [start, setStart] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await api.post<{ updated: number }>(
        `/candidate-lists/${listId}/generate-numbers/`,
        {
          prefix: prefix.trim() || "JNT",
          year: year.trim(),
          mode,
          order: sort,
          ...(start ? { start: Number(start) } : {}),
          ...(schoolId ? { school: schoolId } : {}),
        }
      )
      if ((res.data?.updated ?? 0) === 0) {
        setMsg("No candidates matched — nothing renumbered.")
      } else {
        onDone()
      }
    } catch (err) {
      setMsg(errorMessage(err, "Could not generate numbers."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="text-base">Generate candidate numbers</SheetTitle>
        <SheetDescription>
          Sequential numbers in the format{" "}
          <span className="font-medium">{prefix || "JNT"}/{year || "YYYY"}/0001…</span>{" "}
          for {schoolLabel}.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
        <div className="grid gap-2">
          <Label htmlFor="prefix">Prefix</Label>
          <Input
            id="prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="JNT"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start">Start from number</Label>
          <Input
            id="start"
            type="number"
            min={1}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground">
            First number in the sequence — leave empty to continue from the
            highest existing number.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
          />
        </div>
        {!schoolId ? (
          <div className="grid gap-2">
            <Label>Numbering</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v ?? "combined")}
              items={[
                { value: "combined", label: "One shared sequence — alphabetical by name" },
                { value: "per_school", label: "Per organization — each starts at 0001" },
              ]}
            >
              <SelectTrigger>
                <SelectValue placeholder="Numbering mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined" label="One shared sequence — alphabetical by name">
                  One shared sequence — alphabetical
                </SelectItem>
                <SelectItem value="per_school" label="Per organization — each starts at 0001">
                  Per organization — each starts at 0001
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Candidates are numbered in the order shown in the table —
          change the sort (A→Z, Z→A, number) before generating to control it.
        </p>
        <p className="text-xs text-muted-foreground">
          {schoolId || mode === "per_school"
            ? "Each organization gets its own sequence — numbering continues after its highest existing number."
            : "All organizations share one sequence, ordered by candidate name — continuing after the highest existing number."}
        </p>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
      </div>
      <SheetFooter>
        <Button size="lg" className="w-full" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : "Generate numbers"}
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}
