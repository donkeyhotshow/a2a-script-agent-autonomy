<?php

namespace App\Console\Commands;
return;

use App\Hooks\FileFacade;
use App\JsonPathEditor\JsonPathEditor;
use Exception;
use Illuminate\Console\Command;


class InitJsonFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'json:init {--force : Overwrite existing files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialize default JSON files for the application';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Initializing JSON files...');

        $editor = new JsonPathEditor();
        $force = $this->option('force');

        // Create jso       n-ui directory if needed
        $storagePath = storage_path('app/json');
        if (!FileFacade::exists($storagePath)) {
            FileFacade::makeDirectory($storagePath, 0755, true);
            $this->info('Created ai directory: ' . $storagePath);
        }

        // Initialize main menu
        $this->initMainMenu($editor, $force);

        // Initialize footer menu
        $this->initFooterMenu($editor, $force);

        // Initialize basic page
        $this->initBasicPage($editor, $force);

        $this->info('JSON files initialization complete!');

        return Command::SUCCESS;
    }

    /**
     * Initialize main menu.
     */
    protected function initMainMenu(JsonPathEditor $editor, bool $force): void
    {
        $path = 'menus/main.json';
        $fullPath = storage_path('app/json/' . $path);

        if (FileFacade::exists($fullPath) && !$force) {
            $this->warn('Main menu already exists. Use --force to overwrite.');
            return;
        }

        $data = [
            'name' => 'Main Navigation',
            'location' => 'main',
            'items' => [
                [
                    'id' => 'home',
                    'title' => 'Home',
                    'url' => '/',
                    'order' => 1,
                    'active' => true
                ],
                [
                    'id' => 'about',
                    'title' => 'About Us',
                    'url' => '/about',
                    'order' => 2,
                    'active' => true
                ],
                [
                    'id' => 'services',
                    'title' => 'Services',
                    'url' => '/services',
                    'order' => 3,
                    'active' => true,
                    'children' => [
                        [
                            'id' => 'service1',
                            'title' => 'Service 1',
                            'url' => '/services/service1',
                            'order' => 1,
                            'active' => true
                        ],
                        [
                            'id' => 'service2',
                            'title' => 'Service 2',
                            'url' => '/services/service2',
                            'order' => 2,
                            'active' => true
                        ]
                    ]
                ],
                [
                    'id' => 'contact',
                    'title' => 'Contact',
                    'url' => '/contact',
                    'order' => 4,
                    'active' => true
                ]
            ]
        ];

        try {
            $editor->saveFile($path, $data);
            $this->info('Created main menu: ' . $path);
        } catch (Exception $e) {
            $this->error('Failed to create main menu: ' . $e->getMessage());
        }
    }

    /**
     * Initialize footer menu.
     */
    protected function initFooterMenu(JsonPathEditor $editor, bool $force): void
    {
        $path = 'menus/footer.json';
        $fullPath = storage_path('app/json/' . $path);

        if (FileFacade::exists($fullPath) && !$force) {
            $this->warn('Footer menu already exists. Use --force to overwrite.');
            return;
        }

        $data = [
            'name' => 'Footer Navigation',
            'location' => 'footer',
            'items' => [
                [
                    'id' => 'terms',
                    'title' => 'Terms & Conditions',
                    'url' => '/terms',
                    'order' => 1,
                    'active' => true
                ],
                [
                    'id' => 'privacy',
                    'title' => 'Privacy Policy',
                    'url' => '/privacy',
                    'order' => 2,
                    'active' => true
                ],
                [
                    'id' => 'cookies',
                    'title' => 'Cookie Policy',
                    'url' => '/cookies',
                    'order' => 3,
                    'active' => true
                ]
            ]
        ];

        try {
            $editor->saveFile($path, $data);
            $this->info('Created footer menu: ' . $path);
        } catch (Exception $e) {
            $this->error('Failed to create footer menu: ' . $e->getMessage());
        }
    }

    /**
     * Initialize basic page.
     */
    protected function initBasicPage(JsonPathEditor $editor, bool $force): void
    {
        $path = 'pages/home.json';
        $fullPath = storage_path('app/json/' . $path);

        if (FileFacade::exists($fullPath) && !$force) {
            $this->warn('Home page already exists. Use --force to overwrite.');
            return;
        }

        $data = [
            'id' => 'home',
            'title' => 'Welcome to Our Website',
            'slug' => 'home',
            'meta' => [
                'description' => 'Welcome to our website. This is the home page.',
                'keywords' => ['home', 'welcome', 'main'],
                'robots' => 'index,follow'
            ],
            'content' => [
                [
                    'id' => 'section1',
                    'type' => 'text',
                    'content' => '<h1>Welcome to Our Website</h1><p>This is a sample home page created with the JSON Path Editor.</p>'
                ],
                [
                    'id' => 'section2',
                    'type' => 'image',
                    'content' => '/images/welcome.jpg',
                    'options' => [
                        'alt' => 'Welcome Image',
                        'title' => 'Welcome to our website'
                    ]
                ],
                [
                    'id' => 'section3',
                    'type' => 'text',
                    'content' => '<h2>Our Services</h2><p>Learn more about what we offer.</p>'
                ]
            ],
            'published' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'template' => 'default'
        ];

        try {
            $editor->saveFile($path, $data);
            $this->info('Created home page: ' . $path);
        } catch (Exception $e) {
            $this->error('Failed to create home page: ' . $e->getMessage());
        }
    }
}
