param(
    [switch]$CreateUploadKey,
    [string]$UnsignedBundle,
    [string]$OutFile
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $UnsignedBundle) { $UnsignedBundle = Join-Path $root 'android\app\build\outputs\bundle\release\app-release.aab' }
if (-not $OutFile) { $OutFile = Join-Path $root 'release\play\Povazhaite-Svoie.aab' }
if (-not (Test-Path -LiteralPath $UnsignedBundle -PathType Leaf)) { throw 'Build :app:bundleRelease first.' }
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to JDK 21.' }
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$signer = Join-Path $env:JAVA_HOME 'bin\jarsigner.exe'
foreach ($exe in @($keytool,$signer)) {
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw "Missing JDK tool: $exe" }
}
$private = Join-Path $env:USERPROFILE '.android\svoie-upload'
$keystore = Join-Path $private 'upload.p12'
$protected = Join-Path $private 'password.pass.dpapi'
$exists = Test-Path -LiteralPath $keystore -PathType Leaf
if ($exists -ne (Test-Path -LiteralPath $protected -PathType Leaf)) { throw 'Incomplete upload key. Restore the existing backup before proceeding.' }
if (-not $exists -and -not $CreateUploadKey) { throw 'No upload key. Use -CreateUploadKey only for the first bundle of a new Play app.' }
$null = New-Item -ItemType Directory -Path (Split-Path $OutFile -Parent) -Force
$pass = $null; $plainPtr = [IntPtr]::Zero
try {
    if (-not $exists) {
        $null = New-Item -ItemType Directory -Path $private -Force
        $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
        & icacls.exe $private /inheritance:r /grant:r ('*{0}:(OI)(CI)F' -f $sid.Value) | Out-Null
        if ($LASTEXITCODE) { throw 'Could not restrict access to the upload key folder.' }
        $random = [byte[]]::new(36); $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($random) } finally { $rng.Dispose() }
        $pass = ConvertTo-SecureString ([Convert]::ToBase64String($random)) -AsPlainText -Force
        [Array]::Clear($random,0,$random.Length)
        $pass | ConvertFrom-SecureString | Set-Content -LiteralPath $protected -Encoding Ascii
    } else { $pass = Get-Content -LiteralPath $protected -Raw | ForEach-Object { ConvertTo-SecureString $_.Trim() } }
    $plainPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
    $env:SVOIE_SIGN_ONCE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($plainPtr)
    if (-not $exists) {
        & $keytool -genkeypair -alias upload -keystore $keystore -storetype PKCS12 -storepass:env SVOIE_SIGN_ONCE -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=Povazhaite Svoie Upload' -noprompt
        if ($LASTEXITCODE) { throw 'Could not generate upload certificate.' }
    }
    & $signer -keystore $keystore -storetype PKCS12 -storepass:env SVOIE_SIGN_ONCE -sigalg SHA256withRSA -digestalg SHA-256 -signedjar $OutFile $UnsignedBundle upload
    if ($LASTEXITCODE) { throw 'Bundle signing failed.' }
    # Check every signed entry against this specific upload key; don't trust a debug key.
    & $signer -verify -strict -keystore $keystore -storepass:env SVOIE_SIGN_ONCE $OutFile upload
    if ($LASTEXITCODE) { throw 'Bundle signature verification failed.' }
    & $keytool -exportcert -rfc -alias upload -keystore $keystore -storepass:env SVOIE_SIGN_ONCE -file (Join-Path $private 'upload-public.pem')
    if ($LASTEXITCODE) { throw 'Public certificate export failed.' }
    Write-Output "Signed bundle: $OutFile"
} finally {
    Remove-Item Env:SVOIE_SIGN_ONCE -ErrorAction SilentlyContinue
    if ($plainPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($plainPtr) }
    if ($pass) { $pass.Dispose() }
}
