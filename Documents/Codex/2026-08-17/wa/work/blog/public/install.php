<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

$errors = [];
$result = null;
$alreadyInstalled = db_exists();

if (is_post_request()) {
    if ($alreadyInstalled && empty($_POST['reinstall'])) {
        $errors[] = 'The database already exists. Tick reinstall if you want to replace it.';
    } elseif (!verify_csrf_token($_POST['csrf_token'] ?? null)) {
        $errors[] = 'The installer form expired. Refresh the page and try again.';
    } else {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');

        if ($username === '') {
            $errors[] = 'Please choose an admin username.';
        }
        if (strlen($password) < 8) {
            $errors[] = 'The admin password must be at least 8 characters long.';
        }
        if ($password !== $passwordConfirm) {
            $errors[] = 'The passwords do not match.';
        }

        if (empty($errors)) {
            $result = install_blog($username, $password);
            flash_set('success', 'Blog installed successfully. Log in to manage posts.');
            redirect_to('login.php');
        }
    }
}

render('install-form.php', [
    'title' => 'Install ' . site_name(),
    'errors' => $errors,
    'alreadyInstalled' => $alreadyInstalled,
]);
