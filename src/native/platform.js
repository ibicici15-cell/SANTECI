import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

// true quand l'app tourne dans l'APK Android / iOS (Capacitor).
export function isNative() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

// Pour prévisualiser l'apparence "app" dans Chrome : ouvrir le site avec
// ?app=1 (mémorisé pour la session) — ?app=0 pour revenir à la version web.
function previewFlag() {
  try {
    const q = new URLSearchParams(window.location.search).get('app')
    if (q === '1') sessionStorage.setItem('appShell', '1')
    if (q === '0') sessionStorage.removeItem('appShell')
    return sessionStorage.getItem('appShell') === '1'
  } catch { return false }
}

function isStandalonePwa() {
  try { return window.matchMedia('(display-mode: standalone)').matches } catch { return false }
}

// Mode "application" : barre du haut compacte + barre d'onglets en bas,
// sans footer de site web.
export function isAppShell() {
  return isNative() || isStandalonePwa() || previewFlag()
}

export function useAppShell() {
  const [shell] = useState(isAppShell)
  useEffect(() => {
    document.documentElement.classList.toggle('app-shell', shell)
  }, [shell])
  return shell
}
