// FjordVind Capacitor Utilities
// Platform detection and native feature handling

import { Capacitor } from '@capacitor/core'

// Platform detection
export const isNative = Capacitor.isNativePlatform()
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isIOS = Capacitor.getPlatform() === 'ios'
export const isWeb = Capacitor.getPlatform() === 'web'

// Get current platform
export function getPlatform() {
  return Capacitor.getPlatform()
}

// Check if a plugin is available
export function isPluginAvailable(pluginName) {
  return Capacitor.isPluginAvailable(pluginName)
}

// Get app info (useful for about pages and debugging)
export async function getAppInfo() {
  if (!isNative) {
    return {
      name: 'FjordVind',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      build: import.meta.env.VITE_APP_BUILD || '1',
      platform: 'web'
    }
  }

  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return {
      name: info.name,
      version: info.version,
      build: info.build,
      platform: getPlatform()
    }
  } catch (err) {
    console.error('Failed to get app info:', err)
    return {
      name: 'FjordVind',
      version: '1.0.0',
      build: '1',
      platform: getPlatform()
    }
  }
}

// Exit app (Android only, iOS doesn't allow programmatic exit)
export async function exitApp() {
  if (isAndroid) {
    try {
      const { App } = await import('@capacitor/app')
      await App.exitApp()
    } catch (err) {
      console.error('Failed to exit app:', err)
    }
  }
}

// Handle back button (Android)
export function setupBackButtonHandler(callback) {
  if (!isNative) return () => {}

  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      callback(canGoBack)
    })
  })

  return () => {
    import('@capacitor/app').then(({ App }) => {
      App.removeAllListeners()
    })
  }
}

// Handle app state changes
export function onAppStateChange(callback) {
  if (!isNative) return () => {}

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', callback)
  })

  return () => {
    import('@capacitor/app').then(({ App }) => {
      App.removeAllListeners()
    })
  }
}

// Safe area insets (for notched devices)
export function getSafeAreaInsets() {
  if (typeof CSS !== 'undefined' && CSS.supports('padding-top: env(safe-area-inset-top)')) {
    return {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0')
    }
  }
  return { top: 0, bottom: 0, left: 0, right: 0 }
}

// Status bar styling
export async function setStatusBarStyle(style = 'dark') {
  if (!isNative || !isPluginAvailable('StatusBar')) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light })

    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0f172a' })
    }
  } catch (err) {
    console.error('Failed to set status bar style:', err)
  }
}

// Hide splash screen when app is ready
export async function hideSplashScreen() {
  if (!isNative || !isPluginAvailable('SplashScreen')) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (err) {
    console.error('Failed to hide splash screen:', err)
  }
}

// Initialize native features when app starts
export async function initializeNativeFeatures() {
  if (!isNative) return

  // Set status bar style
  await setStatusBarStyle('dark')

  // Hide splash screen after a short delay
  setTimeout(async () => {
    await hideSplashScreen()
  }, 500)
}
