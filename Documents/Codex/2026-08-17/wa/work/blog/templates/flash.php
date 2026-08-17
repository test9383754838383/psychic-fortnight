<?php if ($flash = flash_pull()): ?>
    <div class="flash flash-<?= html_escape($flash['type']) ?>">
        <?= html_escape($flash['message']) ?>
    </div>
<?php endif; ?>

