"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Download01Icon, PrinterIcon } from "@hugeicons/core-free-icons"

import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { RequirePermission } from "@/components/guards"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

const ALL = "__all__"
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "")

export default function CandidateListPdfPreviewPage() {
  const params = useParams<{ id: string }>()
  const { schools } = useAuth()
  const [schoolFilter, setSchoolFilter] = useState(ALL)
  const [order, setOrder] = useState("number_asc")
  const [search, setSearch] = useState("")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const schoolId = schoolFilter === ALL ? "" : schoolFilter

  const loadPdf = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const qs =
        `?order=${order}` +
        (schoolId ? `&school_id=${schoolId}` : "") +
        (search ? `&q=${encodeURIComponent(search)}` : "")
      const res = await fetch(`${API_BASE}/candidate-lists/${params.id}/pdf/${qs}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("emas_access")}` },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const blob = await res.blob()
      setPdfUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
    } catch {
      setError("Could not generate the PDF preview.")
      setPdfUrl(null)
    } finally {
      setBusy(false)
    }
  }, [params.id, order, schoolId, search])

  useEffect(() => {
    const t = setTimeout(() => void loadPdf(), 250)
    return () => clearTimeout(t)
  }, [loadPdf])

  async function download() {
    if (pdfUrl) {
      const a = document.createElement("a")
      a.href = pdfUrl
      a.download = "candidate-list.pdf"
      a.click()
      return
    }
    await loadPdf()
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
              List
            </Button>
            <h1 className="text-lg font-semibold">List preview</h1>
          </div>
          <Button onClick={download} disabled={busy}>
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="me-2 size-4" />
            Download PDF
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
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
          <Select
            value={order}
            onValueChange={(v) => setOrder(v ?? "number_asc")}
            items={[
              { value: "number_asc", label: "Number ↑" },
              { value: "number_desc", label: "Number ↓" },
              { value: "name_asc", label: "Name A → Z" },
              { value: "name_desc", label: "Name Z → A" },
            ]}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number_asc" label="Number ↑">Number ↑</SelectItem>
              <SelectItem value="number_desc" label="Number ↓">Number ↓</SelectItem>
              <SelectItem value="name_asc" label="Name A → Z">Name A → Z</SelectItem>
              <SelectItem value="name_desc" label="Name Z → A">Name Z → A</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-64"
            placeholder="Search name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <HugeiconsIcon icon={PrinterIcon} strokeWidth={1.5} className="size-10" />
                Your browser cannot display the PDF inline — use Download instead.
              </div>
            </object>
          ) : (
            <Skeleton className="h-[calc(100vh-15rem)] w-full rounded-md" />
          )}
        </div>
      </div>
    </RequirePermission>
  )
}
