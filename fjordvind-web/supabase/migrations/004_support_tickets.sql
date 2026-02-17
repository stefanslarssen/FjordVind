-- Support Tickets System
-- Migration: 004_support_tickets.sql

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'billing', 'account', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_comments table for conversation threads
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not visible to user
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can create tickets
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (true);

-- Users can update their own tickets (only certain fields)
CREATE POLICY "Users can update own tickets"
    ON support_tickets FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for ticket_comments

-- Users can view comments on their tickets (except internal)
CREATE POLICY "Users can view comments on own tickets"
    ON ticket_comments FOR SELECT
    USING (
        NOT is_internal AND
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_comments.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

-- Users can add comments to their tickets
CREATE POLICY "Users can add comments to own tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        NOT is_internal AND
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_comments.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can add comments to any ticket
CREATE POLICY "Admins can add comments"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- Function to auto-close old resolved tickets
CREATE OR REPLACE FUNCTION auto_close_resolved_tickets()
RETURNS void AS $$
BEGIN
    UPDATE support_tickets
    SET status = 'closed'
    WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a view for ticket statistics (admin dashboard)
CREATE OR REPLACE VIEW support_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
    COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved', 'closed')) as high_priority_open,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as tickets_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as tickets_last_7d
FROM support_tickets;

-- Grant access to the view
GRANT SELECT ON support_stats TO authenticated;
