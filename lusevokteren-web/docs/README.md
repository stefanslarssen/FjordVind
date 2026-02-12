# FjordVind Dokumentasjon

Velkommen til FjordVind-dokumentasjonen. Her finner du alt du trenger for å komme i gang og bruke appen effektivt.

---

## For brukere

| Dokument | Beskrivelse |
|----------|-------------|
| [Hurtigstart](./HURTIGSTART.md) | Kom i gang på 5 minutter |
| [Brukermanual](./BRUKERMANUAL.md) | Komplett brukerveiledning |
| [FAQ](./FAQ.md) | Ofte stilte spørsmål |

---

## For utviklere

| Dokument | Beskrivelse |
|----------|-------------|
| [Code Signing](./CODE_SIGNING.md) | Signering av Windows-installere |
| [Mobile Publishing](./MOBILE_PUBLISHING.md) | Publisering til App Store & Google Play |
| [Stripe Setup](./STRIPE_SETUP.md) | Betalingsintegrasjon |
| [Store Listing](./store-listing.md) | App Store-beskrivelser |

---

## Arkitektur

```
lusevokteren-web/
├── src/                    # React frontend
│   ├── components/         # Gjenbrukbare komponenter
│   ├── pages/              # Sidekomponenter
│   ├── services/           # API-tjenester
│   ├── contexts/           # React Context
│   └── hooks/              # Custom hooks
├── src-tauri/              # Tauri desktop-app
├── ios/                    # iOS Capacitor-app
├── android/                # Android Capacitor-app
├── supabase/               # Supabase Edge Functions
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database-migrasjoner
├── cypress/                # E2E-tester
└── docs/                   # Dokumentasjon
```

---

## Teknologier

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Desktop | Tauri |
| Mobil | Capacitor |
| Kart | Leaflet |
| Grafer | Recharts |
| Betaling | Stripe |
| Testing | Vitest, Cypress |

---

## Kontakt

- **Support**: support@nordfjordsolutions.no
- **Utvikling**: dev@nordfjordsolutions.no
- **Salg**: salg@nordfjordsolutions.no

---

*FjordVind - Profesjonell luseovervåking for norsk oppdrettsnæring*
*Et produkt fra NordFjord Solutions AS*
