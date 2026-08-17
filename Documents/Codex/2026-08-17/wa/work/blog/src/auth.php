<?php
declare(strict_types=1);

function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function is_logged_in(): bool
{
    return current_user() !== null;
}

function require_login(): void
{
    if (!is_logged_in()) {
        flash_set('warning', 'Please log in first.');
        redirect_to('login.php');
    }
}

function find_user_by_username(string $username): ?array
{
    $stmt = pdo()->prepare('SELECT id, username, password_hash, created_at FROM users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function login_user(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'username' => $user['username'],
    ];
}

function authenticate(string $username, string $password): bool
{
    $user = find_user_by_username($username);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        return false;
    }

    login_user($user);

    return true;
}

function logout_user(): void
{
    unset($_SESSION['user']);
}

function create_user(string $username, string $password): int
{
    $stmt = pdo()->prepare(
        'INSERT INTO users (username, password_hash, created_at)
         VALUES (:username, :password_hash, :created_at)'
    );

    $stmt->execute([
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ':created_at' => gmdate('Y-m-d H:i:s'),
    ]);

    return (int) pdo()->lastInsertId();
}
