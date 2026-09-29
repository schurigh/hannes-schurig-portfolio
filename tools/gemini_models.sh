#!/usr/bin/env bash
# ============================================================
# CyberDeck Portfolio - Google Gemini Modell-Discovery & Test
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_SCRIPT="$SCRIPT_DIR/gemini_models.php"

if ! command -v php &> /dev/null; then
    echo "[FEHLER] PHP ist nicht im PATH installiert."
    exit 1
fi

php "$PHP_SCRIPT" "$@"
