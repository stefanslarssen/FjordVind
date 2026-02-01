/**
 * Personvernerklæring / Privacy Policy
 * GDPR-kompatibel personvernerklæring for FjordVind
 */

import { useLanguage } from '../contexts/LanguageContext'

function PersonvernPage() {
  const { t } = useLanguage()
  const lastUpdated = '1. februar 2026'
  const companyName = 'FjordVind AS'
  const companyEmail = 'personvern@fjordvind.no'
  const companyAddress = 'Norge'

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '600',
        marginBottom: '8px',
        color: 'var(--text-primary)'
      }}>
        Personvernerklæring
      </h1>

      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        fontSize: '14px'
      }}>
        Sist oppdatert: {lastUpdated}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: 'var(--text-primary)',
        lineHeight: '1.7'
      }}>

        {/* Introduksjon */}
        <section>
          <h2 style={sectionTitle}>1. Innledning</h2>
          <p>
            {companyName} ("vi", "oss", "vår") er behandlingsansvarlig for personopplysninger
            som samles inn gjennom FjordVind-applikasjonen ("Tjenesten"). Vi er forpliktet til
            å beskytte ditt personvern i samsvar med EUs personvernforordning (GDPR) og norsk
            personopplysningslov.
          </p>
          <p style={{ marginTop: '12px' }}>
            Denne personvernerklæringen forklarer hvilke opplysninger vi samler inn,
            hvordan vi bruker dem, og hvilke rettigheter du har.
          </p>
        </section>

        {/* Behandlingsansvarlig */}
        <section>
          <h2 style={sectionTitle}>2. Behandlingsansvarlig</h2>
          <p>
            <strong>Selskap:</strong> {companyName}<br />
            <strong>E-post:</strong> {companyEmail}<br />
            <strong>Adresse:</strong> {companyAddress}
          </p>
        </section>

        {/* Personopplysninger vi samler inn */}
        <section>
          <h2 style={sectionTitle}>3. Personopplysninger vi samler inn</h2>

          <h3 style={subTitle}>3.1 Opplysninger du gir oss</h3>
          <ul style={listStyle}>
            <li><strong>Kontoinformasjon:</strong> Navn, e-postadresse, telefonnummer</li>
            <li><strong>Bedriftsinformasjon:</strong> Selskapsnavn, organisasjonsnummer, lokalitetsnummer</li>
            <li><strong>Driftsdata:</strong> Lusetellinger, behandlingshistorikk, merddata</li>
          </ul>

          <h3 style={subTitle}>3.2 Opplysninger vi samler automatisk</h3>
          <ul style={listStyle}>
            <li><strong>Teknisk informasjon:</strong> IP-adresse, enhetstype, nettlesertype</li>
            <li><strong>Bruksdata:</strong> Sidevisninger, funksjoner brukt, tidspunkt</li>
            <li><strong>Lokasjonsdata:</strong> Kun med ditt samtykke, for kartfunksjoner</li>
          </ul>

          <h3 style={subTitle}>3.3 Data fra tredjeparter</h3>
          <ul style={listStyle}>
            <li><strong>BarentsWatch:</strong> Offentlige lusedata og sykdomsstatistikk</li>
            <li><strong>Fiskeridirektoratet:</strong> Lokalitetsdata og produksjonsområder</li>
            <li><strong>Meteorologisk institutt:</strong> Værdata og havtemperaturer</li>
          </ul>
        </section>

        {/* Formål og rettslig grunnlag */}
        <section>
          <h2 style={sectionTitle}>4. Formål og rettslig grunnlag</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Formål</th>
                <th style={thStyle}>Rettslig grunnlag</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Levere tjenesten og administrere din konto</td>
                <td style={tdStyle}>Avtale (GDPR art. 6(1)(b))</td>
              </tr>
              <tr>
                <td style={tdStyle}>Sende varsler om lusenivåer og behandlingsfrister</td>
                <td style={tdStyle}>Avtale / Samtykke</td>
              </tr>
              <tr>
                <td style={tdStyle}>Generere prediksjoner og analyser</td>
                <td style={tdStyle}>Berettiget interesse (GDPR art. 6(1)(f))</td>
              </tr>
              <tr>
                <td style={tdStyle}>Forbedre tjenesten og feilretting</td>
                <td style={tdStyle}>Berettiget interesse</td>
              </tr>
              <tr>
                <td style={tdStyle}>Overholde lovkrav (Mattilsynet-rapportering)</td>
                <td style={tdStyle}>Rettslig forpliktelse (GDPR art. 6(1)(c))</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Deling av opplysninger */}
        <section>
          <h2 style={sectionTitle}>5. Deling av personopplysninger</h2>
          <p>Vi deler kun personopplysninger med:</p>
          <ul style={listStyle}>
            <li><strong>Databehandlere:</strong> Skyleverandører (Supabase, hosting) som behandler data på våre vegne</li>
            <li><strong>Myndigheter:</strong> Når loven krever det (f.eks. Mattilsynet-rapporter)</li>
            <li><strong>Med ditt samtykke:</strong> Andre parter du godkjenner</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Vi selger aldri dine personopplysninger til tredjeparter.
          </p>
        </section>

        {/* Lagring og sikkerhet */}
        <section>
          <h2 style={sectionTitle}>6. Lagring og sikkerhet</h2>
          <p>
            Dine data lagres på sikre servere innen EU/EØS. Vi benytter følgende sikkerhetstiltak:
          </p>
          <ul style={listStyle}>
            <li>Kryptering under overføring (TLS/HTTPS)</li>
            <li>Kryptering ved lagring</li>
            <li>Tilgangskontroll og autentisering</li>
            <li>Regelmessig sikkerhetskopiering</li>
            <li>Logging og overvåking av tilgang</li>
          </ul>
        </section>

        {/* Lagringstid */}
        <section>
          <h2 style={sectionTitle}>7. Lagringstid</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Datatype</th>
                <th style={thStyle}>Lagringstid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Kontoinformasjon</td>
                <td style={tdStyle}>Så lenge kontoen er aktiv + 12 måneder</td>
              </tr>
              <tr>
                <td style={tdStyle}>Lusetellinger og behandlinger</td>
                <td style={tdStyle}>5 år (lovpålagt dokumentasjon)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Tekniske logger</td>
                <td style={tdStyle}>90 dager</td>
              </tr>
              <tr>
                <td style={tdStyle}>Mattilsynet-rapporter</td>
                <td style={tdStyle}>10 år</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Dine rettigheter */}
        <section>
          <h2 style={sectionTitle}>8. Dine rettigheter</h2>
          <p>Under GDPR har du følgende rettigheter:</p>
          <ul style={listStyle}>
            <li><strong>Innsyn:</strong> Be om kopi av alle opplysninger vi har om deg</li>
            <li><strong>Retting:</strong> Korrigere uriktige opplysninger</li>
            <li><strong>Sletting:</strong> Be om sletting av dine opplysninger ("retten til å bli glemt")</li>
            <li><strong>Begrensning:</strong> Begrense behandlingen av dine opplysninger</li>
            <li><strong>Dataportabilitet:</strong> Motta dine data i et maskinlesbart format</li>
            <li><strong>Innsigelse:</strong> Protestere mot behandling basert på berettiget interesse</li>
            <li><strong>Tilbaketrekking av samtykke:</strong> Når som helst trekke tilbake samtykke</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            For å utøve dine rettigheter, kontakt oss på <a href={`mailto:${companyEmail}`} style={linkStyle}>{companyEmail}</a>.
          </p>
        </section>

        {/* Informasjonskapsler */}
        <section>
          <h2 style={sectionTitle}>9. Informasjonskapsler (Cookies)</h2>
          <p>Vi bruker følgende informasjonskapsler:</p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Formål</th>
                <th style={thStyle}>Varighet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Nødvendige</td>
                <td style={tdStyle}>Innlogging, sikkerhet</td>
                <td style={tdStyle}>Sesjon</td>
              </tr>
              <tr>
                <td style={tdStyle}>Funksjonelle</td>
                <td style={tdStyle}>Brukerpreferanser, språk</td>
                <td style={tdStyle}>1 år</td>
              </tr>
              <tr>
                <td style={tdStyle}>Analytiske</td>
                <td style={tdStyle}>Bruksstatistikk (anonymisert)</td>
                <td style={tdStyle}>2 år</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '12px' }}>
            Du kan administrere dine preferanser i <a href="/innstillinger" style={linkStyle}>Innstillinger</a>.
          </p>
        </section>

        {/* Klage */}
        <section>
          <h2 style={sectionTitle}>10. Klage</h2>
          <p>
            Hvis du mener at vi behandler personopplysninger i strid med regelverket,
            kan du klage til Datatilsynet:
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong>Datatilsynet</strong><br />
            Postboks 458 Sentrum<br />
            0105 Oslo<br />
            <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              www.datatilsynet.no
            </a>
          </p>
        </section>

        {/* Endringer */}
        <section>
          <h2 style={sectionTitle}>11. Endringer i personvernerklæringen</h2>
          <p>
            Vi kan oppdatere denne personvernerklæringen ved behov. Ved vesentlige endringer
            vil vi varsle deg via e-post eller i applikasjonen. Fortsatt bruk av tjenesten
            etter endringer utgjør aksept av den oppdaterte erklæringen.
          </p>
        </section>

        {/* Kontakt */}
        <section style={{
          marginTop: '16px',
          padding: '20px',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <h2 style={{ ...sectionTitle, marginBottom: '12px' }}>Kontakt oss</h2>
          <p>
            Har du spørsmål om personvern eller ønsker å utøve dine rettigheter?
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong>E-post:</strong> <a href={`mailto:${companyEmail}`} style={linkStyle}>{companyEmail}</a>
          </p>
        </section>

      </div>
    </div>
  )
}

// Styles
const sectionTitle = {
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '12px',
  color: 'var(--text-primary)'
}

const subTitle = {
  fontSize: '15px',
  fontWeight: '500',
  marginTop: '16px',
  marginBottom: '8px',
  color: 'var(--text-primary)'
}

const listStyle = {
  marginLeft: '20px',
  marginTop: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '12px',
  fontSize: '14px'
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  background: 'var(--bg-card)',
  borderBottom: '2px solid var(--border)',
  fontWeight: '600'
}

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)'
}

const linkStyle = {
  color: 'var(--primary)',
  textDecoration: 'none'
}

export default PersonvernPage
