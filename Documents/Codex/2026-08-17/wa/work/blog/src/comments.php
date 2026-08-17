<?php
declare(strict_types=1);

function fetch_comments_for_post(int $postId): array
{
    $stmt = pdo()->prepare(
        'SELECT id, post_id, name, email, website, body, created_at
         FROM comments
         WHERE post_id = :post_id
         ORDER BY created_at ASC, id ASC'
    );
    $stmt->execute([':post_id' => $postId]);

    return $stmt->fetchAll();
}

function fetch_all_comments(): array
{
    $stmt = pdo()->query(
        'SELECT
            comments.id,
            comments.post_id,
            comments.name,
            comments.email,
            comments.website,
            comments.body,
            comments.created_at,
            posts.title AS post_title
         FROM comments
         INNER JOIN posts ON posts.id = comments.post_id
         ORDER BY comments.created_at DESC, comments.id DESC'
    );

    return $stmt->fetchAll();
}

function add_comment(int $postId, string $name, string $email, ?string $website, string $body): int
{
    $stmt = pdo()->prepare(
        'INSERT INTO comments (post_id, name, email, website, body, created_at)
         VALUES (:post_id, :name, :email, :website, :body, :created_at)'
    );

    $stmt->execute([
        ':post_id' => $postId,
        ':name' => $name,
        ':email' => $email,
        ':website' => $website,
        ':body' => $body,
        ':created_at' => gmdate('Y-m-d H:i:s'),
    ]);

    return (int) pdo()->lastInsertId();
}

function delete_comment(int $id): void
{
    $stmt = pdo()->prepare('DELETE FROM comments WHERE id = :id');
    $stmt->execute([':id' => $id]);
}

