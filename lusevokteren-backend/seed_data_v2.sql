-- ========================================
-- LUSEVOKTEREN - REALISTISK TESTDATA V2
-- Genererer 75 tellinger over 3 måneder
-- ========================================

-- Slett eksisterende testdata først
DELETE FROM fish_observations;
DELETE FROM samples;
DELETE FROM compliance_log;

-- ========================================
-- FISH OBSERVATIONS - Helper function
-- ========================================

CREATE OR REPLACE FUNCTION generate_fish_observations(
    p_sample_id UUID,
    p_dato DATE
) RETURNS VOID AS $$
DECLARE
    fish_num INT;
    base_lus FLOAT;
    voksne INT;
    bevegelige INT;
    fastsittende INT;
BEGIN
    -- Beregn base-lusenivå basert på dato
    IF p_dato < CURRENT_DATE - 45 THEN
        base_lus := 0.11;  -- Høyere nivå tidlig på høsten
    ELSIF p_dato < CURRENT_DATE - 20 THEN
        base_lus := 0.09;  -- Middels nivå
    ELSE
        base_lus := 0.06;  -- Lavere nivå nylig
    END IF;

    -- Generer 20 fisk per sample
    FOR fish_num IN 1..20 LOOP
        -- Variere lusetall rundt base-nivå
        voksne := GREATEST(0, FLOOR((base_lus + (RANDOM() - 0.5) * 0.06) * 20)::INT);
        bevegelige := FLOOR(RANDOM() * 4)::INT;
        fastsittende := FLOOR(RANDOM() * 3)::INT;

        INSERT INTO fish_observations (
            id,
            fish_id,
            sample_id,
            voksne_hunnlus,
            bevegelige_lus,
            fastsittende_lus,
            skottelus,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'FISH-' || LPAD(fish_num::text, 2, '0'),
            p_sample_id,
            voksne,
            bevegelige,
            fastsittende,
            0,
            NOW()
        );
    END LOOP;
END $$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLES - 75 tellinger (15 per merd)
-- ========================================

-- Funksjon for å generere samples
DO $$
DECLARE
    merd_record RECORD;
    user_ola_id UUID;
    user_kari_id UUID;
    user_per_id UUID;
    sample_date DATE;
    sample_count INT;
    sample_uuid UUID;
    temp FLOAT;
BEGIN
    -- Hent bruker-IDer
    SELECT id INTO user_ola_id FROM users WHERE email = 'ola.nordmann@example.com' LIMIT 1;
    SELECT id INTO user_kari_id FROM users WHERE email = 'kari.hansen@example.com' LIMIT 1;
    SELECT id INTO user_per_id FROM users WHERE email = 'per.olsen@example.com' LIMIT 1;

    -- For hver merd
    FOR merd_record IN SELECT id, merd_id, lokalitet FROM merds LOOP
        sample_count := 1;

        -- Generer 15 tellinger per merd over 90 dager
        FOR i IN 0..14 LOOP
            sample_date := CURRENT_DATE - (90 - (i * 6));  -- Hver 6. dag
            temp := 7.5 + (RANDOM() * 3.0);  -- Temperatur mellom 7.5 og 10.5
            sample_uuid := gen_random_uuid();

            -- Insert sample
            INSERT INTO samples (
                id,
                sample_id,
                merd_id,
                røkter_id,
                dato,
                tidspunkt,
                antall_fisk,
                temperatur,
                synced,
                created_at,
                updated_at
            ) VALUES (
                sample_uuid,
                'SAMPLE-' || merd_record.merd_id || '-' || LPAD(sample_count::text, 3, '0'),
                merd_record.id,
                CASE
                    WHEN merd_record.lokalitet = 'Nordfjord' THEN
                        CASE WHEN RANDOM() > 0.5 THEN user_ola_id ELSE user_kari_id END
                    ELSE user_per_id
                END,
                sample_date,
                (TIME '08:00:00' + (RANDOM() * INTERVAL '4 hours'))::TIME,
                20,
                ROUND(temp::numeric, 1),
                TRUE,
                NOW(),
                NOW()
            );

            -- Generer fiskeobservasjoner for denne samplen
            PERFORM generate_fish_observations(sample_uuid, sample_date);

            sample_count := sample_count + 1;
        END LOOP;
    END LOOP;
END $$;

-- Cleanup function
DROP FUNCTION IF EXISTS generate_fish_observations(UUID, DATE);

-- ========================================
-- COMPLIANCE LOG - Noen behandlinger
-- ========================================

DO $$
DECLARE
    merd_nf_a3_id UUID;
    merd_hf_b1_id UUID;
    user_ola_id UUID;
    user_per_id UUID;
BEGIN
    -- Hent IDer
    SELECT id INTO merd_nf_a3_id FROM merds WHERE merd_id = 'NF-A3' LIMIT 1;
    SELECT id INTO merd_hf_b1_id FROM merds WHERE merd_id = 'HF-B1' LIMIT 1;
    SELECT id INTO user_ola_id FROM users WHERE email = 'ola.nordmann@example.com' LIMIT 1;
    SELECT id INTO user_per_id FROM users WHERE email = 'per.olsen@example.com' LIMIT 1;

    -- Insert behandlinger
    IF merd_nf_a3_id IS NOT NULL AND user_ola_id IS NOT NULL THEN
        INSERT INTO compliance_log (
            id,
            merd_id,
            behandling_type,
            behandling_dato,
            utført_av,
            effektivitet_prosent,
            notat,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            merd_nf_a3_id,
            'termisk',
            CURRENT_DATE - 40,
            user_ola_id,
            85.00,
            'Termisk behandling gjennomført vellykket',
            NOW(),
            NOW()
        );
    END IF;

    IF merd_hf_b1_id IS NOT NULL AND user_per_id IS NOT NULL THEN
        INSERT INTO compliance_log (
            id,
            merd_id,
            behandling_type,
            behandling_dato,
            utført_av,
            effektivitet_prosent,
            notat,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            merd_hf_b1_id,
            'mekanisk',
            CURRENT_DATE - 25,
            user_per_id,
            78.00,
            'Mekanisk avlusning med god effekt',
            NOW(),
            NOW()
        );
    END IF;
END $$;

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

-- Vis noen eksempler
SELECT
    s.dato,
    m.merd_id,
    m.lokalitet,
    s.antall_fisk,
    s.temperatur,
    COUNT(f.id) as antall_obs
FROM samples s
JOIN merds m ON s.merd_id = m.id
LEFT JOIN fish_observations f ON s.id = f.sample_id
GROUP BY s.dato, m.merd_id, m.lokalitet, s.antall_fisk, s.temperatur
ORDER BY s.dato DESC
LIMIT 10;
