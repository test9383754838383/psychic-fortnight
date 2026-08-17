<section class="hero">
    <p class="eyebrow">Latest posts</p>
    <h1><?= html_escape($title ?? site_name()) ?></h1>
    <p><?= html_escape($intro ?? site_tagline()) ?></p>
</section>

<?php if (empty($posts)): ?>
    <section class="card">
        <p>No posts yet. If you just installed the blog, log in and create your first post.</p>
    </section>
<?php else: ?>
    <div class="stack">
        <?php foreach ($posts as $post): ?>
            <article class="card post-card">
                <div class="post-meta">
                    <span><?= html_escape(format_datetime($post['created_at'])) ?></span>
                    <span>By <?= html_escape($post['author_username']) ?></span>
                    <span><?= (int) $post['comment_count'] ?> comments</span>
                </div>
                <h2>
                    <a href="view-post.php?id=<?= (int) $post['id'] ?>">
                        <?= html_escape($post['title']) ?>
                    </a>
                </h2>
                <p><?= html_escape(excerpt($post['body'], 240)) ?></p>
                <p><a class="button-link" href="view-post.php?id=<?= (int) $post['id'] ?>">Read more</a></p>
            </article>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

