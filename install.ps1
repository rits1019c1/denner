# Denner CLI Installer for Windows
$ErrorActionPreference = "Stop"

Write-Host "🐍 Installing Denner CLI..." -ForegroundColor Cyan

# Define installation directory
$DennerDir = Join-Path $HOME ".denner"
$BinDir = Join-Path $DennerDir "bin"

if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
}

$Dest = Join-Path $BinDir "denner.exe"
$Url = "https://github.com/rits1019c1/denner/releases/latest/download/denner-win-x64.exe"

Write-Host "🔄 Downloading denner-win-x64.exe from GitHub..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
} catch {
    Write-Host "❌ Failed to download the Denner executable. Please check your internet connection." -ForegroundColor Red
    exit 1
}

Write-Host "✨ ----------------------------------------- ✨" -ForegroundColor Green
Write-Host "✅ Denner CLI has been successfully installed!" -ForegroundColor Green
Write-Host "✨ ----------------------------------------- ✨" -ForegroundColor Green

# Add to PATH if not already there
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -split ";" -notcontains $BinDir) {
    Write-Host "🔗 Adding $BinDir to User PATH..." -ForegroundColor Yellow
    $NewPath = "$UserPath;$BinDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "⚠️  PATH updated. Please restart your terminal/command prompt to apply changes." -ForegroundColor Yellow
} else {
    Write-Host "✅ Denner is already in your PATH." -ForegroundColor Green
}

Write-Host ""
Write-Host "Try it out:"
Write-Host "  > denner run my_script.den"
Write-Host "  > denner update"
Write-Host ""
