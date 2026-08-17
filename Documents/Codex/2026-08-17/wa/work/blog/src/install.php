<?php
declare(strict_types=1);

function install_blog(string $adminUsername, string $adminPassword): array
{
    ensure_directory(data_path());

    if (is_file(db_path())) {
        unlink(db_path());
    }

    $schema = file_get_contents(data_path('init.sql'));
    if ($schema === false) {
        throw new RuntimeException('Cannot read the database schema.');
    }

    touch(db_path());

    $pdo = pdo();
    $pdo->exec($schema);

    $adminId = create_user($adminUsername, $adminPassword);

    $postIds = [];
    $postIds[] = save_post(
        null,
        $adminId,
        'Welcome to your blog',
        "This is your first post.\n\nUse the admin area to create, edit, and delete posts."
    );
    $postIds[] = save_post(
        null,
        $adminId,
        'Writing your next post',
        "Try editing this sample content first.\n\nThen replace it with your own words."
    );

    add_comment(
        $postIds[0],
        'A first reader',
        'reader@example.com',
        'https://example.com',
        'This is a starter comment you can keep or delete.'
    );

    return [
        'admin_id' => $adminId,
        'seed_post_ids' => $postIds,
    ];
}

