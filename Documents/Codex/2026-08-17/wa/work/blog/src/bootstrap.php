<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/comments.php';
require_once __DIR__ . '/install.php';

date_default_timezone_set(app_config()['timezone'] ?? 'UTC');

