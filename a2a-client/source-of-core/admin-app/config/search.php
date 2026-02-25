<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Search Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration settings for the search functionality.
    |
    */

    // Default search algorithm to use
    'algorithm' => env('SEARCH_ALGORITHM', 'tfidf'),

    // Available algorithms and their configurations
    'algorithms' => [
        'tfidf' => [
            'enabled' => true,
            'parameters' => [
                'min_word_length' => 3,
                'stop_words' => true,
                'stemming' => true,
                'vector_size' => 100,
                'min_df' => 2,        // Minimum document frequency
                'max_df' => 0.95,     // Maximum document frequency
                'ngram_range' => [1, 1], // Only unigrams to reduce memory
                'smooth_idf' => true,  // Smooth IDF weights
                'sublinear_tf' => true // Apply sublinear scaling to TF
            ],
        ],
        'bm25' => [
            'enabled' => true,
            'parameters' => [
                'k1' => 1.5,
                'b' => 0.75,
                'vector_size' => 300,
                'min_df' => 2,
                'max_df' => 0.95
            ],
        ],
        'fasttext' => [
            'enabled' => false,
            'parameters' => [
                'model_path' => storage_path('app/search/models/fasttext.bin'),
                'dimension' => 300,
                'vector_size' => 300,
                'min_count' => 5,
                'window' => 5,
                'min_n' => 3,
                'max_n' => 6
            ],
        ],
        'word2vec' => [
            'enabled' => false,
            'parameters' => [
                'model_path' => storage_path('app/search/models/word2vec.bin'),
                'dimension' => 300,
                'vector_size' => 300,
                'min_count' => 5,
                'window' => 5,
                'workers' => 4
            ],
        ],
    ],

    // Search index settings
    'index' => [
        'path' => storage_path('app/search/index'),
        'cache' => [
            'enabled' => true,
            'ttl' => 86400, // 24 hours
        ],
    ],

    // File processing settings
    'file_processing' => [
        'chunk_size' => 50,
        'max_file_size' => 5242880, // Reduced to 5MB
        'batch_size' => 100,
        'allowed_extensions' => [
            'txt', 'md', 'php', 'js', 'css', 'html', 'json', 'xml', 'yaml', 'yml',
        ],
        'exclude_directories' => [
            'backend/node_modules',
            'backend/vendor',
            'node_modules',
            'vendor',
            '.git',
            'storage/logs',
            'storage/framework',
            'bootstrap/cache',
            'public/build',
            'public/hot',
            'public/storage',
        ],
        'exclude_patterns' => [
            '/\.git/',
            '/\.env/',
            '/\.env\..*/',
            '/\.idea/',
            '/\.vscode/',
            '/\.DS_Store/',
            '/\.gitignore/',
            '/\.gitattributes/',
            '/\.editorconfig/',
            '/\.prettierrc/',
            '/\.eslintrc/',
            '/\.npmrc/',
            '/\.yarnrc/',
            '/\.yarn/',
            '/\.cache/',
            '/\.config/',
            '/\.local/',
            '/\.tmp/',
            '/\.temp/',
            '/\.swp/',
            '/\.swo/',
            '/\.bak/',
            '/\.backup/',
            '/\.old/',
            '/\.orig/',
            '/\.rej/',
            '/\.log/',
            '/\.pid/',
            '/\.lock/',
            '/\.socket/',
            '/\.sock/',
            '/\.pid/',
            '/\.pid.lock/',
            '/\.pid.sock/',
            '/\.pid.socket/',
            '/\.pid.tmp/',
            '/\.pid.temp/',
            '/\.pid.bak/',
            '/\.pid.backup/',
            '/\.pid.old/',
            '/\.pid.orig/',
            '/\.pid.rej/',
            '/\.pid.log/',
        ],
    ],
]; 