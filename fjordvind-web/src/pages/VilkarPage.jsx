/**
 * Brukervilkår / Terms of Service
 * Tjenestevilkår for FjordVind
 */

function VilkarPage() {
  const lastUpdated = '1. februar 2026'
  const companyName = 'FjordVind AS'
  const companyEmail = 'support@fjordvind.no'

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '600',
        marginBottom: '8px',
        color: 'var(--text-primary)'
      }}>
        Brukervilkår
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

        {/* 1. Aksept av vilkår */}
        <section>
          <h2 style={sectionTitle}>1. Aksept av vilkår</h2>
          <p>
            Ved å opprette en konto eller bruke FjordVind-applikasjonen ("Tjenesten")
            godtar du disse brukervilkårene. Hvis du ikke godtar vilkårene, må du ikke
            bruke Tjenesten.
          </p>
          <p style={{ marginTop: '12px' }}>
            Tjenesten leveres av {companyName}.
          </p>
        </section>

        {/* 2. Tjenestebeskrivelse */}
        <section>
          <h2 style={sectionTitle}>2. Tjenestebeskrivelse</h2>
          <p>
            FjordVind er en digital plattform for overvåking og håndtering av lakselus
            i oppdrettsanlegg. Tjenesten tilbyr:
          </p>
          <ul style={listStyle}>
            <li>Registrering og sporing av lusetellinger</li>
            <li>Prediktiv analyse av luseutvikling</li>
            <li>Varsler ved høye lusenivåer</li>
            <li>Rapportgenerering for Mattilsynet</li>
            <li>Sammenligning med nabolokaliteter</li>
            <li>Behandlingshistorikk og planlegging</li>
          </ul>
        </section>

        {/* 3. Brukerkonto */}
        <section>
          <h2 style={sectionTitle}>3. Brukerkonto</h2>

          <h3 style={subTitle}>3.1 Registrering</h3>
          <p>
            For å bruke Tjenesten må du opprette en brukerkonto med gyldig e-postadresse.
            Du er ansvarlig for å oppgi korrekt informasjon og holde kontoinformasjonen oppdatert.
          </p>

          <h3 style={subTitle}>3.2 Kontosikkerhet</h3>
          <p>
            Du er ansvarlig for å beskytte ditt passord og all aktivitet som skjer på din konto.
            Ved mistanke om uautorisert tilgang må du umiddelbart varsle oss og endre passord.
          </p>

          <h3 style={subTitle}>3.3 Bedriftskontoer</h3>
          <p>
            Hvis du registrerer deg på vegne av en bedrift, bekrefter du at du har myndighet
            til å binde bedriften til disse vilkårene.
          </p>
        </section>

        {/* 4. Brukerens forpliktelser */}
        <section>
          <h2 style={sectionTitle}>4. Brukerens forpliktelser</h2>
          <p>Ved bruk av Tjenesten forplikter du deg til å:</p>
          <ul style={listStyle}>
            <li>Registrere korrekte og nøyaktige lusetellinger</li>
            <li>Ikke misbruke Tjenesten eller forstyrre andre brukere</li>
            <li>Ikke forsøke å omgå sikkerhetsfunksjoner</li>
            <li>Ikke bruke Tjenesten til ulovlige formål</li>
            <li>Overholde gjeldende lover og forskrifter for akvakultur</li>
          </ul>
        </section>

        {/* 5. Data og innhold */}
        <section>
          <h2 style={sectionTitle}>5. Data og innhold</h2>

          <h3 style={subTitle}>5.1 Dine data</h3>
          <p>
            Du beholder eierskap til alle data du registrerer i Tjenesten (lusetellinger,
            behandlinger, etc.). Du gir oss lisens til å lagre, behandle og vise disse
            dataene for å levere Tjenesten.
          </p>

          <h3 style={subTitle}>5.2 Aggregerte data</h3>
          <p>
            Vi kan bruke anonymiserte og aggregerte data til å forbedre Tjenesten,
            utvikle nye funksjoner og lage bransjestatistikk. Slike data vil ikke
            kunne spores tilbake til deg eller din bedrift.
          </p>

          <h3 style={subTitle}>5.3 Offentlige data</h3>
          <p>
            Tjenesten integrerer offentlige data fra BarentsWatch, Fiskeridirektoratet
            og andre kilder. Vi garanterer ikke nøyaktigheten av slike tredjepartsdata.
          </p>
        </section>

        {/* 6. Priser og betaling */}
        <section>
          <h2 style={sectionTitle}>6. Priser og betaling</h2>

          <h3 style={subTitle}>6.1 Abonnement</h3>
          <p>
            Tjenesten tilbys som månedlig eller årlig abonnement. Gjeldende priser
            finnes på vår nettside. Priser oppgis ekskl. mva. med mindre annet er oppgitt.
          </p>

          <h3 style={subTitle}>6.2 Betaling</h3>
          <p>
            Betaling skjer forskuddsvis. Ved manglende betaling kan vi suspendere
            tilgangen til Tjenesten inntil utestående beløp er betalt.
          </p>

          <h3 style={subTitle}>6.3 Prisendringer</h3>
          <p>
            Vi kan endre priser med 30 dagers varsel. Prisendringer trer i kraft
            ved neste fornyelse av abonnementet.
          </p>
        </section>

        {/* 7. Immaterielle rettigheter */}
        <section>
          <h2 style={sectionTitle}>7. Immaterielle rettigheter</h2>
          <p>
            {companyName} eier alle immaterielle rettigheter til Tjenesten, inkludert
            programvare, design, logoer og varemerker. Du får en begrenset,
            ikke-eksklusiv lisens til å bruke Tjenesten i henhold til disse vilkårene.
          </p>
          <p style={{ marginTop: '12px' }}>
            Du har ikke rett til å kopiere, modifisere, distribuere eller lage
            avledede verk av Tjenesten uten skriftlig samtykke.
          </p>
        </section>

        {/* 8. Ansvarsfraskrivelse */}
        <section>
          <h2 style={sectionTitle}>8. Ansvarsbegrensning</h2>

          <h3 style={subTitle}>8.1 Tjenestens tilgjengelighet</h3>
          <p>
            Vi tilstreber høy oppetid, men garanterer ikke uavbrutt tilgang.
            Planlagt vedlikehold varsles på forhånd når mulig.
          </p>

          <h3 style={subTitle}>8.2 Prediksjoner og anbefalinger</h3>
          <p>
            Prediksjoner og anbefalinger i Tjenesten er veiledende og basert på
            statistiske modeller. Du er selv ansvarlig for beslutninger basert
            på informasjon fra Tjenesten.
          </p>

          <h3 style={subTitle}>8.3 Ansvarsbegrensning</h3>
          <p>
            Vårt erstatningsansvar er begrenset til direkte tap og maksimalt
            beløpet du har betalt for Tjenesten de siste 12 måneder. Vi er ikke
            ansvarlige for indirekte tap, tapt fortjeneste eller følgeskader.
          </p>
        </section>

        {/* 9. Oppsigelse */}
        <section>
          <h2 style={sectionTitle}>9. Oppsigelse</h2>

          <h3 style={subTitle}>9.1 Din oppsigelse</h3>
          <p>
            Du kan når som helst si opp abonnementet via Innstillinger eller ved å
            kontakte oss. Oppsigelsen trer i kraft ved utløpet av gjeldende
            betalingsperiode.
          </p>

          <h3 style={subTitle}>9.2 Vår oppsigelse</h3>
          <p>
            Vi kan suspendere eller avslutte din tilgang ved brudd på disse vilkårene,
            manglende betaling, eller ved ulovlig aktivitet. Ved vesentlige brudd
            kan oppsigelse skje med umiddelbar virkning.
          </p>

          <h3 style={subTitle}>9.3 Etter oppsigelse</h3>
          <p>
            Etter oppsigelse kan du eksportere dine data i 30 dager. Deretter
            slettes dataene i henhold til vår personvernerklæring.
          </p>
        </section>

        {/* 10. Endringer i vilkårene */}
        <section>
          <h2 style={sectionTitle}>10. Endringer i vilkårene</h2>
          <p>
            Vi kan endre disse vilkårene med 30 dagers varsel. Endringer varsles
            via e-post og/eller i Tjenesten. Fortsatt bruk etter endringene trer
            i kraft utgjør aksept av de nye vilkårene.
          </p>
        </section>

        {/* 11. Lovvalg og tvister */}
        <section>
          <h2 style={sectionTitle}>11. Lovvalg og tvister</h2>
          <p>
            Disse vilkårene er underlagt norsk lov. Tvister som ikke løses i
            minnelighet skal avgjøres av norske domstoler med Oslo tingrett
            som verneting.
          </p>
        </section>

        {/* 12. Force Majeure */}
        <section>
          <h2 style={sectionTitle}>12. Force Majeure</h2>
          <p>
            Vi er ikke ansvarlige for manglende oppfyllelse som skyldes forhold
            utenfor vår kontroll, inkludert men ikke begrenset til naturkatastrofer,
            krig, streik, strømbrudd eller internettforstyrrelser.
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
          <h2 style={{ ...sectionTitle, marginBottom: '12px' }}>Kontakt</h2>
          <p>
            Har du spørsmål om disse vilkårene?
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong>E-post:</strong> <a href={`mailto:${companyEmail}`} style={linkStyle}>{companyEmail}</a>
          </p>
        </section>

        {/* Relaterte dokumenter */}
        <section style={{ marginTop: '8px' }}>
          <h3 style={subTitle}>Relaterte dokumenter</h3>
          <ul style={{ ...listStyle, marginLeft: '0' }}>
            <li>
              <a href="/personvern" style={linkStyle}>Personvernerklæring</a>
            </li>
          </ul>
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

const linkStyle = {
  color: 'var(--primary)',
  textDecoration: 'none'
}

export default VilkarPage
