<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

if (!db_exists()) {
    render('install-prompt.php', [
        'title' => 'Install ' . site_name(),
    ]);
    exit;
}

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash_set('warning', 'That post could not be found.');
    redirect_to('index.php');
}

$post = find_post($id);
if (!$post) {
    flash_set('warning', 'That post does not exist.');
    redirect_to('index.php');
}

$commentErrors = [];
$commentForm = [
    'name' => '',
    'email' => '',
    'website' => '',
    'body' => '',
];

if (is_post_request()) {
    if (!verify_csrf_token($_POST['csrf_token'] ?? null)) {
        $commentErrors[] = 'Your comment form expired. Refresh the page and try again.';
    } else {
        $commentForm = [
            'name' => trim((string) ($_POST['name'] ?? '')),
            'email' => trim((string) ($_POST['email'] ?? '')),
            'website' => trim((string) ($_POST['website'] ?? '')),
            'body' => trim((string) ($_POST['body'] ?? '')),
        ];

        if ($commentForm['name'] === '') {
            $commentErrors[] = 'Please enter your name.';
        }
        if ($commentForm['email'] === '' || !filter_var($commentForm['email'], FILTER_VALIDATE_EMAIL)) {
            $commentErrors[] = 'Please enter a valid email address.';
        }
        if ($commentForm['website'] !== '' && !filter_var($commentForm['website'], FILTER_VALIDATE_URL)) {
            $commentErrors[] = 'Please enter a valid website URL.';
        }
        if ($commentForm['body'] === '') {
            $commentErrors[] = 'Please write a comment.';
        }

        if (empty($commentErrors)) {
            add_comment(
                $id,
                $commentForm['name'],
                $commentForm['email'],
                $commentForm['website'] !== '' ? $commentForm['website'] : null,
                $commentForm['body']
            );

            flash_set('success', 'Comment posted.');
            redirect_to('view-post.php?id=' . $id);
        }
    }
}

$comments = fetch_comments_for_post($id);

render('post-view.php', [
    'title' => $post['title'] . ' - ' . site_name(),
    'post' => $post,
    'comments' => $comments,
    'commentErrors' => $commentErrors,
    'commentForm' => $commentForm,
]);
