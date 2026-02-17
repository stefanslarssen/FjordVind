# Mobilapp-publisering - App Store & Google Play

## Oversikt

FjordVind-mobilappen er bygget med Capacitor og kan publiseres til både Apple App Store og Google Play Store.

---

## Del 1: Google Play Store (Android)

### Steg 1: Opprett utviklerkonto

1. Gå til [Google Play Console](https://play.google.com/console)
2. Betal engangsavgift ($25 USD)
3. Fyll ut utviklerinformasjon

### Steg 2: Generer signeringsnøkkel

```bash
# Generer keystore (gjør dette kun én gang!)
keytool -genkey -v -keystore fjordvind-release.keystore \
  -alias fjordvind \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Oppbevar denne filen trygt! Den trengs for alle fremtidige oppdateringer.
```

### Steg 3: Konfigurer signering i Android

Opprett `android/keystore.properties` (IKKE commit til git!):

```properties
storePassword=DITT_KEYSTORE_PASSORD
keyPassword=DITT_KEY_PASSORD
keyAlias=fjordvind
storeFile=../fjordvind-release.keystore
```

### Steg 4: Oppdater build.gradle

Filen `android/app/build.gradle` er allerede konfigurert. Legg til signeringskonfigurasjon:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('KEYSTORE_FILE')) {
                storeFile file(KEYSTORE_FILE)
                storePassword KEYSTORE_PASSWORD
                keyAlias KEY_ALIAS
                keyPassword KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Steg 5: Bygg release APK/AAB

```bash
# Oppdater web-kode først
npm run build
npx cap sync android

# Bygg release bundle (anbefalt for Play Store)
cd android
./gradlew bundleRelease

# Eller bygg APK
./gradlew assembleRelease
```

Output finner du i:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### Steg 6: Opprett app i Play Console

1. Gå til [Play Console](https://play.google.com/console)
2. Klikk "Create app"
3. Fyll ut:
   - App name: `FjordVind - Luseovervåking`
   - Default language: `Norwegian (nb-NO)`
   - App or game: `App`
   - Free or paid: `Paid` (eller `Free` med in-app kjøp)

### Steg 7: Fyll ut store-oppføring

| Felt | Verdi |
|------|-------|
| Tittel | FjordVind - Luseovervåking |
| Kort beskrivelse | Profesjonell luseovervåking for norsk oppdrettsnæring |
| Full beskrivelse | Se `store-listing.md` |
| Kategori | Business |
| Kontakt e-post | support@fjordvind.no |

### Steg 8: Last opp skjermbilder

Krav:
- Telefon: Minimum 2 skjermbilder (1080x1920 eller lignende)
- Tablet 7": Valgfritt
- Tablet 10": Valgfritt

### Steg 9: Innholdsvurdering

1. Gå til "Content rating"
2. Fyll ut IARC-spørreskjema
3. Appen vil typisk få "Everyone" rating

### Steg 10: Pris og distribusjon

1. Sett pris eller "Free" med abonnement
2. Velg land (Norge, eller alle)
3. Godta utvikleravtalen

### Steg 11: Last opp og publiser

1. Gå til "Production" → "Create new release"
2. Last opp `.aab`-filen
3. Skriv release notes
4. Send til gjennomgang

**Gjennomgangstid:** Vanligvis 1-3 dager for nye apper.

---

## Del 2: Apple App Store (iOS)

### Steg 1: Opprett utviklerkonto

1. Gå til [Apple Developer](https://developer.apple.com)
2. Meld deg på Apple Developer Program ($99 USD/år)
3. Vent på godkjenning (kan ta 24-48 timer)

### Steg 2: Opprett App ID

1. Gå til [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
2. Klikk "Identifiers" → "+"
3. Velg "App IDs" → "App"
4. Fyll ut:
   - Description: `FjordVind Lusevokteren`
   - Bundle ID: `no.fjordvind.lusevokteren` (Explicit)
5. Velg Capabilities:
   - Push Notifications
   - Associated Domains (for deep links)

### Steg 3: Opprett provisioning profiler

1. I "Certificates, Identifiers & Profiles":
   - Opprett Distribution Certificate (iOS Distribution)
   - Opprett App Store provisioning profile

### Steg 4: Konfigurer Xcode

```bash
# Åpne i Xcode
npx cap open ios
```

I Xcode:
1. Velg prosjektet i navigator
2. Under "Signing & Capabilities":
   - Team: Velg ditt team
   - Bundle Identifier: `no.fjordvind.lusevokteren`
   - Signing Certificate: iOS Distribution

### Steg 5: Oppdater versjonsnummer

I Xcode:
- Version: `1.0.0`
- Build: `1` (øk for hver opplasting)

### Steg 6: Bygg for App Store

```bash
# Oppdater web-kode først
npm run build
npx cap sync ios

# Åpne i Xcode
npx cap open ios
```

I Xcode:
1. Velg "Any iOS Device" som target
2. Product → Archive
3. Når arkivet er klart, klikk "Distribute App"
4. Velg "App Store Connect" → "Upload"

### Steg 7: Opprett app i App Store Connect

1. Gå til [App Store Connect](https://appstoreconnect.apple.com)
2. Klikk "My Apps" → "+"
3. Fyll ut:
   - Platform: iOS
   - Name: `FjordVind - Luseovervåking`
   - Primary Language: Norwegian
   - Bundle ID: `no.fjordvind.lusevokteren`
   - SKU: `fjordvind-lusevokteren`

### Steg 8: Fyll ut app-informasjon

| Felt | Verdi |
|------|-------|
| Subtitle | Profesjonell luseovervåking |
| Kategori | Business |
| Aldersgrense | 4+ |
| Pris | Tier basert på abonnement |

### Steg 9: Last opp skjermbilder

Krav:
- iPhone 6.7" (1290 × 2796): Minimum 3 skjermbilder
- iPhone 6.5" (1242 × 2688): Minimum 3 skjermbilder
- iPad Pro 12.9" (2048 × 2732): Valgfritt

### Steg 10: App Review informasjon

Fyll ut:
- Kontaktinformasjon for gjennomgang
- Demo-konto (hvis appen krever innlogging)
- Notater til gjennomganger

### Steg 11: Send til gjennomgang

1. Velg bygget du lastet opp
2. Fyll ut eksportoverensstemmelse
3. Klikk "Submit for Review"

**Gjennomgangstid:** Vanligvis 24-48 timer, kan ta opptil 1 uke.

---

## Del 3: Automatisert CI/CD

### GitHub Actions for mobilbygging

Se `.github/workflows/mobile-release.yml` for automatisert bygging.

### Nødvendige GitHub Secrets

**Android:**
| Secret | Beskrivelse |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore-passord |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key-passord |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Service account JSON for Play Console |

**iOS:**
| Secret | Beskrivelse |
|--------|-------------|
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded .p12 sertifikat |
| `APPLE_CERTIFICATE_PASSWORD` | Sertifikat-passord |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile |
| `APP_STORE_CONNECT_API_KEY` | API-nøkkel for App Store Connect |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |

---

## Del 4: Sjekkliste før publisering

### Generelt
- [ ] App-ikon i alle størrelser
- [ ] Splash screen
- [ ] Personvernerklæring-URL
- [ ] Brukervilkår-URL
- [ ] Support-URL/e-post

### Google Play
- [ ] Feature graphic (1024 × 500)
- [ ] Skjermbilder (min. 2)
- [ ] Kort beskrivelse (maks 80 tegn)
- [ ] Full beskrivelse (maks 4000 tegn)
- [ ] Innholdsvurdering fullført
- [ ] Data safety-skjema fullført

### App Store
- [ ] Skjermbilder for alle enhetsstørrelser
- [ ] App Preview-video (valgfritt)
- [ ] Beskrivelse
- [ ] Keywords
- [ ] Eksportoverensstemmelse
- [ ] IDFA-erklæring

---

## Del 5: Oppdateringer

### Versjonering

Bruk semantisk versjonering:
- **Major** (1.0.0 → 2.0.0): Store endringer
- **Minor** (1.0.0 → 1.1.0): Ny funksjonalitet
- **Patch** (1.0.0 → 1.0.1): Bugfixes

### Oppdater versjon

```bash
# Oppdater package.json
npm version patch  # eller minor/major

# Oppdater Capacitor-konfig
# capacitor.config.json - oppdater manuelt

# Synkroniser til native prosjekter
npx cap sync
```

### Android versionCode

I `android/app/build.gradle`, øk `versionCode` for hver release:
```gradle
versionCode 2  // Øk med 1 for hver release
versionName "1.0.1"
```

### iOS Build Number

I Xcode, øk "Build" for hver opplasting (f.eks. 1, 2, 3...).
