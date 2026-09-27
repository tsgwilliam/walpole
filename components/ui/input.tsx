import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-none border border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1 font-mono text-sm text-[var(--ink)] shadow-none outline-none placeholder:text-[var(--ink-soft)] focus-visible:border-[var(--coral)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
