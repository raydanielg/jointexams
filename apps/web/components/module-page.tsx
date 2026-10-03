"use client"

import { RequirePermission } from "@/components/guards"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

interface ModulePageProps {
  title: string
  description: string
  permission?: string
  anyOf?: string[]
  actions?: React.ReactNode
  children?: React.ReactNode
}

/** Shared module page shell: permission guard + header + content area. */
export function ModulePage({
  title,
  description,
  permission,
  anyOf,
  actions,
  children,
}: ModulePageProps) {
  return (
    <RequirePermission permission={permission} anyOf={anyOf}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
      {children ?? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No {title.toLowerCase()} yet</EmptyTitle>
            <EmptyDescription>
              Nothing is available in your current access scope.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </RequirePermission>
  )
}
