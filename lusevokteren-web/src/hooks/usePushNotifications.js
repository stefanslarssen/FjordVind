// FjordVind Push Notifications Hook
// Unified hook for both web and native push notifications

import { useState, useEffect, useCallback } from 'react'
import { isNative } from '../utils/capacitor'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getPushStatus as getWebPushStatus,
  requestNotificationPermission
} from '../utils/pushNotifications'
import {
  isNativePushSupported,
  registerNativePush,
  unregisterNativePush,
  setupNativePushListeners,
  checkNativePushPermission,
  createNotificationChannels
} from '../utils/nativePush'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Determine which push system to use
  const useNative = isNative && isNativePushSupported()

  // Check initial status
  useEffect(() => {
    async function checkStatus() {
      setLoading(true)
      setError(null)

      try {
        if (useNative) {
          // Native push
          setIsSupported(true)
          const permStatus = await checkNativePushPermission()
          setPermission(permStatus.receive)
          setIsSubscribed(permStatus.receive === 'granted')

          // Create notification channels on Android
          await createNotificationChannels()
        } else if (isPushSupported()) {
          // Web push
          setIsSupported(true)
          const status = await getWebPushStatus()
          setIsSubscribed(status.isSubscribed)
          setPermission(Notification.permission)
        } else {
          setIsSupported(false)
        }
      } catch (err) {
        console.error('Failed to check push status:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [useNative])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (useNative) {
        // Native push registration
        const result = await registerNativePush()
        localStorage.setItem('pushToken', result.token)
        setIsSubscribed(true)
        setPermission('granted')
        return result
      } else {
        // Web push registration
        const result = await subscribeToPush()
        setIsSubscribed(true)
        setPermission('granted')
        return result
      }
    } catch (err) {
      console.error('Failed to subscribe to push:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [useNative])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (useNative) {
        await unregisterNativePush()
      } else {
        await unsubscribeFromPush()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('Failed to unsubscribe from push:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [useNative])

  // Request permission only (without subscribing)
  const requestPermission = useCallback(async () => {
    try {
      if (useNative) {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const result = await PushNotifications.requestPermissions()
        setPermission(result.receive)
        return result.receive
      } else {
        const result = await requestNotificationPermission()
        setPermission(result)
        return result
      }
    } catch (err) {
      console.error('Failed to request permission:', err)
      setError(err.message)
      return 'denied'
    }
  }, [useNative])

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test notification')
      }

      return data
    } catch (err) {
      console.error('Failed to send test notification:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // State
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    isNative: useNative,

    // Actions
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification
  }
}

// Hook for handling incoming notifications (foreground)
export function useNotificationHandler(handlers = {}) {
  useEffect(() => {
    if (!isNative || !isNativePushSupported()) {
      return
    }

    let cleanup = () => {}

    setupNativePushListeners(handlers).then(cleanupFn => {
      cleanup = cleanupFn
    })

    return () => {
      cleanup()
    }
  }, [handlers])
}

export default usePushNotifications
