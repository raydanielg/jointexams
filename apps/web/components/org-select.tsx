"use client"

import { useAuth } from "@/lib/auth"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const ALL = "__all__"

/** Form field that lets the user pick which of their organizations a new
 * record belongs to. Renders a hidden input when there is only one org. */
export function OrgSelect({ label = "Organization" }: { label?: string }) {
  const { schools } = useAuth()

  if (schools.length === 1 && schools[0]) {
    return <input type="hidden" name="school" value={schools[0].school_id} />
  }
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select
        name="school"
        required
        items={schools.map((s) => ({ value: s.school_id, label: s.school_name }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {schools.map((s) => (
            <SelectItem key={s.school_id} value={s.school_id} label={s.school_name}>
              {s.school_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Optional list filter — only rendered when the user has several orgs. */
export function OrgFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { schools } = useAuth()
  if (schools.length < 2) return null

  return (
    <div className="w-52">
      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : (v ?? ""))}
        items={[
          { value: ALL, label: "All organizations" },
          ...schools.map((s) => ({ value: s.school_id, label: s.school_name })),
        ]}
      >
        <SelectTrigger>
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
    </div>
  )
}
