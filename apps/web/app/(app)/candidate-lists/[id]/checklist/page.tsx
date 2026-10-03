"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons"

import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { RequirePermission } from "@/components/guards"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

const ALL = "__all__"
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "")

export default function ChecklistPage() {
  const params = useParams<{ id: string }>()
  const { schools } = useAuth()
  const [schoolFilter, setSchoolFilter] = useState(ALL)
  const [listName, setListName] = useState("")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schoolId = schoolFilter === ALL ? "" : schoolFilter

  useEffect(() => {
    api
      .get(`/candidate-lists/${params.id}/`)
      .then((r) => setListName((r.data as { name?: string }).name ?? ""))
      .catch(() => undefined)
  }, [params.id])

  const loadPdf = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const qs = schoolId ? `?school_id=${schoolId}` : ""
      const res = await fetch(
        `${API_BASE}/candidate-lists/${params.id}/checklist-pdf/${qs}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("emas_access")}`,
          },
        }
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const blob = await res.blob()
      setPdfUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
    } catch {
      setError("Could not generate the checklist preview.")
      setPdfUrl(null)
    } finally {
      setBusy(false)
    }
  }, [params.id, schoolId])

  useEffect(() => {
    const t = setTimeout(() => void loadPdf(), 300)
    return () => clearTimeout(t)
  }, [loadPdf])

  const schoolItems = useMemo(
    () => [
      { value: ALL, label: "All organizations" },
      ...schools.map((s) => ({ value: s.school_id, label: s.school_name })),
    ],
    [schools]
  )

  async function download() {
    if (!pdfUrl) return
    const a = document.createElement("a")
    a.href = pdfUrl
    a.download = `${listName || "checklist"}.pdf`
    a.click()
  }

  return (
    <RequirePermission permission={P.candidatesView}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/candidate-lists/${params.id}`} />}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="me-1 size-4" />
              Back to list
            </Button>
            <h1 className="text-lg font-semibold">Verification checklist</h1>
          </div>
          <Button onClick={download} disabled={busy || !pdfUrl}>
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-2 size-4" />
            Download PDF
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
          <Select
            value={schoolFilter}
            onValueChange={(v) => setSchoolFilter(v ?? ALL)}
            items={schoolItems}
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
          <span className="ms-auto text-xs text-muted-foreground">
            {busy ? "Updating…" : "Preview up to date"}
          </span>
        </div>

        {/* PDF */}
        <div className="min-h-0 flex-1">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : pdfUrl ? (
            <object
              data={pdfUrl}
              type="application/pdf"
              className="h-[calc(100vh-15rem)] w-full rounded-md border bg-white"
            >
              <p className="py-10 text-center text-sm text-muted-foreground">
                Your browser cannot display the PDF inline — use Download instead.
              </p>
            </object>
          ) : (
            <Skeleton className="h-[calc(100vh-15rem)] w-full rounded-md" />
          )}
        </div>
      </div>
    </RequirePermission>
  )
}
