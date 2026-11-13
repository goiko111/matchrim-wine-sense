import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';

// 153: in the scan sheet «¿Qué haces con este vino?» came after the reasons, a screen below the verdict. The sheet
// offers its save block through this slot and whichever verdict is on screen places it right under the answer, as
// in the search sheet. A verdict that shows the block says so (`taken`), and the sheet does not repeat it below.
export const VerdictSlot153 = createContext<{ node: ReactNode; taken: () => () => void } | null>(null);
export const useVerdictSlot153 = (shown: boolean): ReactNode => {
  const slot = useContext(VerdictSlot153), taken = slot?.taken;
  useLayoutEffect(() => shown && taken ? taken() : undefined, [shown, taken]);
  return shown ? slot?.node ?? null : null;
};
