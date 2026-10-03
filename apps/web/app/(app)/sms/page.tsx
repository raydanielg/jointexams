"use client"

import { useCallback, useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message01Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { ModulePage } from "@/components/module-page"
import { PermissionGate } from "@/components/guards"
import { paged, type ExamRow } from "@/lib/helpers"
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

interface Campaign {
  id: string
  examination_code: string
  template_name: string | null
  status: string
  total: number
  queued: number
  sent: number
  failed: number
  skipped: number
  created_at: string
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "default",
  RUNNING: "secondary",
  QUEUED: "secondary",
  PENDING: "outline",
  FAILED: "destructive",
}

export default function SmsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [exams, setExams] = useState<ExamRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get("/sms/campaigns/")
      setCampaigns(paged<Campaign>(res.data))
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

  return (
    <ModulePage
      title="SMS campaigns"
      description="Notify candidates and guardians when results are published."
      permission={P.smsSend}
      actions={
        <PermissionGate permission={P.smsSend}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button />}>
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="me-1 size-4" />
              Send results SMS
            </SheetTrigger>
            <SendSmsDialog
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
          <CardDescription>SMS batches sent for examinations.</CardDescription>
        </CardHeader>
        <CardContent>
          {!campaigns ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Examination</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Total</TableHead>
                  <TableHead className="text-end">Sent</TableHead>
                  <TableHead className="text-end">Failed</TableHead>
                  <TableHead className="text-end">Created</TableHead>
                  <TableHead className="text-end"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.examination_code}</TableCell>
                    <TableCell className="text-muted-foreground">{c.template_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-end">{c.total}</TableCell>
                    <TableCell className="text-end">{c.sent}</TableCell>
                    <TableCell className="text-end">{c.failed}</TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      {c.failed > 0 ? (
                        <PermissionGate permission={P.smsSend}>
                          <ResendButton id={c.id} onDone={load} />
                        </PermissionGate>
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

function ResendButton({ id, onDone }: { id: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Resend failed
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resend failed messages?</AlertDialogTitle>
          <AlertDialogDescription>
            Messages that failed will be queued for delivery again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await api.post(`/sms/campaigns/${id}/resend-failed/`)
                await onDone()
              } catch {
                // surfaced by list reload
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? "Sending…" : "Resend"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SendSmsDialog({ exams, onDone }: { exams: ExamRow[]; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const f = new FormData(e.currentTarget)
    try {
      await api.post("/sms/campaigns/send/", {
        examination: f.get("examination"),
        run_async: true,
      })
      onDone()
    } catch (err) {
      setMsg(errorMessage(err, "Could not send the campaign."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle className="text-base">Send results SMS</SheetTitle>
        <SheetDescription>
          Candidates and guardians with phone numbers receive their results by SMS.
        </SheetDescription>
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
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <SheetFooter className="px-0 pb-0 pt-4">
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Send campaign"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  )
}
