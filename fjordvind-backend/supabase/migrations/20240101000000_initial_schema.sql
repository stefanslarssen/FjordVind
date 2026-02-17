-- Lusevokteren Database Schema
-- Initial migration for sea lice counting application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cages table (merder)
CREATE TABLE cages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  cage_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, cage_number)
);

-- Lice counts table
CREATE TABLE lice_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  cage_id TEXT NOT NULL,
  date DATE NOT NULL,
  fish_examined INTEGER NOT NULL CHECK (fish_examined > 0),
  mobile_lice INTEGER NOT NULL DEFAULT 0 CHECK (mobile_lice >= 0),
  attached_lice INTEGER NOT NULL DEFAULT 0 CHECK (attached_lice >= 0),
  adult_female_lice INTEGER NOT NULL DEFAULT 0 CHECK (adult_female_lice >= 0),
  image_path TEXT,
  voice_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_lice_counts_location ON lice_counts(location_id);
CREATE INDEX idx_lice_counts_date ON lice_counts(date DESC);
CREATE INDEX idx_lice_counts_cage ON lice_counts(cage_id);
CREATE INDEX idx_cages_location ON cages(location_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cages_updated_at
  BEFORE UPDATE ON cages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lice_counts_updated_at
  BEFORE UPDATE ON lice_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lice_counts ENABLE ROW LEVEL SECURITY;

-- Public read access (for MVP - can be restricted later)
CREATE POLICY "Allow public read access on locations"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on cages"
  ON cages FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on lice_counts"
  ON lice_counts FOR SELECT
  USING (true);

-- Public insert access (for MVP - mobile app sync)
CREATE POLICY "Allow public insert on locations"
  ON locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public insert on cages"
  ON cages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public insert on lice_counts"
  ON lice_counts FOR INSERT
  WITH CHECK (true);

-- Public update access
CREATE POLICY "Allow public update on lice_counts"
  ON lice_counts FOR UPDATE
  USING (true);

-- Insert some sample data
INSERT INTO locations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden'),
  ('22222222-2222-2222-2222-222222222222', 'Hardangerfjorden'),
  ('33333333-3333-3333-3333-333333333333', 'Sognefjorden');

INSERT INTO cages (location_id, cage_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'A1'),
  ('11111111-1111-1111-1111-111111111111', 'A2'),
  ('11111111-1111-1111-1111-111111111111', 'B1'),
  ('22222222-2222-2222-2222-222222222222', 'M1'),
  ('22222222-2222-2222-2222-222222222222', 'M2'),
  ('33333333-3333-3333-3333-333333333333', 'K1');
