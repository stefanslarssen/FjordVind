# Kundesupport - Oppsettguide

## Oversikt

FjordVind har et innebygd support-system, men kan også integreres med eksterne verktøy for chat, helpdesk og CRM.

---

## Del 1: Innebygd Support-system

### Database-oppsett

Kjør migrasjonen for å opprette support-tabeller:

```bash
supabase db push
# Eller kjør 004_support_tickets.sql manuelt
```

### Funksjoner

- **Ticket-system**: Brukere kan opprette henvendelser
- **Prioritet**: Lav, medium, høy
- **Kategorier**: Bug, forslag, fakturering, konto, annet
- **Kommentarer**: Dialog mellom bruker og support
- **Admin-dashboard**: Oversikt over alle tickets

### API Endpoints

| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/support/tickets` | Opprett ticket |
| GET | `/api/support/tickets` | Hent brukerens tickets |
| GET | `/api/support/tickets/:id` | Hent enkelt ticket |
| POST | `/api/support/tickets/:id/comments` | Legg til kommentar |
| PATCH | `/api/support/tickets/:id` | Oppdater status |

---

## Del 2: Live Chat - Crisp (Anbefalt)

### Hvorfor Crisp?

- Gratis plan tilgjengelig
- Norsk språkstøtte
- Enkel integrasjon
- Chatbot-muligheter
- Mobil-app for support-team

### Oppsett

1. **Opprett konto**: [crisp.chat](https://crisp.chat)

2. **Hent Website ID** fra Crisp Dashboard → Settings → Website Settings

3. **Legg til i `.env`**:
```env
VITE_CRISP_WEBSITE_ID=your-website-id
```

4. **Installer Crisp-komponent**:

```jsx
// src/components/CrispChat.jsx
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function CrispChat() {
  const { user } = useAuth()

  useEffect(() => {
    // Load Crisp
    window.$crisp = []
    window.CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID

    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Cleanup
      delete window.$crisp
      delete window.CRISP_WEBSITE_ID
    }
  }, [])

  // Set user data when logged in
  useEffect(() => {
    if (user && window.$crisp) {
      window.$crisp.push(['set', 'user:email', user.email])
      window.$crisp.push(['set', 'user:nickname', user.full_name])
    }
  }, [user])

  return null
}
```

5. **Legg til i App.jsx**:
```jsx
import CrispChat from './components/CrispChat'

function App() {
  return (
    <>
      {/* ... */}
      <CrispChat />
    </>
  )
}
```

---

## Del 3: Intercom (Enterprise)

### Oppsett

1. **Opprett konto**: [intercom.com](https://www.intercom.com)

2. **Installer SDK**:
```bash
npm install @intercom/messenger-js-sdk
```

3. **Konfigurer**:

```jsx
// src/components/IntercomChat.jsx
import { useEffect } from 'react'
import Intercom from '@intercom/messenger-js-sdk'
import { useAuth } from '../contexts/AuthContext'

export default function IntercomChat() {
  const { user } = useAuth()

  useEffect(() => {
    Intercom({
      app_id: import.meta.env.VITE_INTERCOM_APP_ID,
      user_id: user?.id,
      name: user?.full_name,
      email: user?.email,
      created_at: user?.created_at
    })
  }, [user])

  return null
}
```

---

## Del 4: Zendesk

### Oppsett

1. **Opprett konto**: [zendesk.com](https://www.zendesk.com)

2. **Legg til Web Widget**:

```jsx
// src/components/ZendeskWidget.jsx
import { useEffect } from 'react'

export default function ZendeskWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.id = 'ze-snippet'
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${import.meta.env.VITE_ZENDESK_KEY}`
    document.head.appendChild(script)

    return () => {
      const existing = document.getElementById('ze-snippet')
      if (existing) existing.remove()
    }
  }, [])

  return null
}
```

---

## Del 5: E-post Integrasjon

### SendGrid for transaksjonelle e-poster

1. **Opprett konto**: [sendgrid.com](https://sendgrid.com)

2. **Sett opp API-nøkkel** som Supabase Secret:
```bash
supabase secrets set SENDGRID_API_KEY=SG.xxxxx
```

3. **Edge Function for e-post**:

```typescript
// supabase/functions/send-support-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  const { ticketId, type, priority, subject } = await req.json()

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: 'support@nordfjordsolutions.no' }]
      }],
      from: { email: 'noreply@fjordvind.no', name: 'FjordVind Support' },
      subject: `[${priority.toUpperCase()}] Ny support-henvendelse: ${subject}`,
      content: [{
        type: 'text/html',
        value: `
          <h2>Ny support-henvendelse</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Prioritet:</strong> ${priority}</p>
          <p><strong>Emne:</strong> ${subject}</p>
          <p><a href="https://app.fjordvind.no/admin/support/${ticketId}">Se ticket</a></p>
        `
      }]
    })
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## Del 6: Slack-integrasjon

For å motta varsler i Slack:

1. **Opprett Slack App**: [api.slack.com/apps](https://api.slack.com/apps)

2. **Aktiver Incoming Webhooks**

3. **Legg til webhook URL** som secret:
```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

4. **Edge Function**:

```typescript
// I send-support-notification/index.ts, legg til:
const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK_URL')

if (SLACK_WEBHOOK) {
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      text: `🎫 Ny support-henvendelse`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${subject}*\nType: ${type} | Prioritet: ${priority}`
          }
        },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'Åpne ticket' },
            url: `https://app.fjordvind.no/admin/support/${ticketId}`
          }]
        }
      ]
    })
  })
}
```

---

## Del 7: Support-workflow

### Anbefalt prosess

```
1. Bruker sender henvendelse
       ↓
2. Automatisk e-post til support@nordfjordsolutions.no
       ↓
3. Slack-varsel i #support-kanal
       ↓
4. Support-medarbeider tar saken
       ↓
5. Dialog via kommentarer
       ↓
6. Løsning og lukking av ticket
       ↓
7. Automatisk tilbakemelding til bruker
```

### SLA-mål

| Prioritet | Første respons | Løsningstid |
|-----------|----------------|-------------|
| Høy | 2 timer | 8 timer |
| Medium | 24 timer | 3 dager |
| Lav | 48 timer | 7 dager |

---

## Del 8: Sjekkliste

### Grunnleggende oppsett
- [ ] Database-migrasjon kjørt
- [ ] Support-side tilgjengelig
- [ ] E-postvarsler fungerer

### Valgfritt
- [ ] Live chat (Crisp/Intercom)
- [ ] Slack-integrasjon
- [ ] Admin-dashboard

### Dokumentasjon
- [ ] FAQ oppdatert
- [ ] Brukermanual tilgjengelig
- [ ] Support-e-post publisert

---

## Kontakt

Tekniske spørsmål: dev@nordfjordsolutions.no
