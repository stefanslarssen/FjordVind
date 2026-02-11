-- Oppdater merder med geografiske koordinater
-- Eksempel: Klongsholmen og andre lokaliteter

-- Oppdater Nordfjorden merder med Klongsholmen koordinater
-- Klongsholmen ligger i Osterfjorden, ca 60.5833°N, 5.4167°E
UPDATE merds
SET
  latitude = 60.5833,
  longitude = 5.4167,
  lokalitet = 'Klongsholmen',
  lokalitetsnummer = '10455'  -- Eksempel lokalitetsnummer
WHERE merd_id IN ('NF-A1', 'NF-A2', 'NF-B1');

-- Oppdater Hardangerfjorden merder med eksempelkoordinater
-- Hardangerfjorden, ca 60.3°N, 6.3°E
UPDATE merds
SET
  latitude = 60.3000,
  longitude = 6.3000,
  lokalitetsnummer = '10789'  -- Eksempel lokalitetsnummer
WHERE merd_id IN ('HF-M1', 'HF-M2');

-- Legg til flere lokaliteter som naboer
INSERT INTO merds (id, merd_id, lokalitet, lokalitetsnummer, navn, latitude, longitude, is_active) VALUES
  (gen_random_uuid(), 'KH-C1', 'Klongsholmen', '10455', 'Merd C1', 60.5840, 5.4180, true),
  (gen_random_uuid(), 'KH-C2', 'Klongsholmen', '10455', 'Merd C2', 60.5838, 5.4175, true);

-- Legg til nabooppdrett (andre selskap i nærheten)
INSERT INTO merds (id, merd_id, lokalitet, lokalitetsnummer, navn, latitude, longitude, is_active) VALUES
  (gen_random_uuid(), 'NABO-01', 'Øygarden Nord', '10456', 'Naboanlegg 1', 60.5900, 5.4300, true),
  (gen_random_uuid(), 'NABO-02', 'Osterøy Sør', '10457', 'Naboanlegg 2', 60.5700, 5.4000, true);

-- Vis oppdaterte data
SELECT
  merd_id,
  navn,
  lokalitet,
  lokalitetsnummer,
  latitude,
  longitude,
  is_active
FROM merds
ORDER BY lokalitet, merd_id;
