================================================================================
CYBERDECK PORTFOLIO OS // AI COMM FEATURE SETUP GUIDE
DOKUMENTEN-AUFBEREITUNG & OCR FÜR DEN OPERATOR-CHAT
================================================================================

[DEUTSCH / GERMAN]
--------------------------------------------------------------------------------
WANN UND WARUM DIESE DATEI WICHTIG IST:
Wenn du dieses Portfolio-Projekt für dich selbst nutzt (geklont hast) und das
optionale Feature "AI AGENT COMM" (der interaktive KI-Chatbot im Portfolio) 
aktivieren möchtest, müssen deine Zertifikate, Arbeitszeugnisse und Dokumente 
vorab in reinen Text umgewandelt werden.

WARUM OFFLINE-EXTRAKTION STATT CLOUD-UPLOAD?
1. 100% Kostenlos & Offline: Deine Zeugnisse und PDF-Scans werden lokal auf 
   deinem Rechner (Localhost) per Python/OCR ausgelesen. Es fließen dabei keine 
   Daten in eine Cloud und es entstehen keine KI-Kosten für die Textextraktion.
2. Höchste Sicherheit: Auf dem Webserver existiert kein Dateiupload-Backend und 
   keine OCR-Engine. Der Webserver benötigt lediglich die fertige Datei 
   'data/documents_extracted.json'.
3. Minimale Token-Kosten: Google Gemini erhält bei Besucherfragen nur die 
   fertig extrahierten Textblöcke statt speicherintensiver Bild- und PDF-Dateien.

WIE WERDEN DATEIEN AUFBEREITET? (SCHRITT-FÜR-SCHRITT):
1. Lege deine Dokumente (PDF, DOCX, ODT, PNG, JPG) im Verzeichnis 'data/files/' 
   ab und referenziere sie in 'data/profile.json' oder 'data/projects.json'.
2. Installiere einmalig die Extraktions-Abhängigkeiten auf deinem Rechner:
   pip install -r tools/requirements.txt
   (Hinweis Windows: Nutzt automatisch das integrierte Windows.Media.Ocr.
    Hinweis Linux/macOS: Für Bild-Scans optional Tesseract OCR installieren).
3. Starte die Extraktion auf der Kommandozeile:
   - Unter Windows (PowerShell):
     .\tools\extract_document.ps1 -All
   - Unter Linux / macOS (Bash):
     ./tools/extract_document.sh --all
   - Plattformunabhängig per Python:
     python tools/extract_document.py --all
4. Das Skript analysiert alle Dokumente und schreibt das Ergebnis in die Datei
   'data/documents_extracted.json'.
5. Lade 'data/documents_extracted.json' zusammen mit deinen Web-Dateien auf 
   deinen Webspace hoch.
6. Aktiviere das Feature in 'data/config.php' über 'ai_chat_enabled' => true und 
   hinterlege dort deinen Google Gemini API-Key (bzw. Key-Pool).
   WICHTIGER HINWEIS ZU TERMS OF SERVICE & QUOTA-UMGEHUNG:
   Mehrere Gemini API-Keys dürfen nur unter Berücksichtigung der Google Terms of Service
   hinsichtlich des Umgehens von Nutzungsbeschränkungen (Quota Circumvention) genutzt
   werden. Beispielsweise kann es legitim sein, einen Key im Free-Tier mit einem Key im
   Pay-as-you-go-Tier als Ausfallsicherung zu kombinieren. Die Key-Pool-Funktion soll
   und darf NICHT dazu dienen, Ratenbegrenzungen (Rate Limits) künstlich zu umgehen.

AUSFÜHRLICHE ANLEITUNG & DOKUMENTATION:
Eine vollständige Anleitung mit Fehlerbehebung, API-Key-Setup und Datenschutz-
Hinweisen findest du in der Projekt-README auf GitHub:
-> https://github.com/schurigh/hannes-schurig-portfolio#4-optional-ki-agent-ai-comm--offline-dokumenten-extraktion


================================================================================
[ENGLISH]
--------------------------------------------------------------------------------
WHEN AND WHY THIS FILE MATTERS:
If you are using this portfolio for yourself (cloned from GitHub) and want to 
enable the optional "AI AGENT COMM" feature (the interactive AI chat agent in 
the portfolio), your certificates, references, and attachments must be 
pre-processed into plain text.

WHY OFFLINE EXTRACTION INSTEAD OF CLOUD UPLOADS?
1. 100% Free & Offline: Your PDFs, credentials, and scans are parsed locally on 
   your administrator workstation via Python/OCR. No sensitive documents leave 
   your machine, and no AI token costs are incurred during extraction.
2. Maximum Web Security: The production web server has no file-upload script and 
   no server-side OCR engine. It only reads the final 'data/documents_extracted.json'.
3. Token Efficiency: Google Gemini receives clean, structured text snippets 
   instead of multi-megabyte binary PDFs and images.

HOW TO PROCESS YOUR FILES (STEP-BY-STEP):
1. Place your files (PDF, DOCX, ODT, PNG, JPG) into the 'data/files/' folder and 
   reference them in 'data/profile.json' or 'data/projects.json'.
2. Install the extraction dependencies once on your workstation:
   pip install -r tools/requirements.txt
   (Windows note: Automatically utilizes native Windows.Media.Ocr.
    Linux/macOS note: Install Tesseract OCR if you need to scan raster images).
3. Run the extraction from your terminal:
   - Windows (PowerShell):
     .\tools\extract_document.ps1 -All
   - Linux / macOS (Bash):
     ./tools/extract_document.sh --all
   - Cross-platform via Python:
     python tools/extract_document.py --all
4. The tool processes all referenced documents and updates 
   'data/documents_extracted.json'.
5. Upload 'data/documents_extracted.json' to your web server.
6. Enable the feature in 'data/config.php' by setting 'ai_chat_enabled' => true 
   and entering your Google Gemini API key (or key pool).
   IMPORTANT NOTE ON TERMS OF SERVICE & QUOTA CIRCUMVENTION:
   Multiple Gemini API keys must only be used in strict compliance with Google's Terms
   of Service regarding quota circumvention. For example, it is legitimate to combine
   a Free-Tier key with a Pay-as-you-go-Tier key as a reliable fallback mechanism. The
   key pool feature is NOT intended to evade or circumvent rate limits.

DETAILED INSTRUCTIONS & DOCUMENTATION:
For full documentation on multi-key management, privacy compliance, and setup:
-> https://github.com/schurigh/hannes-schurig-portfolio#4-optional-ki-agent-ai-comm--offline-dokumenten-extraktion
================================================================================
