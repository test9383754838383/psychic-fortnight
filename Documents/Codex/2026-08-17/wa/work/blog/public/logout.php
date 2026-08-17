<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

logout_user();
session_regenerate_id(true);
flash_set('success', 'You are now logged out.');
redirect_to('index.php');
