<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

require_login();

if (!is_post_request() || !verify_csrf_token($_POST['csrf_token'] ?? null)) {
    flash_set('warning', 'That action could not be completed.');
    redirect_to('all-posts.php');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash_set('warning', 'That post could not be found.');
    redirect_to('all-posts.php');
}

delete_post($id);
flash_set('success', 'Post deleted.');
redirect_to('all-posts.php');
