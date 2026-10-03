"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { PermissionGate } from "@/components/guards"
import { OrgFilter } from "@/components/org-select"
import { Checkbox } from "@workspace/ui/components/checkbox"
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

interface CandidateList {
  id: string
  name: string
  cohort: string | null
  description: string
  status: string
  candidate_count: number
  created_at: string
}

export default function CandidateListsPage() {
  const [rows, setRows] = useState<CandidateList[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgFilter, setOrgFilter] = useState("")
  const [open, setOpen] = useState(false)
  const [membersFor, setMembersFor] = useState<CandidateList | null>(null)
  const [editFor, setEditFor] = useState<CandidateList | null>(null)

  const load = useCallback(async () => {
    try {
      const qs = orgFilter ? `?school=${orgFilter}` : ""
      const res = await api.get(`/candidate-lists/${qs}`)
      setRows(paged<CandidateList>(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [orgFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ModulePage
      title="Candidate lists"
      description="Reusable groups of candidates that join examinations together."
      permission={P.candidatesView}
      actions={
        <>
        <OrgFilter value={orgFilter} onChange={setOrgFilter} />
        <PermissionGate permission={P.candidatesCreate}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              New list
            </SheetTrigger>
            <CreateListDialog
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
          <CardTitle className="text-base">All lists</CardTitle>
          <CardDescription>Lists can be enrolled into any examination in one click.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidate lists yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Candidates</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/candidate-lists/${l.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {l.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.cohort || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell className="text-end">{l.candidate_count}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/candidate-lists/${l.id}`} />}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMembersFor(l)}>
                          Members
                        </Button>
                        <PermissionGate permission={P.candidatesUpdate}>
                          <Button variant="ghost" size="sm" onClick={() => setEditFor(l)}>
                            Edit
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Sheet open={!!membersFor} onOpenChange={(o) => !o && setMembersFor(null)}>
        {membersFor ? (
          <MembersDrawer
            list={membersFor}
            onChanged={() => void load()}
          />
        ) : null}
      </Sheet>
      <Sheet open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        {editFor ? (
          <EditListDrawer
            list={editFor}
            onDone={() => {
              setEditFor(null)
              void load()
            }}
          />
        ) : null}
      </Sheet>
    </ModulePage>
  )
}

interface CandidateRow {
  id: string
  full_name: string
  candidate_number: string
  school_name: string
}

function CreateListDialog({ onDone }: { onDone: () => void }) {
  const { schools } = useAuth()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [orgIds, setOrgIds] = useState<string[]>([])
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!orgIds.length && schools[0]) setOrgIds([schools[0].school_id])
  }, [schools, orgIds.length])

  useEffect(() => {
    if (!orgIds.length) {
      setCandidates([])
      return
    }
    Promise.all(
      orgIds.map((id) =>
        api.get(`/candidates/?school=${id}&page_size=200`).then((r) => paged<CandidateRow>(r.data))
      )
    )
      .then((lists) => setCandidates(lists.flat()))
      .catch(() => setCandidates([]))
  }, [orgIds])

  function toggleOrg(id: string) {
    setOrgIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }
  function toggleCandidate(id: string) {
    setPicked((cur) => {
      const next = new Set(cur)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleMany(ids: string[], add: boolean) {
    setPicked((cur) => {
      const next = new Set(cur)
      for (const id of ids) add ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      const res = await api.post<{ id: string }>("/candidate-lists/", {
        school: orgIds[0],
        name: f.get("name"),
        cohort: f.get("cohort") || "",
        description: f.get("description") || "",
      })
      if (picked.size) {
        await api.post(`/candidate-lists/${res.data!.id}/add-candidates/`, {
          candidate_ids: [...picked],
        })
      }
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the list."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle className="text-base">New candidate list</SheetTitle>
        <SheetDescription>
          Pick candidates across all your organizations — the list enrolls into
          examinations as one group.
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-2">
          <Label htmlFor="name">List name</Label>
          <Input id="name" name="name" placeholder="e.g. Form IV — 2026" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cohort">Cohort (optional)</Label>
          <Input id="cohort" name="cohort" placeholder="e.g. 2026" />
        </div>
        {schools.length > 1 ? (
          <div className="grid gap-2">
            <Label>Organizations</Label>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              {schools.map((s) => (
                <label key={s.school_id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={orgIds.includes(s.school_id)}
                    onCheckedChange={() => toggleOrg(s.school_id)}
                  />
                  {s.school_name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label>Candidates {picked.size ? `(${picked.size} selected)` : ""}</Label>
          <CandidatePoolPicker
            candidates={candidates}
            picked={picked}
            onToggle={toggleCandidate}
            onToggleMany={toggleMany}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" />
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy || !orgIds.length}>
            {busy ? "Saving…" : `Create list${picked.size ? ` (${picked.size} candidates)` : ""}`}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}

function MembersDrawer({ list, onChanged }: { list: CandidateList; onChanged: () => void }) {
  const { schools } = useAuth()
  const [members, setMembers] = useState<CandidateRow[] | null>(null)
  const [pool, setPool] = useState<CandidateRow[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    try {
      const res = await api.get(`/candidate-lists/${list.id}/candidates/`)
      const data = res.data as { results?: CandidateRow[] } | CandidateRow[]
      setMembers(Array.isArray(data) ? data : (data.results ?? []))
    } catch {
      setMembers([])
    }
  }, [list.id])

  const loadPool = useCallback(async () => {
    try {
      const lists = await Promise.all(
        schools.map((s) =>
          api.get(`/candidates/?school=${s.school_id}&page_size=200`).then((r) => paged<CandidateRow>(r.data))
        )
      )
      setPool(lists.flat())
    } catch {
      setPool([])
    }
  }, [schools])

  useEffect(() => {
    void loadMembers()
    void loadPool()
  }, [loadMembers, loadPool])

  const memberIds = new Set((members ?? []).map((m) => m.id))
  const available = pool.filter((c) => !memberIds.has(c.id))

  function toggle(id: string) {
    setPicked((cur) => {
      const next = new Set(cur)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleMany(ids: string[], add: boolean) {
    setPicked((cur) => {
      const next = new Set(cur)
      for (const id of ids) add ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function add() {
    if (!picked.size) return
    setBusy(true)
    setMsg(null)
    try {
      await api.post(`/candidate-lists/${list.id}/add-candidates/`, { candidate_ids: [...picked] })
      setPicked(new Set())
      await loadMembers()
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err, "Could not add candidates."))
    } finally {
      setBusy(false)
    }
  }

  async function remove(c: CandidateRow) {
    setBusy(true)
    setMsg(null)
    try {
      await api.post(`/candidate-lists/${list.id}/remove-candidates/`, { candidate_ids: [c.id] })
      await loadMembers()
      onChanged()
    } catch (err) {
      setMsg(errorMessage(err, "Could not remove the candidate."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle className="text-base">{list.name}</SheetTitle>
        <SheetDescription>
          {list.candidate_count} candidates · {list.cohort || "No cohort"}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <div className="grid gap-2">
          <Label>Members</Label>
          <div className="overflow-hidden rounded-md border">
            {!members ? (
              <div className="p-3"><Skeleton className="h-6 w-full" /></div>
            ) : members.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No candidates in this list.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {members.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-0">
                    <div>
                      <span className="font-medium">{c.full_name}</span>
                      <span className="ms-2 text-xs text-muted-foreground">
                        {c.school_name} · {c.candidate_number}
                      </span>
                    </div>
                    <PermissionGate permission={P.candidatesUpdate}>
                      <Button variant="ghost" size="sm" onClick={() => remove(c)} disabled={busy}>
                        Remove
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Add candidates {picked.size ? `(${picked.size} selected)` : ""}</Label>
          {available.length === 0 ? (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                No more candidates available — all are already in this list.
              </p>
            </div>
          ) : (
            <CandidatePoolPicker
              candidates={available}
              picked={picked}
              onToggle={toggle}
              onToggleMany={toggleMany}
            />
          )}
        </div>
      </div>
      <SheetFooter>
        <Button size="lg" className="w-full" onClick={add} disabled={busy || !picked.size}>
          {busy ? "Adding…" : `Add ${picked.size || ""} candidates`}
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}

function EditListDrawer({ list, onDone }: { list: CandidateList; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.patch(`/candidate-lists/${list.id}/`, {
        name: f.get("name"),
        cohort: f.get("cohort") || "",
        description: f.get("description") || "",
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not update the list."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Edit list</SheetTitle>
        <SheetDescription>Update {list.name}.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={list.name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cohort">Cohort</Label>
          <Input id="cohort" name="cohort" defaultValue={list.cohort ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={list.description} />
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}


function CandidatePoolPicker({
  candidates, picked, onToggle, onToggleMany,
}: {
  candidates: CandidateRow[]
  picked: Set<string>
  onToggle: (id: string) => void
  onToggleMany: (ids: string[], add: boolean) => void
}) {
  const bySchool = new Map<string, CandidateRow[]>()
  for (const c of candidates) {
    const key = c.school_name || "Organization"
    bySchool.set(key, [...(bySchool.get(key) ?? []), c])
  }
  const allIds = candidates.map((c) => c.id)
  const allPicked = allIds.length > 0 && allIds.every((id) => picked.has(id))
  const somePicked = allIds.some((id) => picked.has(id))

  if (!candidates.length) {
    return (
      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">
          No candidates in the selected organizations yet — upload them first.
        </p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <label className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm font-medium">
        <Checkbox
          checked={allPicked}
          indeterminate={somePicked && !allPicked}
          onCheckedChange={(v) => onToggleMany(allIds, v === true)}
        />
        Select all ({candidates.length})
      </label>
      <div className="max-h-64 overflow-y-auto">
        {[...bySchool.entries()].map(([school, rows]) => {
          const ids = rows.map((c) => c.id)
          const allIn = ids.every((id) => picked.has(id))
          const someIn = ids.some((id) => picked.has(id))
          return (
            <div key={school}>
              <label className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={allIn}
                  indeterminate={someIn && !allIn}
                  onCheckedChange={(v) => onToggleMany(ids, v === true)}
                />
                {school} ({rows.length})
              </label>
              {rows.map((c) => (
                <label key={c.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-0">
                  <Checkbox checked={picked.has(c.id)} onCheckedChange={() => onToggle(c.id)} />
                  {c.full_name}
                  <span className="text-xs text-muted-foreground">{c.candidate_number}</span>
                </label>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
