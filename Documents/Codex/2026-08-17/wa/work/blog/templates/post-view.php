<article class="card prose">
    <div class="post-meta">
        <span><?= html_escape(format_datetime($post['created_at'])) ?></span>
        <span>By <?= html_escape($post['author_username']) ?></span>
        <?php if (!empty($post['updated_at'])): ?>
            <span>Updated <?= html_escape(format_datetime($post['updated_at'])) ?></span>
        <?php endif; ?>
    </div>
    <h1><?= html_escape($post['title']) ?></h1>
    <div class="post-body">
        <?= format_body($post['body']) ?>
    </div>

    <?php if (is_logged_in()): ?>
        <div class="inline-actions">
            <a href="edit-post.php?id=<?= (int) $post['id'] ?>">Edit post</a>
            <form method="post" action="delete-post.php" class="inline-form" onsubmit="return confirm('Delete this post?');">
                <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">
                <input type="hidden" name="id" value="<?= (int) $post['id'] ?>">
                <button type="submit" class="link-button">Delete post</button>
            </form>
        </div>
    <?php endif; ?>
</article>

<section class="card">
    <h2>Comments</h2>

    <?php if (empty($comments)): ?>
        <p>No comments yet.</p>
    <?php else: ?>
        <div class="stack">
            <?php foreach ($comments as $comment): ?>
                <article class="comment">
                    <div class="comment-meta">
                        <strong><?= html_escape($comment['name']) ?></strong>
                        <span><?= html_escape(format_datetime($comment['created_at'])) ?></span>
                        <?php if (!empty($comment['website'])): ?>
                            <a href="<?= html_escape($comment['website']) ?>" rel="nofollow noopener noreferrer">Website</a>
                        <?php endif; ?>
                    </div>
                    <p><?= nl2br(html_escape($comment['body'])) ?></p>

                    <?php if (is_logged_in()): ?>
                        <form method="post" action="delete-comment.php" class="inline-form" onsubmit="return confirm('Delete this comment?');">
                            <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">
                            <input type="hidden" name="id" value="<?= (int) $comment['id'] ?>">
                            <input type="hidden" name="post_id" value="<?= (int) $post['id'] ?>">
                            <button type="submit" class="link-button">Delete comment</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>

<section class="card">
    <h2>Leave a comment</h2>

    <?php if (!empty($commentErrors)): ?>
        <div class="error-box">
            <ul>
                <?php foreach ($commentErrors as $error): ?>
                    <li><?= html_escape($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="post" class="form-grid">
        <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">

        <label>
            Name
            <input type="text" name="name" value="<?= html_escape($commentForm['name'] ?? '') ?>" required>
        </label>

        <label>
            Email
            <input type="email" name="email" value="<?= html_escape($commentForm['email'] ?? '') ?>" required>
        </label>

        <label>
            Website
            <input type="url" name="website" value="<?= html_escape($commentForm['website'] ?? '') ?>" placeholder="https://example.com">
        </label>

        <label>
            Comment
            <textarea name="body" rows="6" required><?= html_escape($commentForm['body'] ?? '') ?></textarea>
        </label>

        <button type="submit" class="button">Post comment</button>
    </form>
</section>

