import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border-2 border-border bg-transparent hover:bg-accent hover:border-primary/30 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        pill: 
          "rounded-full border border-border bg-background hover:border-primary/50 hover:bg-accent transition-all",
        glass:
          "glass text-foreground hover:bg-white/90 dark:hover:bg-white/10 border border-white/40",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4 rounded-xl",
        xs: "h-7 gap-1.5 rounded-lg px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-2 rounded-lg px-4 has-[>svg]:px-3",
        lg: "h-12 gap-2 rounded-xl px-8 text-base has-[>svg]:px-6",
        xl: "h-14 gap-3 rounded-xl px-10 text-lg has-[>svg]:px-8",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-')]:size-3.5",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
