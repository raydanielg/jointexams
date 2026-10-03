"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PrinterIcon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { P } from "@/lib/permissions"
import { RequirePermission } from "@/components/guards"
import { paged } from "@/lib/helpers"
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

interface ListCandidate {
  id: string
  full_name: string
  candidate_number: string
  school_name: string
  school: string
}

interface ListInfo {
  name: string
  cohort: string
  candidate_count: number
}

export default function ChecklistPage() {
  const params = useParams<{ id: string }>()
  const [list, setList] = useState<ListInfo | null>(null)
  const [rows, setRows] = useState<ListCandidate[] | null>(null)
  const [schoolFilter, setSchoolFilter] = useState(ALL)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([
        api.get(`/candidate-lists/${params.id}/`),
        api.get(`/candidate-lists/${params.id}/candidates/?page_size=500`),
      ])
      setList(l.data as ListInfo)
      setRows(paged<ListCandidate>(c.data))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const schools = useMemo(() => {
    const set = new Map<string, string>()
    for (const r of rows ?? []) set.set(r.school, r.school_name)
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const filtered = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => schoolFilter === ALL || r.school === schoolFilter)
        .sort((a, b) => a.candidate_number.localeCompare(b.candidate_number)),
    [rows, schoolFilter]
  )

  const shownSchools = useMemo(
    () => [...new Set(filtered.map((r) => r.school_name))].sort(),
    [filtered]
  )

  return (
    <RequirePermission permission={P.candidatesView}>
      <div className="flex flex-col gap-4 print:gap-0">
        {/* Controls — hidden when printing */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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
          <div className="flex items-center gap-2">
            <Select
              value={schoolFilter}
              onValueChange={(v) => setSchoolFilter(v ?? ALL)}
              items={[
                { value: ALL, label: "All organizations" },
                ...schools.map(([id, name]) => ({ value: id, label: name })),
              ]}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} label="All organizations">
                  All organizations
                </SelectItem>
                {schools.map(([id, name]) => (
                  <SelectItem key={id} value={id} label={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => window.print()}>
              <HugeiconsIcon icon={PrinterIcon} strokeWidth={2} className="me-2 size-4" />
              Print
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive print:hidden">{error}</p> : null}

        {/* Printable sheet */}
        <div className="rounded-lg border bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Masthead */}
          <div className="mb-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide">
              The Prime Minister&apos;s Office
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wide">
              Regional Administration and Local Government
            </p>
            <p className="mt-1.5 text-sm font-bold uppercase">
              {shownSchools.length === 1
                ? shownSchools[0]
                : shownSchools.join(" &amp; ").replace(/&amp;/g, "&")}
            </p>
            <p className="mt-1 text-base font-bold uppercase">
              {list?.name ?? "…"} — Candidate Verification Checklist
            </p>
            <p className="text-xs">
              Cohort {list?.cohort ?? ""} · {filtered.length} candidates ·{" "}
              {new Date().toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              }).toUpperCase()}
            </p>
            <div className="mt-2 border-t-2 border-black" />
            <div className="mt-0.5 border-t border-black" />
          </div>

          {!rows ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="[&>th]:border [&>th]:border-slate-500 [&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-bold">
                  <th className="w-8">#</th>
                  <th className="w-36">Candidate no.</th>
                  <th>Full name</th>
                  <th className="w-48">School</th>
                  <th className="w-28">Signature</th>
                  <th className="w-24">Marks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className="[&>td]:border [&>td]:border-slate-400 [&>td]:px-2 [&>td]:py-2.5">
                    <td className="text-center">{i + 1}</td>
                    <td className="font-mono">{r.candidate_number}</td>
                    <td className="font-medium">{r.full_name}</td>
                    <td>{r.school_name}</td>
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-6 flex justify-between text-[10px] uppercase text-slate-600">
            <span>Invigilator: ____________________</span>
            <span>Checked by: ____________________</span>
            <span>Date: ____ / ____ / ________</span>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}
