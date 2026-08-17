<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (!db_exists()) {
    flash_set('warning', 'Install the blog before logging in.');
    redirect_to('install.php');
}

if (is_logged_in()) {
    redirect_to('all-posts.php');
}

$errors = [];
$username = '';

if (is_post_request()) {
    if (!verify_csrf_token($_POST['csrf_token'] ?? null)) {
        $errors[] = 'The login form expired. Refresh the page and try again.';
    } else {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        if ($username === '' || $password === '') {
            $errors[] = 'Enter both username and password.';
        } elseif (!authenticate($username, $password)) {
            $errors[] = 'Invalid username or password.';
        } else {
            flash_set('success', 'Logged in successfully.');
            redirect_to('all-posts.php');
        }
    }
}

render('login-form.php', [
    'title' => 'Log in - ' . site_name(),
    'errors' => $errors,
    'username' => $username,
]);
