import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export const installNativeKeyboardViewport = () => {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === 'ios') void Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);
  let pageScrollBeforeKeyboard = 0;
  let pagePathBeforeKeyboard = window.location.pathname;
  let generation = 0;
  let restoreFrame: number | null = null;
  const root = document.documentElement;
  type Observation = {
    event: 'show' | 'hide' | 'resize' | 'orientationchange' | 'focusin' | 'focusout' | 'restore' | 'restore-skipped';
    nativeEventVisible: boolean;
    editableFocused: boolean;
    width: number;
    height: number;
  };
  const observations: Observation[] = [];
  const observe = (event: Observation['event']) => {
    observations.push({
      event,
      nativeEventVisible: root.classList.contains('matchrim-keyboard-visible'),
      editableFocused: Boolean(document.activeElement?.matches(
        'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
      )),
      width: window.innerWidth,
      height: window.innerHeight,
    });
    if (observations.length > 8) observations.shift();
    // Ephemeral native-only diagnostics; never retain input values, identity or URLs.
    root.setAttribute('data-matchrim-keyboard-viewport', JSON.stringify({ version: 1, events: observations }));
  };
  const cancelRestore = () => {
    generation += 1;
    if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  };
  const show = () => {
    cancelRestore();
    if (!root.classList.contains('matchrim-keyboard-visible')) {
      pageScrollBeforeKeyboard = window.scrollY;
      pagePathBeforeKeyboard = window.location.pathname;
    }
    root.classList.add('matchrim-keyboard-visible');
    observe('show');
  };
  const hide = () => {
    cancelRestore();
    root.classList.remove('matchrim-keyboard-visible');
    observe('hide');
    const hiddenGeneration = generation;
    // WebKit's focus pan can survive dismissal even after the native frame is restored.
    restoreFrame = requestAnimationFrame(() => {
      if (hiddenGeneration !== generation || root.classList.contains('matchrim-keyboard-visible')) return;
      restoreFrame = null;
      if (window.location.pathname !== pagePathBeforeKeyboard) {
        observe('restore-skipped');
        return;
      }
      window.scrollTo({ top: pageScrollBeforeKeyboard, behavior: 'instant' });
      observe('restore');
    });
  };
  for (const event of ['resize', 'orientationchange', 'focusin', 'focusout'] as const) {
    window.addEventListener(event, () => observe(event), { passive: true });
  }
  void Keyboard.addListener('keyboardWillShow', show).catch(() => undefined);
  void Keyboard.addListener('keyboardDidHide', hide).catch(() => undefined);
};
