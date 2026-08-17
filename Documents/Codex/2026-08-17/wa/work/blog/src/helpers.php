<?php
declare(strict_types=1);

function app_root(): string
{
    return dirname(__DIR__);
}

function app_config(): array
{
    static $config;

    if ($config === null) {
        $config = require app_root() . '/src/config.php';
    }

    return $config;
}

function public_path(string $path = ''): string
{
    $base = app_root() . '/public';

    return $path === '' ? $base : $base . '/' . ltrim($path, '/');
}

function data_path(string $path = ''): string
{
    $base = app_root() . '/data';

    return $path === '' ? $base : $base . '/' . ltrim($path, '/');
}

function db_path(): string
{
    return data_path('blog.sqlite');
}

function db_dsn(): string
{
    return 'sqlite:' . db_path();
}

function template_path(string $name): string
{
    return app_root() . '/templates/' . ltrim($name, '/');
}

function html_escape(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect_to(string $path): void
{
    header('Location: ' . $path);
    exit;
}

function is_post_request(): bool
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function ensure_directory(string $path): void
{
    if (!is_dir($path)) {
        mkdir($path, 0777, true);
    }
}

function flash_set(string $type, string $message): void
{
    $_SESSION['flash'] = [
        'type' => $type,
        'message' => $message,
    ];
}

function flash_pull(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);

    return $flash;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function verify_csrf_token(?string $token): bool
{
    return is_string($token) && hash_equals(csrf_token(), $token);
}

function site_name(): string
{
    return app_config()['site_name'];
}

function site_tagline(): string
{
    return app_config()['site_tagline'];
}

function format_datetime(string $value): string
{
    try {
        $date = new DateTimeImmutable($value);

        return $date->format('M j, Y');
    } catch (Throwable) {
        return $value;
    }
}

function format_body(string $body): string
{
    $parts = preg_split("/\R{2,}/", trim($body)) ?: [];
    $html = [];

    foreach ($parts as $part) {
        $html[] = '<p>' . nl2br(html_escape(trim($part))) . '</p>';
    }

    return implode("\n", $html);
}

function excerpt(string $body, int $length = 220): string
{
    $plain = trim(preg_replace('/\s+/u', ' ', $body) ?? '');

    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        if (mb_strlen($plain) <= $length) {
            return $plain;
        }

        return rtrim(mb_substr($plain, 0, $length - 1)) . '...';
    }

    if (strlen($plain) <= $length) {
        return $plain;
    }

    return rtrim(substr($plain, 0, $length - 1)) . '...';
}

function render(string $template, array $vars = []): void
{
    extract($vars, EXTR_SKIP);

    ob_start();
    require template_path($template);
    $content = ob_get_clean();

    require template_path('layout.php');
}
