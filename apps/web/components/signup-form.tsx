"use client"

import { cn } from "cn"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CallIcon,
  EyeClosedIcon,
  EyeIcon,
  LockPasswordIcon,
  Mail01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"

import { errorMessage, register } from "@/lib/api"
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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(fullName, email, phone, password)
      router.push("/dashboard")
      return
    } catch (err) {
      setError(errorMessage(err, "Sign up failed."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Sign up to get started with EMAS</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {error ? <FieldError errors={[{ message: error }]} /> : null}
              <Field>
                <FieldLabel htmlFor="full-name">Full name</FieldLabel>
                <InputGroup className="h-11 rounded-lg">
                  <InputGroupAddon>
                    <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="full-name"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-full text-base"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </InputGroup>
              </Field>
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
                <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                <InputGroup className="h-11 rounded-lg">
                  <InputGroupAddon>
                    <HugeiconsIcon icon={CallIcon} strokeWidth={2} className="size-4.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="phone"
                    type="tel"
                    placeholder="+255 700 000 000"
                    autoComplete="tel"
                    className="h-full text-base"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="h-full text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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
                  Create account
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                    Sign in
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
