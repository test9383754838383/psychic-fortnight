<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

require_login();

$fallback = 'comments.php';

if (!is_post_request() || !verify_csrf_token($_POST['csrf_token'] ?? null)) {
    flash_set('warning', 'That action could not be completed.');
    redirect_to($fallback);
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$postId = filter_input(INPUT_POST, 'post_id', FILTER_VALIDATE_INT);

if (!$id) {
    flash_set('warning', 'That comment could not be found.');
    redirect_to($postId ? 'view-post.php?id=' . $postId : $fallback);
}

delete_comment($id);
flash_set('success', 'Comment deleted.');
redirect_to($postId ? 'view-post.php?id=' . $postId : $fallback);
