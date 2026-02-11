// FjordVind Native Push Notifications
// Handles push notifications for iOS and Android via Capacitor

import { isNative, isPluginAvailable, isIOS, isAndroid } from './capacitor'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Check if native push is available
export function isNativePushSupported() {
  return isNative && isPluginAvailable('PushNotifications')
}

// Request permission for push notifications
export async function requestNativePushPermission() {
  if (!isNativePushSupported()) {
    return { receive: 'unsupported', display: 'unsupported' }
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.requestPermissions()
    return result
  } catch (err) {
    console.error('Failed to request push permission:', err)
    return { receive: 'denied', display: 'denied' }
  }
}

// Check current permission status
export async function checkNativePushPermission() {
  if (!isNativePushSupported()) {
    return { receive: 'unsupported', display: 'unsupported' }
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    return await PushNotifications.checkPermissions()
  } catch (err) {
    console.error('Failed to check push permission:', err)
    return { receive: 'denied', display: 'denied' }
  }
}

// Register for push notifications
export async function registerNativePush() {
  if (!isNativePushSupported()) {
    throw new Error('Native push notifications not supported')
  }

  const { PushNotifications } = await import('@capacitor/push-notifications')

  // Request permission first
  const permission = await requestNativePushPermission()
  if (permission.receive !== 'granted') {
    throw new Error('Push notification permission denied')
  }

  // Register with the native push service
  await PushNotifications.register()

  return new Promise((resolve, reject) => {
    // Listen for registration success
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success:', token.value)

      // Send token to our server
      try {
        const response = await fetch(`${API_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            subscription: {
              endpoint: `native:${isIOS ? 'ios' : 'android'}:${token.value}`,
              keys: {
                platform: isIOS ? 'ios' : 'android',
                token: token.value
              }
            }
          })
        })

        if (!response.ok) {
          throw new Error('Failed to register token with server')
        }

        resolve({ token: token.value })
      } catch (err) {
        reject(err)
      }
    })

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error)
      reject(new Error(error.error || 'Registration failed'))
    })
  })
}

// Set up push notification listeners
export async function setupNativePushListeners(handlers = {}) {
  if (!isNativePushSupported()) return () => {}

  const { PushNotifications } = await import('@capacitor/push-notifications')
  const listeners = []

  // Notification received while app is in foreground
  if (handlers.onNotificationReceived) {
    const listener = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push notification received:', notification)
        handlers.onNotificationReceived({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data
        })
      }
    )
    listeners.push(listener)
  }

  // Notification tapped by user
  if (handlers.onNotificationTapped) {
    const listener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('Push notification action:', action)
        handlers.onNotificationTapped({
          actionId: action.actionId,
          notification: {
            id: action.notification.id,
            title: action.notification.title,
            body: action.notification.body,
            data: action.notification.data
          }
        })
      }
    )
    listeners.push(listener)
  }

  // Return cleanup function
  return () => {
    listeners.forEach(listener => listener.remove())
  }
}

// Unregister from push notifications
export async function unregisterNativePush() {
  if (!isNativePushSupported()) return false

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Get stored token to unregister from server
    // Note: The token needs to be stored locally when registered
    const storedToken = localStorage.getItem('pushToken')

    if (storedToken) {
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: `native:${isIOS ? 'ios' : 'android'}:${storedToken}`
        })
      })
      localStorage.removeItem('pushToken')
    }

    await PushNotifications.removeAllListeners()
    return true
  } catch (err) {
    console.error('Failed to unregister push:', err)
    return false
  }
}

// Get delivered notifications (shown in notification center)
export async function getDeliveredNotifications() {
  if (!isNativePushSupported()) return []

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.getDeliveredNotifications()
    return result.notifications || []
  } catch (err) {
    console.error('Failed to get delivered notifications:', err)
    return []
  }
}

// Remove specific notifications from notification center
export async function removeDeliveredNotifications(ids) {
  if (!isNativePushSupported()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeDeliveredNotifications({ notifications: ids.map(id => ({ id })) })
  } catch (err) {
    console.error('Failed to remove notifications:', err)
  }
}

// Remove all notifications from notification center
export async function removeAllDeliveredNotifications() {
  if (!isNativePushSupported()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllDeliveredNotifications()
  } catch (err) {
    console.error('Failed to remove all notifications:', err)
  }
}

// Create notification channels (Android only)
export async function createNotificationChannels() {
  if (!isAndroid || !isNativePushSupported()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Critical alerts channel
    await PushNotifications.createChannel({
      id: 'critical_alerts',
      name: 'Kritiske varsler',
      description: 'Varsler om kritiske lusenivåer og akutte situasjoner',
      importance: 5, // Max importance
      visibility: 1, // Public
      sound: 'default',
      vibration: true,
      lights: true
    })

    // Warning alerts channel
    await PushNotifications.createChannel({
      id: 'warning_alerts',
      name: 'Advarsler',
      description: 'Advarsler om lusenivåer som nærmer seg grenseverdier',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true
    })

    // Daily summary channel
    await PushNotifications.createChannel({
      id: 'daily_summary',
      name: 'Daglige oppsummeringer',
      description: 'Daglige oppsummeringer av lusetall',
      importance: 3,
      visibility: 0, // Private
      sound: 'default'
    })

    // General notifications channel
    await PushNotifications.createChannel({
      id: 'general',
      name: 'Generelle varsler',
      description: 'Andre varsler og meldinger',
      importance: 3,
      visibility: 0
    })

    console.log('Notification channels created')
  } catch (err) {
    console.error('Failed to create notification channels:', err)
  }
}
