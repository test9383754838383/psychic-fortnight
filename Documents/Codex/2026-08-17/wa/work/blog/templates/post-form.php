<section class="card prose">
    <p class="eyebrow"><?= html_escape($mode === 'edit' ? 'Edit post' : 'New post') ?></p>
    <h1><?= html_escape($mode === 'edit' ? 'Edit post' : 'Create a post') ?></h1>

    <?php if (!empty($errors)): ?>
        <div class="error-box">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?= html_escape($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="post" class="form-grid">
        <input type="hidden" name="csrf_token" value="<?= html_escape(csrf_token()) ?>">
        <?php if (!empty($post['id'])): ?>
            <input type="hidden" name="id" value="<?= (int) $post['id'] ?>">
        <?php endif; ?>

        <label>
            Title
            <input type="text" name="title" value="<?= html_escape($post['title'] ?? '') ?>" required>
        </label>

        <label>
            Body
            <textarea name="body" rows="14" required><?= html_escape($post['body'] ?? '') ?></textarea>
        </label>

        <div class="form-actions">
            <button type="submit" class="button">Save post</button>
            <a href="all-posts.php">Cancel</a>
        </div>
    </form>
</section>

