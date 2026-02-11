/**
 * Crisp Live Chat Integration
 *
 * To enable:
 * 1. Create account at crisp.chat
 * 2. Add VITE_CRISP_WEBSITE_ID to .env
 * 3. Import this component in App.jsx
 */

import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function CrispChat() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID

    // Skip if no website ID configured
    if (!websiteId) {
      return
    }

    // Initialize Crisp
    window.$crisp = []
    window.CRISP_WEBSITE_ID = websiteId

    // Load Crisp script
    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)

    // Cleanup on unmount
    return () => {
      delete window.$crisp
      delete window.CRISP_WEBSITE_ID
      const existingScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  // Set user data when authenticated
  useEffect(() => {
    if (!window.$crisp) return

    if (isAuthenticated && user) {
      // Set user info
      window.$crisp.push(['set', 'user:email', user.email])

      if (user.full_name) {
        window.$crisp.push(['set', 'user:nickname', user.full_name])
      }

      // Set custom data
      window.$crisp.push(['set', 'session:data', [
        ['user_id', user.id],
        ['role', user.role || 'user'],
        ['plan', user.subscription_plan || 'free']
      ]])
    } else {
      // Reset for logged out users
      window.$crisp.push(['do', 'session:reset'])
    }
  }, [isAuthenticated, user])

  // Component doesn't render anything - Crisp handles its own UI
  return null
}

/**
 * Helper functions to control Crisp chat programmatically
 */
export const crispHelpers = {
  // Open chat window
  open: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:open'])
    }
  },

  // Close chat window
  close: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:close'])
    }
  },

  // Show chat widget
  show: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:show'])
    }
  },

  // Hide chat widget
  hide: () => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'chat:hide'])
    }
  },

  // Send a message from the user
  sendMessage: (message) => {
    if (window.$crisp) {
      window.$crisp.push(['do', 'message:send', ['text', message]])
    }
  },

  // Set user email
  setEmail: (email) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'user:email', email])
    }
  },

  // Set user name
  setName: (name) => {
    if (window.$crisp) {
      window.$crisp.push(['set', 'user:nickname', name])
    }
  }
}
