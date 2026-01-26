// FjordVind Push Notifications - Browser push notification handling

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Check if push notifications are supported
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Subscribe to push notifications
export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  const registration = await navigator.serviceWorker.ready

  // Get existing subscription or create new one
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    // Create new subscription
    // In production, you need a VAPID public key from your server
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // In production, use your VAPID public key:
      // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
  }

  // Send subscription to server
  const response = await fetch(`${API_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userId
    })
  })

  if (!response.ok) {
    throw new Error('Failed to subscribe on server')
  }

  const data = await response.json()
  return {
    subscriptionId: data.subscriptionId,
    subscription
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush() {
  if (!isPushSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // Unsubscribe locally
    await subscription.unsubscribe()

    // Notify server
    await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })
  }

  return true
}

// Check push subscription status
export async function getPushStatus(userId) {
  if (!isPushSupported()) {
    return { supported: false, isSubscribed: false }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return { supported: true, isSubscribed: false }
  }

  // Verify with server
  try {
    const response = await fetch(
      `${API_URL}/api/push/status?endpoint=${encodeURIComponent(subscription.endpoint)}`
    )
    const data = await response.json()
    return {
      supported: true,
      isSubscribed: data.isSubscribed,
      subscriptionId: data.subscriptionId
    }
  } catch (err) {
    console.error('Failed to check push status:', err)
    return { supported: true, isSubscribed: false }
  }
}

// Show local notification (for testing or offline use)
export function showLocalNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false
  }

  new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    ...options
  })

  return true
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
