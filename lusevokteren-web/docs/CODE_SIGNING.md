# Windows Code Signing - Oppsettguide

## Hvorfor code signing?

Windows SmartScreen og antivirusprogrammer stoler mer på signert programvare. Uten signering vil brukere se advarsler som "Windows beskyttet PCen din" når de prøver å installere appen.

## Steg 1: Skaff et code signing-sertifikat

### Anbefalte leverandører (pris ca. 100-500 USD/år):

| Leverandør | Type | Pris/år | Lenke |
|------------|------|---------|-------|
| **Certum** | OV | ~100 USD | [certum.eu](https://www.certum.eu/en/code-signing-certificates/) |
| **Sectigo** | OV | ~200 USD | [sectigo.com](https://sectigo.com/ssl-certificates-tls/code-signing) |
| **DigiCert** | EV | ~400 USD | [digicert.com](https://www.digicert.com/signing/code-signing-certificates) |

**OV (Organization Validation)**: Raskere å skaffe, fungerer bra
**EV (Extended Validation)**: Dyrere, men gir umiddelbar SmartScreen-tillit

### For testing/utvikling:
Du kan lage et selv-signert sertifikat (kun for testing):

```powershell
# Kjør i PowerShell som Administrator
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=FjordVind Dev" -CertStoreLocation Cert:\CurrentUser\My
```

## Steg 2: Installer sertifikatet

### Fra .pfx-fil (fra CA):
1. Dobbeltklikk på .pfx-filen
2. Velg "Current User" eller "Local Machine"
3. Skriv inn passordet
4. Velg "Personal" certificate store

### Finn sertifikatets thumbprint:
```powershell
# List alle code signing-sertifikater
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Format-List Subject, Thumbprint

# Eller via GUI: certmgr.msc → Personal → Certificates
```

## Steg 3: Konfigurer Tauri

Oppdater `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "DITT_SERTIFIKAT_THUMBPRINT_HER",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.sectigo.com"
    }
  }
}
```

### Timestamp URLs (velg én):
- Sectigo: `http://timestamp.sectigo.com`
- DigiCert: `http://timestamp.digicert.com`
- Certum: `http://time.certum.pl`
- GlobalSign: `http://timestamp.globalsign.com/tsa/r6advanced1`

## Steg 4: Bygg signert installer

```bash
cd lusevokteren-web
npm run tauri build
```

Tauri vil automatisk signere MSI og EXE-filene.

## Steg 5: Verifiser signaturen

```powershell
# Sjekk signatur på MSI
Get-AuthenticodeSignature "src-tauri\target\release\bundle\msi\FjordVind_1.0.0_x64_en-US.msi"

# Eller høyreklikk → Properties → Digital Signatures
```

---

## GitHub Actions CI/CD

For automatisk signering i GitHub Actions, se `.github/workflows/release.yml`.

### GitHub Secrets som trengs:
| Secret | Beskrivelse |
|--------|-------------|
| `WINDOWS_CERTIFICATE` | Base64-encoded .pfx fil |
| `WINDOWS_CERTIFICATE_PASSWORD` | Passord for .pfx |

### Encode sertifikat til base64:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Out-File cert-base64.txt
```

---

## Feilsøking

### "Certificate not found"
- Sjekk at thumbprint er korrekt (ingen mellomrom)
- Verifiser at sertifikatet er installert i riktig store

### "The signature is invalid"
- Sertifikatet kan ha utløpt
- Timestamp-serveren kan være nede

### SmartScreen viser fortsatt advarsel
- Nye sertifikater trenger tid å bygge opp omdømme
- EV-sertifikater har umiddelbar tillit
- Jo flere brukere som installerer, jo bedre omdømme

---

## Kostnadsalternativer

### Gratis alternativer:
1. **SignPath Foundation** - Gratis for open source
2. **Azure Trusted Signing** - Inkludert i noen Azure-abonnementer

### Rimelige alternativer:
1. **Certum Open Source** - ~50 USD/år for open source
2. **SSL.com** - Fra ~75 USD/år
