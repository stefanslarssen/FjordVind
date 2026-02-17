# Lusevokteren Web Dashboard

React web dashboard for driftsledere - oversikt over lusetellinger.

## Funksjoner

- **Oversikt**: Statistikk og trendgraf for lusetellinger
- **Historikk**: Filtrerbar tabell med alle tellinger
- **Lokasjoner**: Aggregert status per lokasjon
- **Eksport**: CSV-eksport av data

## Oppsett

### 1. Installer avhengigheter

```bash
cd lusevokteren-web
npm install
```

### 2. Konfigurer miljøvariabler

Kopier `.env.example` til `.env`:

```bash
cp .env.example .env
```

Fyll inn Supabase-verdier:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start utviklingsserver

```bash
npm run dev
```

Åpne http://localhost:5173

## Prosjektstruktur

```
src/
├── main.jsx           # Entry point
├── App.jsx            # Routes og layout
├── styles.css         # Global CSS
├── pages/
│   ├── DashboardPage.jsx   # Hovedoversikt
│   ├── HistoryPage.jsx     # Historikk-tabell
│   └── LocationsPage.jsx   # Lokasjonsoversikt
└── services/
    └── supabase.js    # Supabase client
```

## Teknologi

- React 18
- Vite
- React Router
- Recharts (grafer)
- Supabase JS Client

## Terskelverdier

Dashboard viser status basert på voksen hunnlus per fisk:
- **Grønn**: < 0.08
- **Gul**: >= 0.08
- **Rød**: >= 0.10
