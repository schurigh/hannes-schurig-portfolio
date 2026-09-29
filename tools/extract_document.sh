#!/usr/bin/env bash
# =============================================================================
# CYBERDECK PORTFOLIO - Offline OCR & Text Extraction (Linux / macOS Wrapper)
# Hinweis / Datenschutz: Prüfe data/documents_extracted.json vor dem Upload auf sensible private Daten.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Finde python3 oder python
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "[FEHLER] Python 3 wurde nicht gefunden. Bitte installiere Python 3."
    exit 1
fi

exec "$PYTHON_CMD" "$SCRIPT_DIR/extract_document.py" "$@"
