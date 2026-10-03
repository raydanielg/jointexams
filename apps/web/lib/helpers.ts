/** Extract rows from either a paginated DRF response or a bare list. */
export function paged<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const d = data as { results?: T[] }
  return d?.results ?? []
}

export interface ExamRow {
  id: string
  name: string
  code: string
  status: string
  candidate_count: number
  subject_count: number
  school_count: number
  organizer_name: string
  term?: string | null
  period?: string | null
  created_at: string
}

export const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  READY: "secondary",
  ACTIVE: "default",
  MARKS_ENTRY: "default",
  UNDER_REVIEW: "secondary",
  FINALIZED: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
}
