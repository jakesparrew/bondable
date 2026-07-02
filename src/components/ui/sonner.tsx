import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={3500}
      toastOptions={{
        classNames: {
          // Ink surface — deep teal, white text, radius-ctl, overlay shadow.
          toast:
            "group toast group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-transparent group-[.toaster]:rounded-ctl group-[.toaster]:shadow-overlay",
          description: "group-[.toast]:text-primary-foreground/70",
          actionButton:
            "group-[.toast]:bg-primary-foreground group-[.toast]:text-primary group-[.toast]:rounded-ctl",
          cancelButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-primary-foreground/70",
          success: "group-[.toaster]:text-success-soft [&_svg]:text-success-soft",
          error: "group-[.toaster]:text-destructive-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
