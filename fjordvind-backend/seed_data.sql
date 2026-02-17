-- ========================================
-- LUSEVOKTEREN - REALISTISK TESTDATA
-- Genererer 90 dager med tellinger
-- ========================================

-- Slett eksisterende testdata først
DELETE FROM fish_observations;
DELETE FROM samples;
DELETE FROM compliance_log;

-- ========================================
-- SAMPLES - 90 tellinger over 3 måneder
-- ========================================

-- Nordfjord - Merd A1 (15 tellinger)
INSERT INTO samples (id, sample_id, merd_id, røkter_id, dato, tidspunkt, antall_fisk, temperatur, synced, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAMPLE-2024-001', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-10-23', '09:30', 20, 8.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-002', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-10-26', '10:15', 20, 8.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-003', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-10-30', '11:00', 20, 8.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-004', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-02', '09:45', 20, 9.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-005', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-05', '10:30', 20, 9.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-006', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-09', '08:50', 20, 10.1, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-007', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-12', '09:20', 20, 10.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-008', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-16', '10:40', 20, 9.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-009', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-19', '11:10', 20, 9.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-010', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-23', '09:35', 20, 9.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-011', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-26', '10:05', 20, 8.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-012', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-30', '08:45', 20, 8.4, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-013', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-03', '09:55', 20, 8.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-014', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-12-07', '10:25', 20, 7.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-015', (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-10', '11:15', 20, 7.5, 1, NOW(), NOW());

-- Nordfjord - Merd A2 (15 tellinger)
INSERT INTO samples (id, sample_id, merd_id, rokter_id, dato, tidspunkt, antall_fisk, temperatur, synced, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAMPLE-2024-016', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-10-24', '10:00', 20, 8.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-017', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-10-27', '09:30', 20, 8.4, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-018', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-10-31', '10:45', 20, 8.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-019', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-03', '11:20', 20, 9.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-020', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-06', '08:40', 20, 9.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-021', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-10', '09:50', 20, 10.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-022', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-13', '10:15', 20, 10.4, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-023', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-17', '11:05', 20, 10.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-024', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-20', '09:25', 20, 9.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-025', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-24', '10:35', 20, 9.1, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-026', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-27', '08:55', 20, 8.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-027', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-01', '09:40', 20, 8.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-028', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-12-04', '10:20', 20, 8.1, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-029', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-08', '11:00', 20, 7.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-030', (SELECT id FROM merds WHERE merd_id = 'NF-A2' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-12-11', '09:15', 20, 7.6, 1, NOW(), NOW());

-- Nordfjord - Merd A3 (15 tellinger - høyere lusenivå)
INSERT INTO samples (id, sample_id, merd_id, rokter_id, dato, tidspunkt, antall_fisk, temperatur, synced, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAMPLE-2024-031', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-10-25', '09:00', 20, 8.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-032', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-10-28', '10:30', 20, 8.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-033', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-01', '11:10', 20, 9.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-034', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-04', '09:20', 20, 9.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-035', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-07', '10:10', 20, 10.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-036', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-11', '11:30', 20, 10.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-037', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-14', '08:50', 20, 10.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-038', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-18', '09:40', 20, 10.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-039', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-21', '10:50', 20, 9.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-040', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-11-25', '11:25', 20, 9.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-041', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-11-28', '09:05', 20, 9.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-042', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-12-02', '10:45', 20, 8.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-043', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-05', '11:20', 20, 8.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-044', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), '2024-12-09', '09:30', 20, 7.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-045', (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), '2024-12-12', '10:00', 20, 7.7, 1, NOW(), NOW());

-- Hardangerfjorden - Merd B1 (15 tellinger)
INSERT INTO samples (id, sample_id, merd_id, rokter_id, dato, tidspunkt, antall_fisk, temperatur, synced, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAMPLE-2024-046', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-22', '08:30', 20, 9.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-047', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-25', '09:45', 20, 8.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-048', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-29', '10:20', 20, 9.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-049', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-01', '11:00', 20, 9.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-050', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-04', '08:40', 20, 10.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-051', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-08', '09:30', 20, 10.4, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-052', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-11', '10:15', 20, 10.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-053', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-15', '11:05', 20, 10.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-054', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-18', '08:50', 20, 9.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-055', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-22', '09:35', 20, 9.4, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-056', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-25', '10:25', 20, 9.1, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-057', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-29', '11:10', 20, 8.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-058', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-02', '08:45', 20, 8.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-059', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-06', '09:50', 20, 8.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-060', (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-09', '10:30', 20, 7.8, 1, NOW(), NOW());

