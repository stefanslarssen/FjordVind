~~~~# 🐟 Lusevokteren - Lakseoppdrett Lusetelling System

Komplett system for registrering og overvåking av lakselus i norsk oppdrettsindustri.

## 📋 Innhold

- **Backend:** PostgreSQL database med Supabase
- **Frontend:** React web-applikasjon
- **Docker:** Alt-i-ett løsning med Docker Compose

---

## 🚀 Kom i gang

### Forutsetninger

1. **Docker Desktop** - [Last ned her](https://www.docker.com/products/docker-desktop/)
2. **Git** (valgfritt)

### Installasjon

#### Steg 1: Start Docker Desktop
Åpne Docker Desktop og la det kjøre i bakgrunnen.

#### Steg 2: Start hele systemet
Åpne terminal/PowerShell i prosjektmappen og kjør:

```bash
docker-compose up -d
```

Dette starter:
- ✅ PostgreSQL database (port 5432)
- ✅ Web frontend (http://localhost)
- ✅ Adminer database UI (http://localhost:8080)

#### Steg 3: Sjekk at alt kjører
```bash
docker-compose ps
```

Du skal se tre containere som kjører:
- `lusevokteren-db` (PostgreSQL)
- `lusevokteren-web` (Frontend)
- `lusevokteren-adminer` (Database UI)

---

## 🌐 Tilgang til systemet

### Web Frontend
Åpne nettleseren: **http://localhost**

Sider:
- `/` - Dashboard med statistikk og grafer
- `/history` - Historikk over alle tellinger
- `/locations` - Oversikt over lokaliteter

### Database Management (Adminer)
Åpne nettleseren: **http://localhost:8080**

Logg inn:
- **System:** PostgreSQL
- **Server:** postgres
- **Username:** postgres
- **Password:** postgres
- **Database:** lusevokteren

---

## 📊 Database Schema

### Tabeller:
- **users** - Brukere (røktere, driftsledere, admins)
- **merds** - Merder/oppdrettsenheter
- **samples** - Lusetellinger/prøvetakinger
- **fish_observations** - Individuelle fiskeobservasjoner
- **compliance_log** - Behandlingslogg

### Views:
- **sample_summaries** - Aggregert telledata
- **merd_latest_counts** - Siste tellinger per merd
- **merd_compliance_status** - Compliance-status

---

## 🛠️ Nyttige kommandoer

### Start systemet
```bash
docker-compose up -d
```

### Stopp systemet
```bash
docker-compose down
```

### Se logger
```bash
docker-compose logs -f
```

### Se logger for spesifikk tjeneste
```bash
docker-compose logs -f web
docker-compose logs -f postgres
```

### Restart en tjeneste
```bash
docker-compose restart web
```

### Kjør database migrasjoner manuelt
```bash
docker-compose exec postgres psql -U postgres -d lusevokteren -f /docker-entrypoint-initdb.d/20240102000000_v2_schema.sql
```

### Koble til PostgreSQL direkte
```bash
docker-compose exec postgres psql -U postgres -d lusevokteren
```

### Stopp og fjern alt (inkludert data!)
```bash
docker-compose down -v
```
⚠️ **ADVARSEL:** Dette sletter all data!

---

## 📁 Prosjektstruktur

```
lusevokteren/
├── docker-compose.yml           # Docker Compose konfigurasjon
├── .env                         # Miljøvariabler
├── README.md                    # Denne filen
│
├── lusevokteren-backend/        # Backend (Supabase)
│   └── supabase/
│       ├── migrations/          # Database migrasjoner
│       └── functions/           # Edge functions
│
└── lusevokteren-web/            # Frontend (React)
    ├── src/
    ├── Dockerfile               # Docker konfigurasjon
    ├── nginx.conf               # Nginx konfigurasjon
    └── .env                     # Frontend miljøvariabler
```

---

## 🔧 Konfigurasjon

### Environment Variables

Rediger `.env` filen for å endre konfigurasjon:

```env
# Database
POSTGRES_DB=lusevokteren
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Web Frontend
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 💾 Backup og Restore

### Backup database
```bash
docker-compose exec postgres pg_dump -U postgres lusevokteren > backup.sql
```

### Restore database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres lusevokteren
```

---

## 🐛 Feilsøking

### Problem: Port allerede i bruk
Hvis port 80, 5432 eller 8080 er opptatt:

**Løsning 1:** Stopp tjenesten som bruker porten
**Løsning 2:** Endre porter i `docker-compose.yml`

```yaml
ports:
  - "8000:80"  # Endre fra 80 til 8000
```

### Problem: Container starter ikke
```bash
# Se detaljerte logger
docker-compose logs web
docker-compose logs postgres

# Restart containere
docker-compose restart
```

### Problem: Database tom etter oppstart
Sjekk at migrasjonene kjørte:
```bash
docker-compose logs postgres | grep migration
```

Kjør migrasjoner manuelt hvis nødvendig:
```bash
docker-compose exec postgres psql -U postgres -d lusevokteren -f /docker-entrypoint-initdb.d/20240102000000_v2_schema.sql
```

---

## 📈 MVP Status

### ✅ Ferdig
- Database schema og migrasjoner
- PostgreSQL med Docker
- Web frontend med React
- Dashboard med visualisering
- Historikk og filtrering
- Docker Compose setup

### ⚠️ Under utvikling
- Brukerautentisering
- Registrering av nye tellinger
- Tilgangskontroll (RLS policies)
- Bildeopplasting
- API for mobilapp

---

## 📞 Support

Hvis du har problemer eller spørsmål, sjekk:
1. Docker Desktop kjører
2. Ingen andre tjenester bruker portene
3. `.env` filen er konfigurert riktig

---

## 📄 Lisens

Dette er et internt prosjekt for lakseoppdrett.

---

**Laget med ❤️ for norsk akvakultur** 🐟
