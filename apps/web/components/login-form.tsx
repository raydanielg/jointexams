"use client"

import { cn } from "cn"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeClosedIcon,
  EyeIcon,
  LockPasswordIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons"

import { errorMessage, login } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Spinner } from "@workspace/ui/components/spinner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push("/dashboard")
      return
    } catch (err) {
      setError(errorMessage(err, "Login failed."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your EMAS account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {error ? <FieldError errors={[{ message: error }]} /> : null}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <InputGroup className="h-11 rounded-lg">
                  <InputGroupAddon>
                    <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    className="h-full text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup className="h-11 rounded-lg">
                  <InputGroupAddon>
                    <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} className="size-4.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-full text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-sm"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <HugeiconsIcon
                        icon={showPassword ? EyeIcon : EyeClosedIcon}
                        strokeWidth={2}
                        className="size-4.5"
                      />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <Button type="submit" className="h-11 w-full rounded-lg text-base" disabled={loading}>
                  {loading ? <Spinner className="me-2" /> : null}
                  Sign in
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
                    Sign up
                  </Link>
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <p className="px-6 text-center text-sm text-muted-foreground">
        Examination Management &amp; Assessment System
      </p>
    </div>
  )
}
