import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export const installNativeKeyboardViewport = () => {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === 'ios') void Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);
  let pageScrollBeforeKeyboard = 0;
  let pagePathBeforeKeyboard = window.location.pathname;
  let generation = 0;
  let restoreFrame: number | null = null;
  let revealFrame: number | null = null;
  const root = document.documentElement;
  const authField = () => {
    const field = document.activeElement;
    return Capacitor.getPlatform() === 'ios' && root.classList.contains('matchrim-keyboard-visible')
      && field?.matches('input:not([type="button"]):not([type="submit"]), textarea')
      && field.closest('.matchrim-native-auth') ? field : null;
  };
  const revealAuthField = () => {
    if (!authField()) return;
    if (revealFrame !== null) cancelAnimationFrame(revealFrame);
    revealFrame = requestAnimationFrame(() => {
      revealFrame = null;
      const field = authField();
      if (!field) return;
      const viewport = window.visualViewport;
      const safeTop = parseFloat(getComputedStyle(root).getPropertyValue('--matchrim-native-safe-top')) || 0;
      const top = Math.max(viewport?.offsetTop ?? 0, safeTop);
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      const bounds = field.getBoundingClientRect();
      const inset = Math.min(8, Math.max(0, (bottom - top - bounds.height) / 2));
      if (bottom <= top) return;
      // Reconcile WebKit's post-rotation focus pan without refocusing or moving the caret.
      if (bounds.top < top + inset) window.scrollBy({ top: bounds.top - top - inset, behavior: 'instant' });
      else if (bounds.bottom > bottom - inset) window.scrollBy({ top: bounds.bottom - bottom + inset, behavior: 'instant' });
    });
  };
  type Observation = {
    event: 'show' | 'hide' | 'resize' | 'orientationchange' | 'focusin' | 'focusout' | 'input' | 'restore' | 'restore-skipped';
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
    revealAuthField();
  };
  const hide = () => {
    cancelRestore();
    root.classList.remove('matchrim-keyboard-visible');
    if (revealFrame !== null) cancelAnimationFrame(revealFrame);
    revealFrame = null;
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
  for (const event of ['resize', 'orientationchange', 'focusin', 'focusout', 'input'] as const) {
    window.addEventListener(event, () => { observe(event); revealAuthField(); }, { passive: true });
  }
  window.visualViewport?.addEventListener('resize', revealAuthField, { passive: true });
  window.visualViewport?.addEventListener('scroll', revealAuthField, { passive: true });
  void Keyboard.addListener('keyboardWillShow', show).catch(() => undefined);
  void Keyboard.addListener('keyboardDidShow', revealAuthField).catch(() => undefined);
  void Keyboard.addListener('keyboardDidHide', hide).catch(() => undefined);
};
