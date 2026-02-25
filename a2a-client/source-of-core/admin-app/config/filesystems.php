<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application. Just store away!
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Here you may configure as many filesystem "disks" as you wish, and you
    | may even configure multiple disks of the same driver. Defaults have
    | been set up for each driver as an example of the required values.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        'documents' => [
            'driver' => 'local',
            'root' => storage_path('framework/testing/disks/documents'),
            'throw' => false,
        ],

        // START - ADDED AI DISK
        'ai' => [
            'driver' => 'local',
            'root' => storage_path('ai'),
            'visibility' => 'private', // Or 'public' depending on needs
            'throw' => false,
        ],
        // END - ADDED AI DISK

        // START - aiCore DISK (For core application files)
        'aiCore' => [
            'driver' => 'local',
            'root' => storage_path('aiCore'), // Or the correct path for core files
            'visibility' => 'private',
            'throw' => false,
        ],
        // END - aiCore DISK

        // START - aiTest DISK (Ensure it exists and is configured for testing)
        'aiTest' => [
            'driver' => 'local',
            'root' => storage_path('framework/testing/disks/aiTest'), // Common practice for test disks
            'throw' => false,
        ],
        // END - aiTest DISK

        // START - aiCoreTest DISK
        'aiCoreTest' => [
            'driver' => 'local',
            'root' => storage_path('framework/testing/disks/aiCoreTest'), // Separate dir for core test files
            'throw' => false,
        ],
        // END - aiCoreTest DISK

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
