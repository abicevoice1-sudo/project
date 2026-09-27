<?php
// Temp diagnostic: verify SMTP config and test SendGrid delivery
header('Content-Type: text/plain');
require __DIR__ . '/lib/mail.php';

echo "MAIL_TRANSPORT env: " . (getenv('MAIL_TRANSPORT') ?: '(empty)') . "\n";
echo "SMTP_HOST env: " . (getenv('SMTP_HOST') ? 'SET' : '(empty)') . "\n";
echo "SMTP_PORT env: " . (getenv('SMTP_PORT') ?: '(empty)') . "\n";
echo "SMTP_USER env: " . (getenv('SMTP_USER') ? 'SET' : '(empty)') . "\n";
echo "SMTP_PASS env: " . (getenv('SMTP_PASS') ? 'SET (' . strlen(getenv('SMTP_PASS')) . ' chars)' : '(empty)') . "\n";
echo "MAIL_FROM env: " . (getenv('MAIL_FROM') ?: '(empty)') . "\n";
echo "\n";

// Send test email via the mail adapter
$result = mailSend([
    'to' => 'abicevoice1@gmail.com',
    'subject' => 'ShiaRishta SendGrid Test ' . date('H:i:s'),
    'text' => "This is a test email sent via SendGrid SMTP from ShiaRishta.\nTime: " . date('Y-m-d H:i:s') . "\nIf you receive this, SendGrid delivery is working."
]);

echo "Send result: " . json_encode($result) . "\n";
echo "DONE\n";
