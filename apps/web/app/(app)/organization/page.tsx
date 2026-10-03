"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Building03Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ModulePage } from "@/components/module-page"
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
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

export default function OrganizationPage() {
  const { schools, refresh } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <ModulePage
      title="Organizations"
      description="Organizations and examination centers you administer. Switch between them or add a new one."
      actions={
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button />}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="me-1 size-4" />
            Add organization
          </SheetTrigger>
          <AddOrganizationDrawer
            onDone={() => {
              setOpen(false)
              void refresh()
            }}
          />
        </Sheet>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {schools.map((s) => {
          return (
            <Card key={s.school_id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <HugeiconsIcon icon={Building03Icon} strokeWidth={2} className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{s.school_name}</CardTitle>
                    <CardDescription>{s.role}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">Organization</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Data from all your organizations is shown together — filter per
                  page when you need a single one.
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ModulePage>
  )
}

function AddOrganizationDrawer({ onDone }: { onDone: (id: string | null) => void }) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await api.post<{ school: { id: string } }>("/auth/organizations/", {
        organization_name: name.trim(),
      })
      onDone(res.data?.school.id ?? null)
      setName("")
    } catch (err) {
      setMsg(errorMessage(err, "Could not create the organization."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Add organization</SheetTitle>
        <SheetDescription>
          Create another organization you administer — for example another school
          or examination center. It gets its own candidates, examinations and
          results, and a default grading scheme.
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mbeya Examination Council"
            required
          />
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create organization"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}
