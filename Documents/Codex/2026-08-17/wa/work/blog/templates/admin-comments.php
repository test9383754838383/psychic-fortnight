<section class="hero">
    <p class="eyebrow">Admin</p>
    <h1>Comment admin</h1>
    <p>Review and remove comments across the blog.</p>
</section>

<section class="card">
    <div class="toolbar">
        <a class="button" href="all-posts.php">Back to posts</a>
    </div>
</section>

<?php if (empty($comments)): ?>
    <section class="card">
        <p>No comments yet.</p>
    </section>
<?php else: ?>
    <div class="stack">
        <?php foreach ($comments as $comment): ?>
            <article class="card comment-admin-row">
                <div class="post-meta">
                    <span><?= html_escape(format_datetime($comment['created_at'])) ?></span>
                    <span>On <a href="view-post.php?id=<?= (int) $comment['post_id'] ?>"><?= html_escape($comment['post_title']) ?></a></span>
                </div>
                <h2><?= html_escape($comment['name']) ?></h2>
                <p class="muted"><?= html_escape($comment['email']) ?></p>
                <?php if (!empty($comment['website'])): ?>
                    <p><a href="<?= html_escape($comment['website']) ?>" rel="nofollow noopener noreferrer"><?= html_escape($comment['website']) ?></a></p>
                <?php endif; ?>
                <p><?= nl2br(html_escape($comment['body'])) ?></p>
                <form method="post" action="delete-comment.php" class="inline-form" onsubmit="return confirm('Delete this comment?');">
                    <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">
                    <input type="hidden" name="id" value="<?= (int) $comment['id'] ?>">
                    <input type="hidden" name="post_id" value="<?= (int) $comment['post_id'] ?>">
                    <button type="submit" class="link-button">Delete comment</button>
                </form>
            </article>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

