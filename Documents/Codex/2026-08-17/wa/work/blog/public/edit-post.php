<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (!db_exists()) {
    flash_set('warning', 'Install the blog before creating posts.');
    redirect_to('install.php');
}

require_login();

$errors = [];
$postId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$postId) {
    $postId = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
}

$post = [
    'id' => null,
    'title' => '',
    'body' => '',
];

if ($postId) {
    $existing = find_post($postId);
    if (!$existing) {
        flash_set('warning', 'That post could not be found.');
        redirect_to('all-posts.php');
    }
    $post = $existing;
}

if (is_post_request()) {
    if (!verify_csrf_token($_POST['csrf_token'] ?? null)) {
        $errors[] = 'The post form expired. Refresh the page and try again.';
    } else {
        $post = [
            'id' => $postId,
            'title' => trim((string) ($_POST['title'] ?? '')),
            'body' => trim((string) ($_POST['body'] ?? '')),
        ];

        if ($post['title'] === '') {
            $errors[] = 'Please enter a title.';
        }
        if ($post['body'] === '') {
            $errors[] = 'Please write the body of the post.';
        }

        if (empty($errors)) {
            $user = current_user();
            save_post($postId ?: null, (int) $user['id'], $post['title'], $post['body']);
            flash_set('success', $postId ? 'Post updated.' : 'Post created.');
            redirect_to('all-posts.php');
        }
    }
}

render('post-form.php', [
    'title' => $postId ? 'Edit post - ' . site_name() : 'New post - ' . site_name(),
    'mode' => $postId ? 'edit' : 'create',
    'post' => $post,
    'errors' => $errors,
]);
