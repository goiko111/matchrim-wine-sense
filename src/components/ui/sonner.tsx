import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, useSonner } from "sonner"
import { Capacitor } from '@capacitor/core'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const isNative = Capacitor.isNativePlatform()
  const { toasts } = useSonner()

  const rendered = (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      hotkey={isNative ? [] : undefined}
      customAriaLabel={isNative ? 'Avisos' : undefined}
      className="toaster group"
      toastOptions={{
        closeButtonAriaLabel: "Cerrar aviso",
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
  return isNative ? <div aria-hidden={toasts.length === 0 ? true : undefined}>{rendered}</div> : rendered
}

export { Toaster, toast }
