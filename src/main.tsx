/**
 * Application Entry Point
 * 
 * Initializes the React application with security and performance optimizations:
 * - Environment validation
 * - Secure logging
 * - Font loading optimization
 * - Asset caching
 * - Performance monitoring
 */

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n';
import productionConsole from './lib/production-console';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';


// Standardize logging across app (dev logs enabled, prod no-ops)
try {
  Object.assign((window as any).console, productionConsole);
} catch (_e) {
  // ignore
}

// Lock screen orientation to portrait on native (Capacitor)
try {
  if (Capacitor.getPlatform() !== 'web') {
    ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }
} catch (_e) {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);


