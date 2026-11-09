import { Capacitor, registerPlugin } from '@capacitor/core';

// 135: window.confirm inside the iOS app shows Capacitor's fixed English "Cancel" / "Ok" buttons.
// On iOS the MatchrimOCR plugin shows the same question with Spanish buttons; elsewhere, or if the
// plugin is missing (older binary), window.confirm is used as before.
export interface NativeConfirmTransport135 {
  confirm(options: { message: string; ok: string; cancel: string; destructive: boolean }): Promise<unknown>;
}
const native = registerPlugin<NativeConfirmTransport135>('MatchrimOCR');
type Options = { ok?: string; cancel?: string; destructive?: boolean };

export const createConfirm135 = (transport: NativeConfirmTransport135 | null, fallback: (message: string) => boolean) =>
  async (message: string, { ok = 'Aceptar', cancel = 'Cancelar', destructive = false }: Options = {}): Promise<boolean> => {
    if (!transport) return fallback(message);
    try {
      const result = await transport.confirm({ message, ok, cancel, destructive }) as { value?: unknown } | null;
      return result?.value === true;
    } catch {
      return fallback(message);
    }
  };

export const confirm135 = (message: string, options?: Options) => createConfirm135(
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('MatchrimOCR') ? native : null,
  text => window.confirm(text),
)(message, options);
