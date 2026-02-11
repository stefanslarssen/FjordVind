-- Lusevokteren Database Schema v4
-- Utvider merds-tabellen med dashboard-kolonner

-- ============================================
-- EXTEND MERDS TABLE
-- ============================================

-- Add new columns for dashboard stats
ALTER TABLE merds ADD COLUMN IF NOT EXISTS fish_count INTEGER DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS biomass_kg DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS avg_weight_grams DECIMAL(8, 2) DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS welfare_score VARCHAR(1) CHECK (welfare_score IN ('A', 'B', 'C', 'D'));
ALTER TABLE merds ADD COLUMN IF NOT EXISTS mortality_rate_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS growth_rate_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS feed_storage_kg DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS feed_type VARCHAR(50);
ALTER TABLE merds ADD COLUMN IF NOT EXISTS temperature_celsius DECIMAL(4, 2);
ALTER TABLE merds ADD COLUMN IF NOT EXISTS oxygen_percent DECIMAL(5, 2);
ALTER TABLE merds ADD COLUMN IF NOT EXISTS lice_level VARCHAR(10) CHECK (lice_level IN ('OK', 'WARNING', 'DANGER'));
ALTER TABLE merds ADD COLUMN IF NOT EXISTS status_color VARCHAR(20);

COMMENT ON COLUMN merds.fish_count IS 'Total antall fisk i merden';
COMMENT ON COLUMN merds.biomass_kg IS 'Total biomasse i kg';
COMMENT ON COLUMN merds.avg_weight_grams IS 'Gjennomsnittsvekt per fisk i gram';
COMMENT ON COLUMN merds.welfare_score IS 'Velferdsscore A-D';
COMMENT ON COLUMN merds.mortality_rate_percent IS 'Dodelighetsrate i prosent';
COMMENT ON COLUMN merds.growth_rate_percent IS 'Vekstrate i prosent';
COMMENT ON COLUMN merds.feed_storage_kg IS 'For-lager i kg';
COMMENT ON COLUMN merds.feed_type IS 'Type for';
COMMENT ON COLUMN merds.lice_level IS 'Luseniva status';

-- ============================================
-- UPDATE SAMPLE DATA WITH DASHBOARD VALUES
-- ============================================

UPDATE merds SET
  fish_count = 243950,
  biomass_kg = 147300,
  avg_weight_grams = 604,
  welfare_score = 'A',
  mortality_rate_percent = 1.2,
  growth_rate_percent = 18.5,
  feed_storage_kg = 20125,
  feed_type = 'Premium Polar',
  temperature_celsius = 8.2,
  oxygen_percent = 92,
  lice_level = 'WARNING',
  status_color = 'amber'
WHERE merd_id = 'NF-A1';

UPDATE merds SET
  fish_count = 244100,
  biomass_kg = 147400,
  avg_weight_grams = 603,
  welfare_score = 'A',
  mortality_rate_percent = 0.9,
  growth_rate_percent = 21.2,
  feed_storage_kg = 18651,
  feed_type = 'Premium Polar',
  temperature_celsius = 8.1,
  oxygen_percent = 94,
  lice_level = 'OK',
  status_color = 'green'
WHERE merd_id = 'NF-A2';

UPDATE merds SET
  fish_count = 243700,
  biomass_kg = 147200,
  avg_weight_grams = 605,
  welfare_score = 'A',
  mortality_rate_percent = 1.1,
  growth_rate_percent = 19.8,
  feed_storage_kg = 8231,
  feed_type = 'Silva',
  temperature_celsius = 8.3,
  oxygen_percent = 91,
  lice_level = 'OK',
  status_color = 'green'
WHERE merd_id = 'NF-B1';

UPDATE merds SET
  fish_count = 244200,
  biomass_kg = 147500,
  avg_weight_grams = 603,
  welfare_score = 'B',
  mortality_rate_percent = 1.5,
  growth_rate_percent = 16.2,
  feed_storage_kg = 18894,
  feed_type = 'Triplo',
  temperature_celsius = 7.8,
  oxygen_percent = 89,
  lice_level = 'WARNING',
  status_color = 'amber'
WHERE merd_id = 'HF-M1';

UPDATE merds SET
  fish_count = 243500,
  biomass_kg = 147100,
  avg_weight_grams = 605,
  welfare_score = 'A',
  mortality_rate_percent = 0.8,
  growth_rate_percent = 22.1,
  feed_storage_kg = 19265,
  feed_type = 'Rapid',
  temperature_celsius = 7.9,
  oxygen_percent = 88,
  lice_level = 'OK',
  status_color = 'green'
WHERE merd_id = 'HF-M2';

-- ============================================
-- INSERT ADDITIONAL MERDS FOR FULLER DASHBOARD
-- ============================================

INSERT INTO merds (id, merd_id, lokalitet, lokalitetsnummer, navn, fish_count, biomass_kg, avg_weight_grams, welfare_score, mortality_rate_percent, growth_rate_percent, feed_storage_kg, feed_type, temperature_celsius, oxygen_percent, lice_level, status_color) VALUES
  ('66666666-6666-6666-6666-666666666666', 'NF-B2', 'Nordfjorden', '12345', 'Merd B2', 244000, 147400, 604, 'A', 1.0, 20.5, 15000, 'Premium Polar', 8.2, 93, 'OK', 'green'),
  ('77777777-7777-7777-7777-777777777777', 'NF-C1', 'Nordfjorden', '12345', 'Merd C1', 243800, 147200, 604.5, 'A', 0.95, 19.2, 12500, 'Silva', 8.1, 92, 'OK', 'green')
ON CONFLICT (merd_id) DO UPDATE SET
  fish_count = EXCLUDED.fish_count,
  biomass_kg = EXCLUDED.biomass_kg,
  avg_weight_grams = EXCLUDED.avg_weight_grams,
  welfare_score = EXCLUDED.welfare_score,
  mortality_rate_percent = EXCLUDED.mortality_rate_percent,
  growth_rate_percent = EXCLUDED.growth_rate_percent,
  feed_storage_kg = EXCLUDED.feed_storage_kg,
  feed_type = EXCLUDED.feed_type,
  temperature_celsius = EXCLUDED.temperature_celsius,
  oxygen_percent = EXCLUDED.oxygen_percent,
  lice_level = EXCLUDED.lice_level,
  status_color = EXCLUDED.status_color;
