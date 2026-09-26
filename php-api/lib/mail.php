<?php
// Mail adapter — three transports, chosen by MAIL_TRANSPORT / SMTP_HOST / APP_ENV.
//
//   smtp  : real SMTP (needs SMTP_HOST). PHPMailer if present, else PHP mail().
//   mail  : PHP mail() — on cPanel this routes through the server's own sendmail
//           / mail() relay, so it usually works with zero configuration.
//   dev   : write the full message to the PHP error log ([mail:dev]) and send
//           nothing. Used by local dev + the e2e suites, which parse the log.
//
// Resolution order when MAIL_TRANSPORT is unset:
//   SMTP_HOST present -> smtp, else in development -> dev, else -> mail.
//
// The `mail` step is the important one for shared hosting: without it, a
// cPanel deploy that never sets SMTP_HOST would silently deliver NOTHING and
// every verification / password-reset link would vanish into the error log.
declare(strict_types=1);

function mailSend(array $opts): array
{
    $to      = (string)($opts['to'] ?? '');
    $subject = (string)($opts['subject'] ?? '');
    $text    = (string)($opts['text'] ?? '');
    $from    = (string)(getenv('MAIL_FROM') ?: 'ShiaRishta <no-reply@shiarishta.com>');

    $host     = trim((string)(getenv('SMTP_HOST') ?: ''));
    $transport = strtolower(trim((string)(getenv('MAIL_TRANSPORT') ?: '')));
    if ($transport === '') {
        $transport = $host !== '' ? 'smtp'
            : (((getenv('APP_ENV') ?: 'development') === 'production') ? 'mail' : 'dev');
    }

    if ($transport === 'dev') {
        return mailDevLog($to, $subject, $text);
    }
    if ($transport === 'smtp') {
        $port   = (int)getenv('SMTP_PORT') ?: 587;
        $user   = getenv('SMTP_USER') ?: '';
        $pass   = getenv('SMTP_PASS') ?: '';
        $secure = ($port === 465);
        if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            return mailPhpMailer($from, $to, $subject, $text, $host, $port, $user, $pass, $secure);
        }
        return mailNative($from, $to, $subject, $text);
    }
    // 'mail' (and 'auto' with no SMTP_HOST): cPanel's sendmail / mail() relay.
    return mailNative($from, $to, $subject, $text);
}

// Last resort: never lose the message, even if delivery failed. The e2e suites
// scrape these lines for the one-time verify/reset tokens.
function mailDevLog(string $to, string $subject, string $text): array
{
    error_log("[mail:dev] to=$to subject=\"$subject\"");
    error_log("[mail:dev] $text");
    return ['sent' => false, 'dev' => true, 'error' => 'dev transport: message logged, not delivered'];
}

function mailNative(string $from, string $to, string $subject, string $text): array
{
    // Reply-To is set separately: mail() takes the envelope sender in -f, and a
    // mismatched From breaks SPF/DKIM alignment on most hosts.
    $headers = "From: $from\r\n"
             . "Reply-To: $from\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n"
             . 'X-Mailer: ShiaRishta-PHP';
    $ok = @mail($to, $subject, $text, $headers);
    if ($ok) {
        error_log("[mail:mail] sent to=$to subject=\"$subject\"");
        return ['sent' => true, 'method' => 'mail'];
    }
    error_log("[mail:mail] FAILED to=$to subject=\"$subject\"");
    return mailDevLog($to, $subject, $text);
}

function mailPhpMailer(string $from, string $to, string $sub, string $text, string $host, int $port, string $user, string $pass, bool $secure): array
{
    $m = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $m->isSMTP();
        $m->Host = $host;
        $m->SMTPAuth = ($user !== '');
        $m->Username = $user;
        $m->Password = $pass;
        $m->SMTPSecure = $secure
            ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $m->Port = $port;
        $m->CharSet = 'UTF-8';
        $m->setFrom($from);
        $m->addReplyTo($from);
        $m->addAddress($to);
        $m->Subject = $sub;
        $m->Body = $text;
        $m->isHTML(false);
        $m->send();
        return ['sent' => true, 'method' => 'smtp'];
    } catch (Throwable $e) {
        error_log('[mail:smtp] failed: ' . $m->ErrorInfo);
        // Never drop the message on an SMTP error: retry through the host's own
        // mail() relay before giving up, then log.
        return mailNative($from, $to, $sub, $text);
    }
}
