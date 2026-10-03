"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Building03Icon } from "@hugeicons/core-free-icons"

import { api, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
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
import { Spinner } from "@workspace/ui/components/spinner"

export function OrganizationOnboarding() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(
    user ? `${user.first_name}'s Organization` : ""
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post("/auth/organization/", { organization_name: name })
      await refresh()
    } catch (err) {
      setError(errorMessage(err, "Could not create the organization."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon
              icon={Building03Icon}
              strokeWidth={2}
              className="size-5 text-muted-foreground"
            />
          </div>
          <CardTitle>Set up your organization</CardTitle>
          <CardDescription>
            EMAS organizes examinations under an organization. Give yours a
            name — you&apos;ll be able to manage examinations, candidates,
            marks, results and more inside it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org">Organization name</Label>
              <Input
                id="org"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mwanza Examination Board"
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="me-2" /> Creating…
                </>
              ) : (
                "Create organization"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
