<nav class="top-menu" aria-label="Primary">
    <?php if (is_logged_in()): ?>
        <a href="edit-post.php">New post</a>
        <a href="all-posts.php">All posts</a>
        <a href="comments.php">Comments</a>
        <span class="top-menu-user">Hello <?= html_escape(current_user()['username']) ?>.</span>
        <a href="logout.php">Log out</a>
    <?php else: ?>
        <a href="login.php">Log in</a>
        <a href="install.php">Install</a>
    <?php endif; ?>
</nav>

