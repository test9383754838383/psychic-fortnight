<?php
declare(strict_types=1);

function fetch_recent_posts(int $limit = 5): array
{
    $stmt = pdo()->prepare(
        'SELECT
            posts.id,
            posts.title,
            posts.body,
            posts.created_at,
            posts.updated_at,
            users.username AS author_username,
            COUNT(comments.id) AS comment_count
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         LEFT JOIN comments ON comments.post_id = posts.id
         GROUP BY posts.id
         ORDER BY posts.created_at DESC, posts.id DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function fetch_all_posts(): array
{
    $stmt = pdo()->query(
        'SELECT
            posts.id,
            posts.title,
            posts.body,
            posts.created_at,
            posts.updated_at,
            users.username AS author_username,
            COUNT(comments.id) AS comment_count
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         LEFT JOIN comments ON comments.post_id = posts.id
         GROUP BY posts.id
         ORDER BY posts.created_at DESC, posts.id DESC'
    );

    return $stmt->fetchAll();
}

function find_post(int $id): ?array
{
    $stmt = pdo()->prepare(
        'SELECT
            posts.id,
            posts.user_id,
            posts.title,
            posts.body,
            posts.created_at,
            posts.updated_at,
            users.username AS author_username
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         WHERE posts.id = :id
         LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $post = $stmt->fetch();

    return $post ?: null;
}

function save_post(?int $id, int $userId, string $title, string $body): int
{
    $now = gmdate('Y-m-d H:i:s');

    if ($id === null) {
        $stmt = pdo()->prepare(
            'INSERT INTO posts (user_id, title, body, created_at, updated_at)
             VALUES (:user_id, :title, :body, :created_at, NULL)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':title' => $title,
            ':body' => $body,
            ':created_at' => $now,
        ]);

        return (int) pdo()->lastInsertId();
    }

    $stmt = pdo()->prepare(
        'UPDATE posts
         SET title = :title,
             body = :body,
             updated_at = :updated_at
         WHERE id = :id'
    );
    $stmt->execute([
        ':id' => $id,
        ':title' => $title,
        ':body' => $body,
        ':updated_at' => $now,
    ]);

    return $id;
}

function delete_post(int $id): void
{
    $stmt = pdo()->prepare('DELETE FROM posts WHERE id = :id');
    $stmt->execute([':id' => $id]);
}

