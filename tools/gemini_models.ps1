<#
.SYNOPSIS
    CyberDeck Portfolio - Google Gemini Modell-Discovery & Test Tool

.DESCRIPTION
    Fragt Google Gemini nach allen verfuegbaren Modellen ab und testet
    die in data/config.php konfigurierten gemini_models auf Funktionsfaehigkeit.

.EXAMPLE
    .\tools\gemini_models.ps1 discover
    .\tools\gemini_models.ps1 test
    .\tools\gemini_models.ps1 all
#>

param(
    [Parameter(Position = 0)]
    [string]$Command = "all",

    [string]$Key,
    [string]$Model
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$phpScript = Join-Path $scriptDir "gemini_models.php"

$phpArgs = @($phpScript, $Command)
if ($Key) { $phpArgs += "--key=$Key" }
if ($Model) { $phpArgs += "--model=$Model" }

php @phpArgs
