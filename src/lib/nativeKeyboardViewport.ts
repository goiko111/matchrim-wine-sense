import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export const installNativeKeyboardViewport = () => {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === 'ios') void Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);
  let pageScrollBeforeKeyboard = 0;
  const root = document.documentElement;
  const show = () => {
    if (!root.classList.contains('matchrim-keyboard-visible')) pageScrollBeforeKeyboard = window.scrollY;
    root.classList.add('matchrim-keyboard-visible');
  };
  const hide = () => {
    root.classList.remove('matchrim-keyboard-visible');
    // WebKit's focus pan can survive dismissal even after the native frame is restored.
    requestAnimationFrame(() => window.scrollTo({ top: pageScrollBeforeKeyboard, behavior: 'instant' }));
  };
  void Keyboard.addListener('keyboardWillShow', show).catch(() => undefined);
  void Keyboard.addListener('keyboardDidHide', hide).catch(() => undefined);
};
