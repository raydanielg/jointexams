"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { P } from "@/lib/permissions"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
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

export interface SheetRow {
  exam_candidate_id: string
  candidate_number: string
  candidate_name: string
  school_name: string
  component_id: string
  component_name: string
  maximum_marks: number
  value: number | null
  status: string
}

export interface ExamSubjectLite {
  id: string
  subject_name?: string
  subject_code?: string
  subject?: string
}

interface GradeBand {
  grade: string
  min_percentage: string | number
  max_percentage: string | number
}

function subjectLabel(s: ExamSubjectLite) {
  return s.subject_name ?? s.subject_code ?? s.subject ?? s.id
}

export function MarksSheet({
  subjects,
  schemeId,
}: {
  subjects: ExamSubjectLite[]
  schemeId?: string | null
}) {
  const { hasPermission } = useAuth()
  const canEnter = hasPermission(P.marksEnter) || hasPermission(P.marksUpdate)
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  // subjectId → its sheet rows
  const [sheets, setSheets] = useState<Record<string, SheetRow[]>>({})
  const [bands, setBands] = useState<GradeBand[]>([])
  // `${subjectId}:${examCandidateId}:${componentId}` → raw string
  const [values, setValues] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef(values)
  const sheetsRef = useRef(sheets)
  const subjectIdsRef = useRef(subjectIds)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedRef = useRef<Record<string, string>>({})
  valuesRef.current = values
  sheetsRef.current = sheets
  subjectIdsRef.current = subjectIds

  const selectedSubjects = useMemo(
    () => subjects.filter((s) => subjectIds.includes(s.id)),
    [subjects, subjectIds]
  )

  // Fetch each newly-selected subject's sheet.
  useEffect(() => {
    if (!subjectIds.length) {
      setSheets({})
      setValues({})
      return
    }
    setError(null)
    setSaveState("idle")
    Promise.all(
      subjectIds.map((id) =>
        api
          .get<{ rows: SheetRow[] }>(`/marks/entries/sheet/?exam_subject=${id}`)
          .then((r) => [id, r.data!.rows] as const)
          .catch(() => [id, [] as SheetRow[]] as const)
      )
    ).then((entries) => {
      setSheets(Object.fromEntries(entries))
      const loaded: Record<string, string> = {}
      setValues((v) => {
        const next = { ...v }
        for (const [sid, sheetRows] of entries) {
          for (const row of sheetRows) {
            const k = `${sid}:${row.exam_candidate_id}:${row.component_id}`
            next[k] = row.value != null ? String(row.value) : ""
            loaded[k] = next[k]
          }
        }
        return next
      })
      savedRef.current = { ...savedRef.current, ...loaded }
    })
  }, [subjectIds])

  // Grade bands for live grade preview — exam's scheme or the org default.
  useEffect(() => {
    async function loadBands() {
      try {
        let scheme = schemeId
        if (!scheme) {
          const res = await api.get("/grading/schemes/?is_default=true&page_size=1")
          const d = res.data as { id: string }[] | { results: { id: string }[] }
          scheme = Array.isArray(d) ? d[0]?.id : d.results?.[0]?.id
        }
        if (!scheme) return
        const res = await api.get(`/grading/bands/?scheme=${scheme}`)
        const data = res.data as GradeBand[] | { results: GradeBand[] }
        setBands(Array.isArray(data) ? data : (data.results ?? []))
      } catch {
        setBands([])
      }
    }
    void loadBands()
  }, [schemeId])

  // Union of candidates across all selected subjects (same enrollment pool).
  const candidates = useMemo(() => {
    const map = new Map<string, SheetRow>()
    for (const sid of subjectIds) {
      for (const r of sheets[sid] ?? []) {
        if (!map.has(r.exam_candidate_id)) map.set(r.exam_candidate_id, r)
      }
    }
    return [...map.values()]
  }, [subjectIds, sheets])

  const componentsBySubject = useMemo(
    () =>
      new Map(
        selectedSubjects.map((s) => [
          s.id,
          [...new Map((sheets[s.id] ?? []).map((r) => [r.component_id, r])).values()],
        ])
      ),
    [selectedSubjects, sheets]
  )

  function gradeFor(sid: string, candId: string): string | null {
    if (!bands.length) return null
    const comps = componentsBySubject.get(sid) ?? []
    if (!comps.length) return null
    let total = 0
    let max = 0
    for (const comp of comps) {
      const raw = values[`${sid}:${candId}:${comp.component_id}`]
      if (raw === undefined || raw === "") return null
      const n = Number(raw)
      if (Number.isNaN(n)) return null
      total += n
      max += Number(comp.maximum_marks)
    }
    if (!max) return null
    const pct = (total / max) * 100
    const band = bands.find(
      (b) => pct >= Number(b.min_percentage) && pct <= Number(b.max_percentage)
    )
    return band?.grade ?? null
  }

  const maxByKey = useMemo(() => {
    const m = new Map<string, number>()
    for (const [sid, rows2] of Object.entries(sheets)) {
      for (const r of rows2) m.set(`${sid}:${r.exam_candidate_id}:${r.component_id}`, Number(r.maximum_marks))
    }
    return m
  }, [sheets])

  function cellInvalid(key: string) {
    const raw = values[key]
    if (raw === undefined || raw === "") return false
    const n = Number(raw)
    const max = maxByKey.get(key) ?? Infinity
    return Number.isNaN(n) || n < 0 || n > max
  }

  function cellSaved(key: string) {
    const v = values[key]
    return v !== undefined && v !== "" && v === savedRef.current[key]
  }

  function subjectRowSaved(sid: string, candId: string) {
    const comps = componentsBySubject.get(sid) ?? []
    return comps.length > 0 && comps.every((c) => cellSaved(`${sid}:${candId}:${c.component_id}`))
  }

  /** Flat grid coordinate: (row, column) where columns enumerate every
   * subject/component cell left-to-right. */
  const columnIds = useMemo(
    () =>
      selectedSubjects.flatMap((s) =>
        (componentsBySubject.get(s.id) ?? []).map((c) => `${s.id}:${c.component_id}`)
      ),
    [selectedSubjects, componentsBySubject]
  )

  /** Excel-style navigation — Enter/↓ next row, ↑ up, ←/→ across cells. */
  function onCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const moves: Record<string, [number, number]> = {
      Enter: [1, 0],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    const next = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-cell="${row + move[0]}:${col + move[1]}"]`
    )
    next?.focus()
    next?.select()
  }

  async function saveNow() {
    const ids = subjectIdsRef.current
    if (!ids.length) return
    setSaveState("saving")
    try {
      await Promise.all(
        ids.map((sid) => {
          const payload = (sheetsRef.current[sid] ?? [])
            .map((r) => {
              const k = `${sid}:${r.exam_candidate_id}:${r.component_id}`
              const raw = valuesRef.current[k]
              if (raw === undefined || raw === "") return null
              const n = Number(raw)
              if (Number.isNaN(n) || n < 0 || n > Number(r.maximum_marks)) return null
              return {
                exam_candidate: r.exam_candidate_id,
                component: r.component_id,
                value: n,
              }
            })
            .filter(Boolean)
          if (!payload.length) return Promise.resolve(null)
          return api.post("/marks/entries/bulk-entry/", {
            exam_subject: sid,
            rows: payload,
          })
        })
      )
      savedRef.current = { ...valuesRef.current }
      setSaveState("saved")
    } catch (err) {
      setSaveState("error")
      const rowErrors =
        (err as { details?: { errors?: { row: number; error: string }[] } })
          .details?.errors ?? []
      setError(
        rowErrors.length
          ? `${rowErrors.length} row${rowErrors.length === 1 ? "" : "s"} rejected: ${rowErrors[0]?.error ?? ""}${rowErrors.length > 1 ? ` (+${rowErrors.length - 1} more)` : ""}`
          : errorMessage(err, "Could not save marks.")
      )
    }
  }

  /** Debounced autosave — fires ~800ms after the last keystroke. */
  function scheduleSave() {
    if (!canEnter) return
    setSaveState((s) => (s === "saved" ? "idle" : s))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void saveNow(), 800)
  }

  // Flush pending changes when leaving the page or closing the tab.
  useEffect(() => {
    const flush = () => void saveNow()
    window.addEventListener("beforeunload", flush)
    return () => {
      window.removeEventListener("beforeunload", flush)
      if (timerRef.current) clearTimeout(timerRef.current)
      void saveNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fill progress — cells with a value out of all fillable cells.
  const progress = useMemo(() => {
    let total = 0
    let filled = 0
    for (const sid of subjectIds) {
      const compCount = (componentsBySubject.get(sid) ?? []).length
      const enrolled = new Set(
        (sheets[sid] ?? []).map((r) => r.exam_candidate_id)
      )
      for (const candId of enrolled) {
        for (const comp of componentsBySubject.get(sid) ?? []) {
          total += 1
          const raw = values[`${sid}:${candId}:${comp.component_id}`]
          if (raw !== undefined && raw !== "") filled += 1
        }
      }
    }
    return { total, filled, pct: total ? Math.round((filled / total) * 100) : 0 }
  }, [subjectIds, sheets, componentsBySubject, values])

  const invalidCount = useMemo(
    () => Object.keys(values).filter((k) => cellInvalid(k)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values]
  )

  const loading = subjectIds.some((id) => !sheets[id])
  const allSelected = subjects.length > 0 && subjectIds.length === subjects.length

  function toggleSubject(id: string) {
    setSubjectIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Marks entry</CardTitle>
          <CardDescription>
            Pick one or several subjects — the grid grows a column per component.
            Type marks, press Enter for the next row; everything autosaves.
          </CardDescription>
        </div>
        {subjectIds.length > 0 && !loading ? (
          <div className="flex items-center gap-3">
            <ProgressRing pct={progress.pct} />
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {progress.filled}/{progress.total} <span className="text-xs font-normal text-muted-foreground">marks</span>
              </p>
              <p className={`text-xs font-medium ${
                saveState === "error" ? "text-destructive" : "text-muted-foreground"
              }`}>
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "All saved"
                    : saveState === "error"
                      ? "Autosave failed"
                      : "Autosave on"}
              </p>
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Subject picker — chips, with an "all" toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <Checkbox
              checked={allSelected}
              indeterminate={subjectIds.length > 0 && !allSelected}
              onCheckedChange={(v) =>
                setSubjectIds(v === true ? subjects.map((s) => s.id) : [])
              }
            />
            All subjects
          </label>
          {subjects.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                subjectIds.includes(s.id) ? "border-primary bg-primary/5 font-medium" : ""
              }`}
            >
              <Checkbox
                checked={subjectIds.includes(s.id)}
                onCheckedChange={() => toggleSubject(s.id)}
              />
              {subjectLabel(s)}
            </label>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {invalidCount > 0 ? (
          <p className="rounded-md border border-destructive/40 bg-red-50 px-3 py-2 text-sm text-destructive">
            {invalidCount} mark{invalidCount === 1 ? "" : "s"} exceed the maximum or are invalid —
            fix them before they can be saved.
          </p>
        ) : null}
        {!subjectIds.length ? (
          <p className="text-sm text-muted-foreground">
            Select subjects to open the marks sheet.
          </p>
        ) : loading ? (
          <Skeleton className="h-32 w-full" />
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrolled candidates.</p>
        ) : (
          <>
            <div className="overflow-x-auto" ref={gridRef}>
              <Table>
                <TableHeader>
                  {/* Grouped header: one cell spanning each subject's columns */}
                  <TableRow>
                    <TableHead rowSpan={2}>Number</TableHead>
                    <TableHead rowSpan={2}>Full name</TableHead>
                    <TableHead rowSpan={2}>School</TableHead>
                    {selectedSubjects.map((s) => {
                      const span =
                        (componentsBySubject.get(s.id) ?? []).length +
                        (selectedSubjects.length === 1 ? 1 : 0)
                      return (
                        <TableHead
                          key={s.id}
                          colSpan={span}
                          className="border-s text-center font-semibold"
                        >
                          {subjectLabel(s)}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                  <TableRow>
                    {selectedSubjects.flatMap((s) => [
                      ...(componentsBySubject.get(s.id) ?? []).map((c) => (
                        <TableHead key={c.component_id} className="border-s text-end">
                          {c.component_name} /{c.maximum_marks}
                        </TableHead>
                      )),
                      ...(selectedSubjects.length === 1
                        ? [<TableHead key={`${s.id}-g`} className="text-end">Grade</TableHead>]
                        : []),
                    ])}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((cand, rowIdx) => (
                    <TableRow key={cand.exam_candidate_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {cand.candidate_number}
                      </TableCell>
                      <TableCell className="font-medium">{cand.candidate_name}</TableCell>
                      <TableCell className="text-muted-foreground">{cand.school_name}</TableCell>
                      {selectedSubjects.flatMap((s) => {
                        const comps = componentsBySubject.get(s.id) ?? []
                        const grade = gradeFor(s.id, cand.exam_candidate_id)
                        return [
                          ...comps.map((comp) => {
                            const colIdx = columnIds.indexOf(`${s.id}:${comp.component_id}`)
                            const key = `${s.id}:${cand.exam_candidate_id}:${comp.component_id}`
                            const enrolled = (sheets[s.id] ?? []).some(
                              (r) => r.exam_candidate_id === cand.exam_candidate_id
                            )
                            return (
                              <TableCell key={comp.component_id} className="border-s text-end">
                                {!enrolled ? (
                                  <span className="text-xs text-muted-foreground">n/a</span>
                                ) : canEnter ? (
                                  <Input
                                    className={`ms-auto h-8 w-24 rounded-none text-end shadow-none ${
                                      cellInvalid(key)
                                        ? "border-destructive bg-red-50 text-destructive focus-visible:ring-destructive/40"
                                        : `border-transparent ${cellSaved(key) ? "bg-green-50 text-green-800" : ""} focus-visible:border-primary focus-visible:ring-1`
                                    }`}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    data-cell={`${rowIdx}:${colIdx}`}
                                    value={values[key] ?? ""}
                                    onChange={(e) => {
                                      setValues((v) => ({ ...v, [key]: e.target.value }))
                                      scheduleSave()
                                    }}
                                    onKeyDown={(e) => onCellKeyDown(e, rowIdx, colIdx)}
                                  />
                                ) : (
                                  values[key] || "—"
                                )}
                              </TableCell>
                            )
                          }),
                          ...(selectedSubjects.length === 1
                            ? [
                                <TableCell key={`${s.id}-grade`} className="text-end">
                                  {grade ? (
                                    <Badge variant="outline" className="font-semibold">
                                      {grade}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>,
                              ]
                            : []),
                        ]
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Enter/↓ next row · ↑ previous row · ←/→ across subjects
              </p>
              {canEnter && saveState === "error" ? (
                <p className="text-xs font-medium text-destructive">
                  Autosave failed — edit any cell to retry
                </p>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}


function ProgressRing({ pct }: { pct: number }) {
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="relative size-11">
      <svg className="size-11 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4"
          className="stroke-muted" />
        <circle
          cx="20" cy="20" r={r} fill="none" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
        {pct}%
      </span>
    </div>
  )
}
