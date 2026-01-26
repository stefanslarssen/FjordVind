# Slik kobler du Lusevokteren til BarentsWatch API

For å få ekte data med faktiske koordinater og lusedata fra alle oppdrett i Norge, må du koble til BarentsWatch Fish Health API.

## Steg 1: Registrer applikasjon

1. **Gå til BarentsWatch Developer Portal:**
   https://developer.barentswatch.no

2. **Opprett bruker:**
   - Klikk "Register" eller "Sign up"
   - Fyll ut skjema med din e-post og passord
   - Bekreft e-post

3. **Registrer din applikasjon:**
   - Logg inn på https://developer.barentswatch.no
   - Gå til "My Applications"
   - Klikk "Register new application"

   **Fyll ut:**
   - **Application name:** Lusevokteren
   - **Description:** Lusetellingsystem med kartvisning for oppdrettsanlegg
   - **Redirect URI:** http://localhost:3000
   - **Application type:** Machine to Machine (M2M)

4. **Få API-nøkler:**
   - Etter registrering får du:
     - **Client ID** (f.eks. `lusevokteren-prod-123abc`)
     - **Client Secret** (f.eks. `abc123def456...`)
   - **VIKTIG:** Lagre Client Secret et trygt sted! Den vises bare én gang.

## Steg 2: Legg til API-nøkler i prosjektet

Opprett en `.env`-fil i `lusevokteren-api/` mappen:

```bash
# Naviger til API-mappen
cd lusevokteren-api

# Opprett .env fil (Windows)
type nul > .env

# ELLER på Mac/Linux:
# touch .env
```

Åpne `.env` og legg til dine nøkler:

```env
# BarentsWatch API Credentials
BARENTSWATCH_CLIENT_ID=din_client_id_her
BARENTSWATCH_CLIENT_SECRET=din_client_secret_her

# Database (eksisterende)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lusevokteren
DB_USER=postgres
DB_PASSWORD=postgres
```

## Steg 3: Restart Docker-containerne

```bash
# Gå tilbake til hovedmappen
cd ..

# Restart API for å laste nye miljøvariabler
docker-compose restart api
```

## Steg 4: Test at det fungerer

Når API-nøklene er på plass, vil systemet automatisk:

1. **Autentisere mot BarentsWatch:**
   - Hente access token med Client Credentials flow
   - Cache token i 1 time (fornyes automatisk)

2. **Hente ekte data:**
   ```bash
   # Test at API-et henter ekte data
   curl http://localhost:3000/api/barentswatch/all-localities
   ```

3. **Vise på kartet:**
   - Åpne http://localhost/map
   - Aktiver "Vis alle oppdrett i Norge"
   - Se alle **1700+ oppdrettslokaliteter** med:
     - Faktiske GPS-koordinater
     - Ukentlige lusedata
     - Selskapsnavn
     - Kommuner
     - Historikk tilbake til 2012

## Hva du får med ekte BarentsWatch data:

### Før (mockdata):
- 36 fiktive lokaliteter
- Estimerte koordinater
- Statiske lusetall

### Etter (BarentsWatch):
- **1700+ ekte lokaliteter** i hele Norge
- GPS-koordinater fra Fiskeridirektoratet
- **Ukentlige oppdateringer** av lusedata
- Historiske data tilbake til 2012
- Rømming og sykdomsdata
- Selskapsinformasjon
- Biomasse-grenser
- Behandlingshistorikk

## Eksempel: Hva API-et returnerer

**Med mockdata (nå):**
```json
{
  "localityNo": 10000,
  "name": "Klongsholmen",
  "latitude": 60.5833,
  "longitude": 5.4167,
  "avgAdultFemaleLice": 0.65
}
```

**Med BarentsWatch (etter setup):**
```json
{
  "localityNr": 10455,
  "localityName": "KLONGSHOLMEN",
  "geometry": {
    "type": "Point",
    "coordinates": [5.416734, 60.583291]
  },
  "hasCleaner": false,
  "week": 4,
  "year": 2026,
  "avgAdultFemaleLice": 0.087,
  "avgMovingLice": 0.234,
  "avgStationaryLice": 1.456,
  "company": "MOWI NORWAY AS",
  "municipality": "BERGEN",
  "county": "VESTLAND",
  "seaTemperature": 7.2,
  "hasLiceTreatment": false,
  "biomassLimit": 3120
}
```

## API Endpoints som brukes:

1. **Autentisering:**
   ```
   POST https://id.barentswatch.no/connect/token
   ```

2. **Alle lokaliteter for en uke:**
   ```
   POST https://www.barentswatch.no/bwapi/v2/geodata/fishhealth/locality/{year}/{week}
   ```

3. **Spesifikk lokalitet:**
   ```
   GET https://www.barentswatch.no/bwapi/v2/geodata/fishhealth/locality/{localityNo}/{year}/{week}
   ```

## Feilsøking

### Problem: "BarentsWatch credentials not configured"
- **Løsning:** Sjekk at `.env` filen eksisterer i `lusevokteren-api/` og inneholder korrekte nøkler

### Problem: "Failed to get access token: 401 Unauthorized"
- **Løsning:**
  - Sjekk at Client ID og Secret er riktig kopiert
  - Sjekk at det ikke er mellomrom før/etter nøklene
  - Logg inn på developer.barentswatch.no og sjekk at applikasjonen er aktiv

### Problem: "Failed to fetch localities: 403 Forbidden"
- **Løsning:**
  - Applikasjonen må være godkjent av BarentsWatch (kan ta 1-2 dager)
  - Kontakt support@barentswatch.no hvis det tar lengre tid

## Ressurser

- **Developer Portal:** https://developer.barentswatch.no
- **API Dokumentasjon:** https://developer.barentswatch.no/docs/fishhealth
- **OpenAPI Spec:** https://www.barentswatch.no/bwapi/openapi/fishhealth/openapi.json
- **Support:** support@barentswatch.no

## Neste steg

Etter at du har registrert og lagt til API-nøklene:

1. Kartet vil automatisk vise **alle oppdrett i Norge**
2. Data oppdateres ukentlig (hver torsdag)
3. Du kan sammenligne dine merder mot naboer
4. Se historiske trender og mønstre
5. Få varsler når naboer har høyt lusenivå

**Lykke til med registreringen! 🐟🗺️**
