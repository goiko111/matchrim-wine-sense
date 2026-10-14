import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'
import { installNativeKeyboardViewport } from './lib/nativeKeyboardViewport'

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('matchrim-native-platform')
  installNativeKeyboardViewport()
}

createRoot(document.getElementById("root")!).render(<App />);
