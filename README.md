# FjordVind - Lakseoppdrett Overvåkingssystem

Komplett system for registrering og overvåking av lakselus i norsk oppdrettsindustri.

## Innhold

- **Backend:** PostgreSQL database med Supabase
- **API:** Node.js/Express REST API
- **Frontend:** React web-applikasjon
- **Mobilapp:** React Native (Expo)
- **Docker:** Alt-i-ett løsning med Docker Compose

---

## Kom i gang

### Forutsetninger

1. **Docker Desktop** - [Last ned her](https://www.docker.com/products/docker-desktop/)
2. **Node.js 18+** - For lokal utvikling
3. **Git** (valgfritt)

### Installasjon med Docker

#### Steg 1: Start Docker Desktop
Åpne Docker Desktop og la det kjøre i bakgrunnen.

#### Steg 2: Start hele systemet
```bash
docker-compose up -d
```

Dette starter:
- PostgreSQL database (port 5432)
- Web frontend (http://localhost)
- API server (http://localhost:3000)
- Adminer database UI (http://localhost:8080)

#### Steg 3: Sjekk at alt kjører
```bash
docker-compose ps
```

Du skal se containere som kjører:
- `fjordvind-db` (PostgreSQL)
- `fjordvind-web` (Frontend)
- `fjordvind-api` (API)
- `fjordvind-adminer` (Database UI)

---

## Tilgang til systemet

### Web Frontend
Åpne nettleseren: **http://localhost**

Sider:
- `/` - Dashboard med statistikk og grafer
- `/history` - Historikk over alle tellinger
- `/locations` - Oversikt over lokaliteter
- `/ny-telling` - Registrer ny lusetelling
- `/dodelighet` - Dødelighetsregistrering
- `/rapporter` - Generer rapporter

### API
Base URL: **http://localhost:3000/api**

Dokumentasjon: **http://localhost:3000/api/docs**

### Database Management (Adminer)
Åpne nettleseren: **http://localhost:8080**

Logg inn:
- **System:** PostgreSQL
- **Server:** postgres
- **Username:** postgres
- **Password:** postgres
- **Database:** fjordvind

---

## Database Schema

### Tabeller:
- **users** - Brukere (røktere, driftsledere, admins)
- **companies** - Selskaper (multi-tenant)
- **merds** - Merder/oppdrettsenheter
- **samples** - Lusetellinger/prøvetakinger
- **fish_observations** - Individuelle fiskeobservasjoner
- **mortality** - Dødelighetsregistreringer
- **treatments** - Behandlinger
- **alerts** - Varsler
- **predictions** - AI-prognoser
- **environment_readings** - Miljødata
- **images** - Bilder

---

## Prosjektstruktur

```
fjordvind/
├── docker-compose.yml           # Docker Compose konfigurasjon
├── .env                         # Miljøvariabler
├── README.md                    # Denne filen
├── supabase-setup.sql           # Database schema
│
├── fjordvind-api/               # REST API (Node.js/Express)
│   ├── routes/                  # API endpoints
│   ├── middleware/              # Auth, validation
│   ├── services/                # Business logic
│   └── server.js                # Entry point
│
├── fjordvind-web/               # Frontend (React/Vite)
│   ├── src/
│   │   ├── pages/               # Sider
│   │   ├── components/          # UI-komponenter
│   │   ├── services/            # API-kall
│   │   └── contexts/            # React contexts
│   └── index.html
│
├── fjordvind-expo/              # Mobilapp (React Native)
│   ├── src/
│   │   ├── screens/             # Skjermer
│   │   ├── services/            # API-kall
│   │   └── contexts/            # Auth context
│   └── App.tsx
│
└── fjordvind-backend/           # Supabase konfigurasjon
    └── supabase/
        ├── migrations/          # Database migrasjoner
        └── functions/           # Edge functions
```

---

## Nyttige kommandoer

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
docker-compose logs -f api
docker-compose logs -f web
```

### Kjør database migrasjoner
```bash
docker-compose exec postgres psql -U postgres -d fjordvind -f /docker-entrypoint-initdb.d/supabase-setup.sql
```

### Koble til PostgreSQL direkte
```bash
docker-compose exec postgres psql -U postgres -d fjordvind
```

---

## Konfigurasjon

### Environment Variables

Rediger `.env` filen:

```env
# Database
POSTGRES_DB=fjordvind
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# API
JWT_SECRET=your-secret-key
PORT=3000

# Frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

---

## Status

### Ferdig
- Database schema og migrasjoner
- Brukerautentisering (JWT + Supabase Auth)
- REST API med 20+ endpoints
- Web frontend med 26 sider
- Lusetelling med fiskeobservasjoner
- Dødelighetsregistrering
- Behandlingsplanlegging
- Varsler og notifications
- Bildeopplasting
- Prognoser og risikoscorer
- Miljødata
- Rapportgenerering (PDF)
- RLS policies (Row Level Security)
- Docker Compose setup
- Expo mobilapp struktur

### Under utvikling
- Expo mobilapp screens
- Push notifications
- Barentswatch API-integrasjon
- AI-baserte prognoser

---

## Demo-brukere

For testing kan du bruke:
- **admin@fjordvind.no** / admin123
- **leder@fjordvind.no** / leder123
- **rokter@fjordvind.no** / rokter123

---

## Lisens

Proprietært - FjordVind AS

---

**Beskytter Norges kyst**
