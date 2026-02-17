# Stripe Betalingsintegrasjon - Oppsettguide

## Oversikt

FjordVind bruker Stripe for abonnementsbetalinger. Denne guiden forklarer hvordan du setter opp Stripe.

## Steg 1: Opprett Stripe-konto

1. Gå til [stripe.com](https://stripe.com) og registrer deg
2. Verifiser kontoen din (krever bedriftsinformasjon for produksjon)

## Steg 2: Opprett produkter og priser i Stripe Dashboard

Gå til [Stripe Dashboard > Products](https://dashboard.stripe.com/products) og opprett:

### Produkt 1: Grunnleggende

| Felt | Verdi |
|------|-------|
| Navn | FjordVind Grunnleggende |
| Beskrivelse | For mindre oppdrettsanlegg |

**Priser:**
- Månedlig: 1990 NOK/mnd (recurring)
- Årlig: 19900 NOK/år (recurring)

### Produkt 2: Profesjonell

| Felt | Verdi |
|------|-------|
| Navn | FjordVind Profesjonell |
| Beskrivelse | For mellomstore oppdrettere |

**Priser:**
- Månedlig: 4990 NOK/mnd (recurring)
- Årlig: 49900 NOK/år (recurring)

## Steg 3: Hent API-nøkler

Gå til [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys):

- **Publishable key**: `pk_test_...` eller `pk_live_...`
- **Secret key**: `sk_test_...` eller `sk_live_...`

## Steg 4: Konfigurer miljøvariabler

### Frontend (.env)
```env
VITE_STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
VITE_STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
VITE_STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
VITE_STRIPE_PRICE_PRO_YEARLY=price_xxxxx
```

### Supabase Edge Functions (Secrets)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set STRIPE_PRICE_BASIC_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_BASIC_YEARLY=price_xxxxx
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
supabase secrets set STRIPE_PRICE_PRO_YEARLY=price_xxxxx
```

## Steg 5: Deploy Supabase Edge Functions

```bash
cd lusevokteren-web

# Deploy alle funksjoner
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

## Steg 6: Sett opp Webhook

1. Gå til [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Klikk "Add endpoint"
3. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
4. Velg events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Kopier "Signing secret" og legg til som `STRIPE_WEBHOOK_SECRET`

## Steg 7: Kjør database-migrasjonen

Kjør `003_subscriptions.sql` i Supabase SQL Editor for å opprette:
- `subscriptions` tabell
- `plan_limits` tabell
- RLS policies

## Steg 8: Konfigurer Customer Portal

1. Gå til [Stripe Dashboard > Settings > Billing > Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Aktiver:
   - Oppdater betalingsmetode
   - Kanseller abonnement
   - Vis faktureringshistorikk

## Testing

### Test med Stripe testkort:
- **Suksess**: `4242 4242 4242 4242`
- **Avvist**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test webhook lokalt:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## Produksjonssjekkliste

- [ ] Bytt til produksjons-API-nøkler (`pk_live_`, `sk_live_`)
- [ ] Oppdater webhook URL til produksjon
- [ ] Verifiser Stripe-konto (for utbetalinger)
- [ ] Test full betalingsflyt
- [ ] Sett opp skatteinnstillinger for Norge

## Feilsøking

### "Ugyldig plan eller pris ikke konfigurert"
→ Sjekk at `VITE_STRIPE_PRICE_*` er satt i miljøvariabler

### Webhook feiler
→ Sjekk at `STRIPE_WEBHOOK_SECRET` matcher Stripe Dashboard

### CORS-feil
→ Edge Functions har CORS-headers, sjekk at de er deployet riktig
