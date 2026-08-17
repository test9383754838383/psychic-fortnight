<section class="card prose narrow">
    <p class="eyebrow">Admin access</p>
    <h1>Log in</h1>

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

        <label>
            Username
            <input type="text" name="username" value="<?= html_escape($username ?? '') ?>" required>
        </label>

        <label>
            Password
            <input type="password" name="password" required>
        </label>

        <button type="submit" class="button">Log in</button>
    </form>
</section>

