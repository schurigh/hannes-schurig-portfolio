<#
.SYNOPSIS
    CyberDeck Portfolio - Lokales Offline OCR & Textextraktions-Skript

.DESCRIPTION
    Extrahiert Text aus PDF, DOCX, ODT, Bildern und Textdateien 100% lokal ohne KI.
    Speichert alle Ergebnisse strukturiert in data/documents_extracted.json.
    Hinweis / Datenschutz: Bitte prüfe data/documents_extracted.json vor dem Upload auf sensible private Daten und schwärze diese bei Bedarf.

.PARAMETER File
    Pfad zu einer spezifischen Datei (z. B. data\files\mein_zeugnis.pdf).

.PARAMETER All
    Verarbeitet alle in data/profile.json und data/projects.json referenzierten Dateien.

.PARAMETER Force
    Bereits verarbeitete Dateien erneut analysieren und überschreiben.

.EXAMPLE
    .\tools\extract_document.ps1 -All
    .\tools\extract_document.ps1 -File "data\files\2017_Studium.pdf"
    .\tools\extract_document.ps1 -All -Force
#>

param(
    [Parameter(Position = 0)]
    [string]$File,

    [switch]$All,
    [switch]$Force,
    [string]$Out
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyScript = Join-Path $scriptDir "extract_document.py"

# Finde verfügbaren Python-Interpreter
$pythonCmd = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Python314\python.exe") {
        $pythonCmd = "C:\Python314\python.exe"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
        $pythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    }
}

$pyArgs = @($pyScript)

if ($All) {
    $pyArgs += "--all"
} elseif ($File) {
    $pyArgs += $File
} else {
    Write-Host "Verwendung:" -ForegroundColor Cyan
    Write-Host "  .\tools\extract_document.ps1 -All" -ForegroundColor Yellow
    Write-Host "  .\tools\extract_document.ps1 -File 'data\files\meine_datei.pdf'" -ForegroundColor Yellow
    Write-Host "  .\tools\extract_document.ps1 -All -Force" -ForegroundColor Yellow
    exit 0
}

if ($Force) {
    $pyArgs += "--force"
}

if ($Out) {
    $pyArgs += "--out"
    $pyArgs += $Out
}

Write-Host ">> Starte CyberDeck OCR / Textextraktion..." -ForegroundColor Green
& $pythonCmd $pyArgs
