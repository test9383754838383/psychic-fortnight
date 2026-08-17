<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (!db_exists()) {
    flash_set('warning', 'Install the blog before using the admin area.');
    redirect_to('install.php');
}

require_login();

$comments = fetch_all_comments();

render('admin-comments.php', [
    'title' => 'Comment admin - ' . site_name(),
    'comments' => $comments,
]);
