"use client"

import { useState } from "react"

import { Input } from "@workspace/ui/components/input"

export interface GradeBandInput {
  grade: string
  min_percentage: number
  max_percentage: number
  points: number
}

export const DEFAULT_BANDS: GradeBandInput[] = [
  { grade: "A", min_percentage: 75, max_percentage: 100, points: 1 },
  { grade: "B", min_percentage: 65, max_percentage: 75, points: 2 },
  { grade: "C", min_percentage: 45, max_percentage: 65, points: 3 },
  { grade: "D", min_percentage: 30, max_percentage: 45, points: 4 },
  { grade: "F", min_percentage: 0, max_percentage: 30, points: 5 },
]

export const DEFAULT_DIVISIONS = [
  { name: "I", min_points: 7, max_points: 17 },
  { name: "II", min_points: 18, max_points: 21 },
  { name: "III", min_points: 22, max_points: 25 },
  { name: "IV", min_points: 26, max_points: 33 },
  { name: "0", min_points: 34, max_points: 35 },
]

/** Editable grade-band table (A–F rows with % ranges). */
export function GradeBandsEditor({
  value,
  onChange,
}: {
  value: GradeBandInput[]
  onChange: (bands: GradeBandInput[]) => void
}) {
  function patch(i: number, field: "min_percentage" | "max_percentage", v: string) {
    const next = value.map((b, j) =>
      j === i ? { ...b, [field]: Number(v) } : b
    )
    onChange(next)
  }

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-4 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Grade</span>
        <span>Min %</span>
        <span>Max %</span>
        <span>Points</span>
      </div>
      {value.map((b, i) => (
        <div key={b.grade} className="grid grid-cols-4 items-center gap-2 px-3 py-1.5">
          <span className="font-semibold">{b.grade}</span>
          <Input
            type="number"
            className="h-8"
            min={0}
            max={100}
            value={b.min_percentage}
            onChange={(e) => patch(i, "min_percentage", e.target.value)}
          />
          <Input
            type="number"
            className="h-8"
            min={0}
            max={100}
            value={b.max_percentage}
            onChange={(e) => patch(i, "max_percentage", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">{b.points}</span>
        </div>
      ))}
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Bands must cover 0–100 with no gaps. F = fail.
      </p>
    </div>
  )
}

/** Small read-only display of a scheme's bands. */
export function GradeBandsView({
  bands,
}: {
  bands: { grade: string; min_percentage: number; max_percentage: number; points: number; remark?: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-start">
            <th className="px-3 py-2 text-start font-medium">Grade</th>
            <th className="px-3 py-2 text-start font-medium">Range</th>
            <th className="px-3 py-2 text-start font-medium">Points</th>
            <th className="px-3 py-2 text-start font-medium">Remark</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr key={b.grade} className="border-b last:border-0">
              <td className="px-3 py-1.5 font-semibold">{b.grade}</td>
              <td className="px-3 py-1.5">
                {b.min_percentage}–{b.max_percentage}%
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">{b.points}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{b.remark || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
