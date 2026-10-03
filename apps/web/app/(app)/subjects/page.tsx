"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { PermissionGate } from "@/components/guards"
import { OrgFilter, OrgSelect } from "@/components/org-select"
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

interface Subject {
  id: string
  name: string
  code: string
  short_name: string
  description: string
  status: string
  is_global: boolean
}

export default function SubjectsPage() {
  const [rows, setRows] = useState<Subject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgFilter, setOrgFilter] = useState("")
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const qs = orgFilter ? `?school=${orgFilter}` : ""
      const res = await api.get(`/subjects/${qs}`)
      setRows(paged<Subject>(res.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [orgFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ModulePage
      title="Subjects"
      description="Subjects that can be attached to examinations."
      permission={P.subjectsView}
      actions={
        <>
        <OrgFilter value={orgFilter} onChange={setOrgFilter} />
        <PermissionGate permission={P.subjectsManage}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
              New subject
            </SheetTrigger>
            <CreateSubjectDialog
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
          <CardTitle className="text-base">All subjects</CardTitle>
          <CardDescription>Organization subjects plus shared global ones.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.code}</TableCell>
                    <TableCell>
                      {s.is_global ? (
                        <Badge variant="secondary">Global</Badge>
                      ) : (
                        <Badge variant="outline">Organization</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
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

function CreateSubjectDialog({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/subjects/", {
        school: f.get("school"),
        name: f.get("name"),
        code: f.get("code"),
        short_name: f.get("short_name") || "",
        description: f.get("description") || "",
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the subject."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">New subject</SheetTitle>
        <SheetDescription>Create a subject for your organization.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <OrgSelect />

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Mathematics" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" placeholder="e.g. MATH" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="short_name">Short name</Label>
            <Input id="short_name" name="short_name" placeholder="e.g. MATHS" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" />
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Create subject"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}