-- Hardangerfjorden - Merd B2 (15 tellinger)
INSERT INTO samples (id, sample_id, merd_id, rokter_id, dato, tidspunkt, antall_fisk, temperatur, synced, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAMPLE-2024-061', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-23', '09:15', 20, 8.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-062', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-26', '10:00', 20, 8.7, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-063', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-10-30', '11:30', 20, 9.1, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-064', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-02', '08:55', 20, 9.5, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-065', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-05', '09:40', 20, 9.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-066', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-09', '10:25', 20, 10.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-067', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-12', '11:15', 20, 10.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-068', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-16', '08:35', 20, 10.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-069', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-19', '09:50', 20, 9.8, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-070', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-23', '10:40', 20, 9.3, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-071', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-26', '11:20', 20, 9.0, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-072', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-11-30', '09:05', 20, 8.6, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-073', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-03', '10:10', 20, 8.2, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-074', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-07', '11:00', 20, 7.9, 1, NOW(), NOW()),
(gen_random_uuid(), 'SAMPLE-2024-075', (SELECT id FROM merds WHERE merd_id = 'HF-B2' LIMIT 1), (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), '2024-12-10', '08:45', 20, 7.7, 1, NOW(), NOW());

-- ========================================
-- FISH OBSERVATIONS - 20 fisk per sample
-- Med realistiske lusetall
-- ========================================

-- Funksjon for å generere fiskeobservasjoner
DO $$
DECLARE
    sample_record RECORD;
    fish_num INT;
    base_lus FLOAT;
    voksne INT;
    bevegelige INT;
    fastsittende INT;
BEGIN
    FOR sample_record IN SELECT id, sample_id, dato FROM samples LOOP
        -- Beregn base-lusenivå basert på dato og merd
        -- Høyere lus på høsten, lavere på vinteren
        IF sample_record.dato < '2024-11-15' THEN
            base_lus := 0.12; -- Høyere nivå tidlig på høsten
        ELSIF sample_record.dato < '2024-12-01' THEN
            base_lus := 0.09; -- Middels nivå
        ELSE
            base_lus := 0.06; -- Lavere nivå på vinteren
        END IF;

        -- Generer 20 fisk per sample
        FOR fish_num IN 1..20 LOOP
            -- Variere lusetall rundt base-nivå
            voksne := FLOOR((base_lus + (RANDOM() - 0.5) * 0.05) * 10)::INT;
            bevegelige := FLOOR(RANDOM() * 3)::INT;
            fastsittende := FLOOR(RANDOM() * 2)::INT;

            -- Sørg for at vi ikke får negative tall
            IF voksne < 0 THEN voksne := 0; END IF;

            INSERT INTO fish_observations (id, fish_id, sample_id, voksne_hunnlus, bevegelige_lus, fastsittende_lus, skottelus, created_at)
            VALUES (
                gen_random_uuid(),
                'FISH-' || fish_num,
                sample_record.id,
                voksne,
                bevegelige,
                fastsittende,
                0,
                NOW()
            );
        END LOOP;
    END LOOP;
END $$;

-- ========================================
-- COMPLIANCE LOG - Noen behandlinger
-- ========================================

INSERT INTO compliance_log (id, merd_id, behandling_type, behandling_dato, utført_av, effektivitet_prosent, notat, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1), 'termisk', '2024-11-20', (SELECT id FROM users WHERE email = 'ola@eksempel.no' LIMIT 1), 85, 'Termisk behandling gjennomført vellykket', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1), 'mekanisk', '2024-11-25', (SELECT id FROM users WHERE email = 'per@eksempel.no' LIMIT 1), 78, 'Mekanisk avlusning med god effekt', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM merds WHERE merd_id = 'NF-A1' LIMIT 1), 'badebehandling', '2024-12-01', (SELECT id FROM users WHERE email = 'kari@eksempel.no' LIMIT 1), 92, 'Hydrogenperoksid-behandling', NOW(), NOW());

-- ========================================
-- OPPSUMMERING
-- ========================================

SELECT
    'Samples' as tabell,
    COUNT(*) as antall
FROM samples
UNION ALL
SELECT
    'Fish observations' as tabell,
    COUNT(*) as antall
FROM fish_observations
UNION ALL
SELECT
    'Compliance log' as tabell,
    COUNT(*) as antall
FROM compliance_log;
