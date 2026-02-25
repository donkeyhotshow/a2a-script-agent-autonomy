<?php

if (stripos(PHP_OS, 'WIN') === 0) {
    // Disable mail and CORS configurations for Windows
    config(['mail' => [
        'default' => null,
        'mailers' => [],
        'from' => [],
        'markdown' => [],
    ]]);

    config(['cors' => [
        'paths' => [],
        'allowed_methods' => [],
        'allowed_origins' => [],
        'allowed_origins_patterns' => [],
        'allowed_headers' => [],
        'exposed_headers' => [],
        'max_age' => 0,
        'supports_credentials' => false,
    ]]);
}

return [];
