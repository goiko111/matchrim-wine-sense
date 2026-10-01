import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('matchrim-native-platform')
}

createRoot(document.getElementById("root")!).render(<App />);
