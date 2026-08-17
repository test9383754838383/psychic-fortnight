<section class="card prose narrow">
    <p class="eyebrow">First-time setup</p>
    <h1>Install <?= html_escape(site_name()) ?></h1>
    <p>This creates the SQLite database, adds the schema, and seeds a few starter posts.</p>

    <?php if (!empty($alreadyInstalled)): ?>
        <div class="warning-box">
            The database already exists. Tick reinstall if you want to replace it.
        </div>
    <?php endif; ?>

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
            Admin username
            <input type="text" name="username" required>
        </label>

        <label>
            Admin password
            <input type="password" name="password" required minlength="8">
        </label>

        <label>
            Confirm password
            <input type="password" name="password_confirm" required minlength="8">
        </label>

        <?php if ($alreadyInstalled): ?>
            <label class="checkbox-row">
                <input type="checkbox" name="reinstall" value="1">
                Reinstall and replace the existing database
            </label>
        <?php endif; ?>

        <button type="submit" class="button">Install blog</button>
    </form>
</section>

