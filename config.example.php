<?php
/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Configuration Blueprint / Blueprint
 * ============================================================
 * Copy this file to 'config.local.php' to configure private parameters.
 * 'config.local.php' is included in .gitignore and will NEVER be committed to Git.
 */

return [
    // Recipient email address for encrypted dispatch / contact form
    'contact_recipient' => 'your-email@example.com',

    // Optional custom sender domain for the From-header (e.g. 'vibecoding.de')
    // If left empty, the system safely auto-detects from the server
    'mail_domain'       => '',

    // System display name for outgoing dispatches
    'mail_from_name'    => 'CyberDeck Dispatch'
];
