# FjordVind Windows Code Signing Script
# Usage: .\scripts\sign-windows.ps1 -Thumbprint "YOUR_CERT_THUMBPRINT"

param(
    [Parameter(Mandatory=$false)]
    [string]$Thumbprint,

    [Parameter(Mandatory=$false)]
    [string]$TimestampUrl = "http://timestamp.sectigo.com"
)

$ErrorActionPreference = "Stop"

Write-Host "FjordVind Windows Code Signing" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Find certificate if thumbprint not provided
if (-not $Thumbprint) {
    Write-Host "`nSoker etter code signing-sertifikater..." -ForegroundColor Yellow
    $certs = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert

    if ($certs.Count -eq 0) {
        Write-Host "FEIL: Ingen code signing-sertifikater funnet!" -ForegroundColor Red
        Write-Host "`nFor a opprette et test-sertifikat, kjor:" -ForegroundColor Yellow
        Write-Host 'New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=FjordVind Dev" -CertStoreLocation Cert:\CurrentUser\My' -ForegroundColor Gray
        exit 1
    }

    Write-Host "`nFunnet sertifikater:" -ForegroundColor Green
    $i = 1
    foreach ($cert in $certs) {
        Write-Host "  $i. $($cert.Subject)"
        Write-Host "     Thumbprint: $($cert.Thumbprint)"
        Write-Host "     Utloper: $($cert.NotAfter)"
        $i++
    }

    if ($certs.Count -eq 1) {
        $Thumbprint = $certs[0].Thumbprint
        Write-Host "`nBruker eneste sertifikat: $Thumbprint" -ForegroundColor Green
    } else {
        $selection = Read-Host "`nVelg sertifikat (1-$($certs.Count))"
        $Thumbprint = $certs[$selection - 1].Thumbprint
    }
}

# Update tauri.conf.json
$tauriConfigPath = "src-tauri\tauri.conf.json"
if (Test-Path $tauriConfigPath) {
    Write-Host "`nOppdaterer $tauriConfigPath..." -ForegroundColor Yellow

    $config = Get-Content $tauriConfigPath -Raw | ConvertFrom-Json
    $config.bundle.windows.certificateThumbprint = $Thumbprint
    $config.bundle.windows.timestampUrl = $TimestampUrl

    $config | ConvertTo-Json -Depth 10 | Set-Content $tauriConfigPath -Encoding UTF8

    Write-Host "Thumbprint satt til: $Thumbprint" -ForegroundColor Green
    Write-Host "Timestamp URL: $TimestampUrl" -ForegroundColor Green
}

# Build
Write-Host "`nBygger Tauri-app med signering..." -ForegroundColor Yellow
npm run tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBygg fullfort!" -ForegroundColor Green

    # Find built files
    $msiFiles = Get-ChildItem "src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue
    $exeFiles = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue

    Write-Host "`nSignerte filer:" -ForegroundColor Cyan
    foreach ($file in $msiFiles) {
        $sig = Get-AuthenticodeSignature $file.FullName
        Write-Host "  MSI: $($file.Name)"
        Write-Host "       Status: $($sig.Status)" -ForegroundColor $(if ($sig.Status -eq "Valid") { "Green" } else { "Yellow" })
    }
    foreach ($file in $exeFiles) {
        $sig = Get-AuthenticodeSignature $file.FullName
        Write-Host "  EXE: $($file.Name)"
        Write-Host "       Status: $($sig.Status)" -ForegroundColor $(if ($sig.Status -eq "Valid") { "Green" } else { "Yellow" })
    }
} else {
    Write-Host "`nBygg feilet!" -ForegroundColor Red
    exit 1
}

Write-Host "`nFerdig!" -ForegroundColor Green
