/**
 * Stripe Payment Service
 * Handles subscription payments for FjordVind
 */

import { supabase } from './supabase'

// Stripe Price IDs - Må opprettes i Stripe Dashboard
// Gå til: https://dashboard.stripe.com/products
const STRIPE_PRICES = {
  basic: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
    yearly: import.meta.env.VITE_STRIPE_PRICE_BASIC_YEARLY || 'price_basic_yearly',
  },
  professional: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  },
}

/**
 * Create a Stripe Checkout session for subscription
 * Uses Supabase Edge Function to securely create the session
 */
export async function createCheckoutSession(planId, billingPeriod, successUrl, cancelUrl) {
  const priceId = STRIPE_PRICES[planId]?.[billingPeriod]

  if (!priceId || priceId.startsWith('price_')) {
    throw new Error('Ugyldig plan eller pris ikke konfigurert')
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Du må være innlogget for å velge abonnement')
  }

  // Call Supabase Edge Function to create checkout session
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      userId: user.id,
      email: user.email,
      successUrl: successUrl || `${window.location.origin}/innstillinger?payment=success`,
      cancelUrl: cancelUrl || `${window.location.origin}/priser?payment=cancelled`,
    },
  })

  if (error) {
    console.error('Checkout session error:', error)
    throw new Error('Kunne ikke starte betalingsprosessen')
  }

  return data
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(planId, billingPeriod) {
  const session = await createCheckoutSession(planId, billingPeriod)

  if (session?.url) {
    window.location.href = session.url
  } else {
    throw new Error('Ingen checkout-URL mottatt')
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(returnUrl) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Du må være innlogget')
  }

  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {
      userId: user.id,
      returnUrl: returnUrl || `${window.location.origin}/innstillinger`,
    },
  })

  if (error) {
    console.error('Portal session error:', error)
    throw new Error('Kunne ikke åpne abonnementsoversikten')
  }

  return data
}

/**
 * Redirect to Stripe Customer Portal
 */
export async function redirectToPortal(returnUrl) {
  const session = await createPortalSession(returnUrl)

  if (session?.url) {
    window.location.href = session.url
  } else {
    throw new Error('Ingen portal-URL mottatt')
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Subscription fetch error:', error)
  }

  return data
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription() {
  const subscription = await getSubscriptionStatus()

  if (!subscription) return false

  const activeStatuses = ['active', 'trialing']
  return activeStatuses.includes(subscription.status)
}

/**
 * Get subscription plan details
 */
export async function getSubscriptionPlan() {
  const subscription = await getSubscriptionStatus()

  if (!subscription) {
    return { plan: 'free', status: 'none' }
  }

  return {
    plan: subscription.plan_id || 'unknown',
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}
