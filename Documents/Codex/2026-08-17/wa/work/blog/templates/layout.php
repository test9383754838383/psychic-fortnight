<?php
declare(strict_types=1);

$pageTitle = $title ?? site_name();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= html_escape($pageTitle) ?></title>
    <link rel="stylesheet" href="assets/main.css">
</head>
<body>
    <div class="page-shell">
        <?php require template_path('head.php'); ?>

        <main class="page-content">
            <?php require template_path('flash.php'); ?>
            <?= $content ?>
        </main>
    </div>
</body>
</html>

