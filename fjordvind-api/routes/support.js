const express = require('express')
const router = express.Router()

// In-memory storage for demo (replace with database in production)
const supportTickets = []

// POST /api/support - Create support ticket
router.post('/', (req, res) => {
  try {
    const { type, subject, message, priority, user_email, user_name, timestamp } = req.body

    if (!subject || !message) {
      return res.status(400).json({ error: 'Emne og melding er påkrevd' })
    }

    const ticket = {
      id: `TICKET-${Date.now()}`,
      type: type || 'question',
      subject,
      message,
      priority: priority || 'normal',
      user_email,
      user_name,
      timestamp: timestamp || new Date().toISOString(),
      status: 'open'
    }

    supportTickets.push(ticket)

    console.log('New support ticket created:', ticket.id, '-', subject)

    res.status(201).json({
      success: true,
      ticket_id: ticket.id,
      message: 'Din henvendelse er mottatt. Vi svarer vanligvis innen 24 timer.'
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    res.status(500).json({ error: 'Kunne ikke opprette support-sak' })
  }
})

// GET /api/support - Get all tickets (admin only)
router.get('/', (req, res) => {
  res.json(supportTickets)
})

// GET /api/support/:id - Get single ticket
router.get('/:id', (req, res) => {
  const ticket = supportTickets.find(t => t.id === req.params.id)
  if (!ticket) {
    return res.status(404).json({ error: 'Support-sak ikke funnet' })
  }
  res.json(ticket)
})

module.exports = router
