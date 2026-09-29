<?php
/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Configuration Blueprint / Blueprint
 * ============================================================
 * Copy this file to 'data/config.php' to configure private parameters.
 * 'data/config.php' is included in .gitignore and will NEVER be committed to Git.
 */

return [
    // Recipient email address for encrypted dispatch / contact form
    'contact_recipient' => 'your-email@example.com',

    // Optional custom sender domain for the From-header (e.g. 'vibecoding.de')
    // If left empty, the system safely auto-detects from the server
    'mail_domain'       => '',

    // System display name for outgoing dispatches
    'mail_from_name'    => 'CyberDeck Dispatch',

    // ========================================================================
    // AI AGENT COMM - DATENSCHUTZ-HINWEIS & COMPLIANCE-DISCLAIMER
    // ========================================================================
    // DEUTSCH:
    // Bei Aktivierung des AI-Agent-Features ('ai_chat_enabled' => true) werden die
    // Systemdaten in zwei getrennten Stufen verarbeitet:
    // 1) Textextraktion / OCR: Nicht-reine Textformate (PDF, DOCX, ODT, Bilder) werden
    //    primär LOKAL auf deinem Rechner ausgelesen ('tools/extract_document.py').
    //    Es fließen dabei keine Daten in eine Cloud, solange lokale Parser greifen.
    // 2) KI-Beantwortung (Google Gemini): Bei jeder Besucherfrage werden der aufbereitete
    //    Textkontext (Profil, Projekte, extrahierte Zeugnistexte) sowie die Nutzerfrage
    //    verschlüsselt an die Google Gemini REST-API übertragen und dort verarbeitet.
    // WICHTIG: Bitte informiere dich vor der Aktivierung über die Google-Datenschutz-
    // bestimmungen und stelle sicher, dass du mit der Verarbeitung deiner Daten
    // durch Google einverstanden bist.
    //
    // ENGLISH:
    // When enabling the AI Agent feature ('ai_chat_enabled' => true), system data
    // is processed in two distinct stages:
    // 1) Text Extraction / OCR: Non-plain text files (PDF, DOCX, ODT, Images) are
    //    extracted primarily LOCALLY on your machine ('tools/extract_document.py').
    //    No data leaves your workstation as long as local parsers are utilized.
    // 2) AI Q&A (Google Gemini): Upon every user query, the processed text context
    //    (profile, projects, extracted certificate texts) and the user prompt are sent
    //    encrypted to the Google Gemini REST API and processed there.
    // IMPORTANT: Please review Google's Privacy Policy & API Terms prior to activation
    // and ensure you consent to the processing of your data by Google.
    // ========================================================================

    // Enable or disable the AI Agent Q&A feature (Default: false)
    'ai_chat_enabled'   => false,

    // Google Gemini API keys pool (obtain keys at https://aistudio.google.com/)
    // ------------------------------------------------------------------------
    // WICHTIGER COMPLIANCE-HINWEIS (Google Terms of Service & Quota Circumvention):
    // Mehrere Gemini API-Keys dürfen ausschließlich unter Beachtung der Google
    // Terms of Service in Bezug auf das Umgehen von Nutzungsbeschränkungen (Quota
    // Circumvention) genutzt werden. Beispielsweise kann es legitim sein, einen
    // Key im Free-Tier mit einem Key im Pay-as-you-go-Tier als Ausfallsicherung
    // zu kombinieren oder verschiedene Billing-Projekte zu trennen. Die Key-Pool-
    // Funktion soll und darf NICHT dazu dienen, Ratenbegrenzungen (Rate Limits)
    // künstlich zu umgehen.
    // 
    // IMPORTANT COMPLIANCE NOTE (Google Terms of Service & Quota Circumvention):
    // Multiple Gemini API keys must only be used in strict accordance with Google's
    // Terms of Service regarding quota circumvention. For instance, combining a
    // Free-Tier key with a Pay-as-you-go key as a reliable failover mechanism is
    // permissible. This key pool must NOT be used to evade rate limits.
    // ------------------------------------------------------------------------
    'gemini_api_keys'   => [
        // 'AIzaSyYourApiKeyHere...',
    ],

    // Model cascade for graceful degradation (Failover bei hoher Auslastung / 503)
    // ------------------------------------------------------------------------
    // TIPP: Google aktualisiert Modell-IDs regelmäßig. Führe folgende Befehle aus:
    //   php tools/gemini_models.php discover   -> Alle für deinen Key verfügbaren Modelle
    //   php tools/gemini_models.php test       -> Prüft diese Config auf Funktion (200 / 404 / 429)
    // ------------------------------------------------------------------------
    'gemini_models'     => [
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-pro-preview'
    ]
];
