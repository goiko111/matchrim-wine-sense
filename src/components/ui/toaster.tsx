import { useToast } from "@/hooks/use-toast"
import { Capacitor } from "@capacitor/core"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const isNative = Capacitor.isNativePlatform()

  const rendered = (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className={Capacitor.isNativePlatform() ? 'grid min-w-0 gap-1' : 'grid gap-1'}>
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport label={isNative ? 'Avisos' : undefined} hotkey={isNative ? [] : undefined} />
    </ToastProvider>
  )
  return isNative ? <div aria-hidden={toasts.some(toast => toast.open) ? undefined : true}>{rendered}</div> : rendered
}
