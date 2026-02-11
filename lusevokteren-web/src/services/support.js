/**
 * Support Service
 * Handles support ticket operations
 */

import { supabase } from './supabase'

/**
 * Create a new support ticket
 */
export async function createTicket({ type, priority, subject, description, email }) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user?.id || null,
      email: email || user?.email,
      type,
      priority: priority || 'medium',
      subject,
      description,
      status: 'open'
    })
    .select()
    .single()

  if (error) throw error

  // Send notification email (via Edge Function)
  try {
    await supabase.functions.invoke('send-support-notification', {
      body: { ticketId: data.id, type, priority, subject }
    })
  } catch (e) {
    console.warn('Failed to send notification:', e)
  }

  return data
}

/**
 * Get tickets for current user
 */
export async function getMyTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single ticket with comments
 */
export async function getTicket(ticketId) {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (ticketError) throw ticketError

  const { data: comments, error: commentsError } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (commentsError) throw commentsError

  return { ...ticket, comments }
}

/**
 * Add a comment to a ticket
 */
export async function addComment(ticketId, content) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      user_id: user?.id,
      content,
      is_internal: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update ticket status (user can only close their own tickets)
 */
export async function updateTicketStatus(ticketId, status) {
  const updates = { status }

  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Admin functions

/**
 * Get all tickets (admin only)
 */
export async function getAllTickets(filters = {}) {
  let query = supabase
    .from('support_tickets')
    .select('*, users:user_id(full_name, email)')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

/**
 * Get support statistics (admin only)
 */
export async function getSupportStats() {
  const { data, error } = await supabase
    .from('support_stats')
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Assign ticket to admin (admin only)
 */
export async function assignTicket(ticketId, adminUserId) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({
      assigned_to: adminUserId,
      status: 'in_progress'
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Add internal note (admin only)
 */
export async function addInternalNote(ticketId, content) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      user_id: user?.id,
      content,
      is_internal: true
    })
    .select()
    .single()

  if (error) throw error
  return data
}
