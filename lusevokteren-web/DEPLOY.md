# FjordVind Deployment Guide

## Rask Deploy til Vercel (Anbefalt)

### Steg 1: Logg inn på Vercel
```bash
cd "C:\Users\Stefa\Prosjekt folder\lusevokteren-web"
npx vercel login
```
Velg innloggingsmetode (GitHub anbefales).

### Steg 2: Deploy
```bash
npx vercel --prod
```

### Steg 3: Sett miljøvariabler
Etter første deploy, gå til [Vercel Dashboard](https://vercel.com/dashboard):
1. Velg prosjektet "fjordvind"
2. Gå til **Settings** → **Environment Variables**
3. Legg til:

| Variabel | Verdi |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://iqrwmrumqlghwzlgqyja.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_yNTHRmXw3-QB5yYrWUJlLw_AZ2jd2hM` |

### Steg 4: Redeploy
```bash
npx vercel --prod
```

---

## Alternativ: Deploy via GitHub

1. Gå til [vercel.com/new](https://vercel.com/new)
2. Importer fra GitHub: `stefanslarssen/FjordVind`
3. Velg mappen `lusevokteren-web` som root
4. Vercel autodetekterer Vite-konfigurasjon
5. Legg til miljøvariabler (se over)
6. Klikk **Deploy**

---

## Custom Domene

Etter deploy:
1. Gå til **Settings** → **Domains**
2. Legg til `fjordvind.no` eller ønsket domene
3. Oppdater DNS hos domeneleverandør:
   - Type: `CNAME`
   - Host: `@` eller `www`
   - Value: `cname.vercel-dns.com`

---

## Verifiser Deploy

Etter vellykket deploy, test:
- [ ] Hjemmeside laster
- [ ] Innlogging fungerer
- [ ] Kart vises
- [ ] Data hentes fra Supabase
- [ ] PWA kan installeres

---

## Feilsøking

### "Failed to load resource"
→ Sjekk at miljøvariabler er satt i Vercel Dashboard

### CORS-feil
→ Legg til Vercel-domenet i Supabase:
1. Supabase Dashboard → Authentication → URL Configuration
2. Legg til `https://fjordvind.vercel.app` i Redirect URLs

### 404 på undersider
→ `vercel.json` rewrites skal håndtere dette automatisk
