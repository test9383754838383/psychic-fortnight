<section class="hero">
    <p class="eyebrow">Admin</p>
    <h1>All posts</h1>
    <p>Manage every post from one place.</p>
</section>

<section class="card">
    <div class="toolbar">
        <a class="button" href="edit-post.php">New post</a>
        <a href="comments.php">Comment admin</a>
    </div>
</section>

<?php if (empty($posts)): ?>
    <section class="card">
        <p>No posts yet.</p>
    </section>
<?php else: ?>
    <div class="stack">
        <?php foreach ($posts as $post): ?>
            <article class="card admin-row">
                <div>
                    <h2><a href="view-post.php?id=<?= (int) $post['id'] ?>"><?= html_escape($post['title']) ?></a></h2>
                    <p class="muted">
                        <?= html_escape(format_datetime($post['created_at'])) ?>
                        by <?= html_escape($post['author_username']) ?>
                        - <?= (int) $post['comment_count'] ?> comments
                    </p>
                </div>
                <div class="inline-actions">
                    <a href="edit-post.php?id=<?= (int) $post['id'] ?>">Edit</a>
                    <form method="post" action="delete-post.php" class="inline-form" onsubmit="return confirm('Delete this post?');">
                        <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">
                        <input type="hidden" name="id" value="<?= (int) $post['id'] ?>">
                        <button type="submit" class="link-button">Delete</button>
                    </form>
                </div>
            </article>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
