<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (!db_exists()) {
    render('install-prompt.php', [
        'title' => 'Install ' . site_name(),
    ]);
    exit;
}

$posts = fetch_recent_posts((int) app_config()['posts_per_page']);

render('post-list.php', [
    'title' => site_name(),
    'intro' => site_tagline(),
    'posts' => $posts,
]);

