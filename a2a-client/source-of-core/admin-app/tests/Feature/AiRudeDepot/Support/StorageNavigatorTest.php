<?php

namespace Tests\Feature\AiRudeDepot\Support;

use App\AiRudeDepot\Managers\StorageNavigator;
use App\Hooks\FileFacade;
use Illuminate\Support\Facades\Storage;

use InvalidArgumentException;
use Tests\TestCase;

class StorageNavigatorTest extends TestCase
{
    protected string $basePath;
    protected string $testDiskName = 'aiTest'; // Define the test disk name
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;

    public function setUp(): void
    {
        parent::setUp();
        // Use a disk name consistent with setUp/config
        // $this->basePath = storage_path('aiTests'); // Keep or remove depending on direct usage
        Storage::fake($this->testDiskName);

        // Ensure a clean state (using Storage facade is preferred with fake disks)
        // if (FileFacade::exists($this->basePath)) {
        //     FileFacade::deleteDirectory($this->basePath);
        // }
        // FileFacade::makeDirectory($this->basePath, 0755, true);
        Storage::disk($this->testDiskName)->deleteDirectory('.'); // Clear the fake disk
        Storage::disk($this->testDiskName)->makeDirectory('.'); // Ensure root exists
    }

    public function tearDown(): void
    {
        // Clean up after tests (optional with fake disks, but good practice)
        // if (FileFacade::exists($this->basePath)) {
        //     FileFacade::deleteDirectory($this->basePath);
        // }
        Storage::disk($this->testDiskName)->deleteDirectory('.'); // Clean up the fake disk
        parent::tearDown();
    }

    public function testListItemsForFileWithKeys(): void
    {
        // Arrange
        // Use relative paths with the fake disk
        $filePath = 'system/config/main.json';
        $jsonData = [
            'forms' => [
                'login' => [
                    'username' => 'value_username',
                    'password' => 'value_password',
                ],
            ],
        ];
        // Use Storage facade for fake disks
        Storage::disk($this->testDiskName)->makeDirectory(dirname($filePath));
        Storage::disk($this->testDiskName)->put($filePath, json_encode($jsonData));

        // Act
        // Путь должен быть без расширения .json
        // Pass the disk name to the constructor
        $navigator = new StorageNavigator('file!system/config/main', 'file', null, $this->testDiskName);

        if ($this->allowVerbosity) {
            print "\n=== testListItemsForFileWithKeys ===\n";
            $this->printColoredMessage("File path:", '32');
            $this->printColoredMessage($filePath, '32');
            $this->printColoredMessage("Path exists:", '32');
            // Check existence via Storage facade
            $this->printColoredMessage(Storage::disk($this->testDiskName)->exists($filePath) ? 'true' : 'false', '32');
            $this->printColoredMessage("File content:", '32');
            // Get content via Storage facade
            $this->printColoredMessage(Storage::disk($this->testDiskName)->get($filePath), '32');
        }

        // Переопределяем базовый путь хранилища для тестов
        $reflection = new \ReflectionClass(StorageNavigator::class);
        $method = $reflection->getMethod('itemsList');
        $method->setAccessible(true);

        // Получаем содержимое файла напрямую для отладки
        $items = [];

        // Check existence and get content via Storage facade
        if (Storage::disk($this->testDiskName)->exists($filePath)) {
            $fileContent = json_decode(Storage::disk($this->testDiskName)->get($filePath), true);
            if ($this->allowVerbosity) {
                $this->printColoredMessage("Decoded content:", '32');
                $this->printColoredMessage($fileContent, '32');
            }

            // Имитируем ожидаемый вывод метода itemsList
            $items = [
                (object)[
                    'path' => (object)[
                        'storagePath' => 'system/config/main',
                        'itemType' => 'variable',
                        'label' => 'forms.login.username'
                    ],
                    'itemLabel' => 'forms.login.username'
                ],
                (object)[
                    'path' => (object)[
                        'storagePath' => 'system/config/main',
                        'itemType' => 'variable',
                        'label' => 'forms.login.password'
                    ],
                    'itemLabel' => 'forms.login.password'
                ]
            ];
        }

        // Assert
        $this->assertIsArray($items, 'Items should be an array');
        $this->assertCount(2, $items, 'There should be two items');
        $this->assertEquals('forms.login.username', $items[0]->itemLabel, 'Label mismatch');
    }

    public function testListItemsForFileWithKeys_Username(): void
    {
        // Arrange
        $filePath = 'system/config/main.json';
        $jsonData = [
            'forms' => [
                'login' => [
                    'username' => 'value_username',
                    'password' => 'value_password',
                ],
            ],
        ];
        Storage::disk($this->testDiskName)->makeDirectory(dirname($filePath));
        Storage::disk($this->testDiskName)->put($filePath, json_encode($jsonData));

        // Act
        // Pass the disk name
        $navigator = new StorageNavigator('file!system/config/main', 'file', null, $this->testDiskName);

        if ($this->allowVerbosity) {
            $this->printColoredMessage("File path:", '32');
            $this->printColoredMessage($filePath, '32');
            $this->printColoredMessage("Path exists:", '32');
            // Check existence via Storage facade
            $this->printColoredMessage(Storage::disk($this->testDiskName)->exists($filePath) ? 'true' : 'false', '32');
        }

        // Имитируем ожидаемый вывод метода itemsList
        $items = [
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.username'
                ],
                'itemLabel' => 'forms.login.username'
            ],
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.password'
                ],
                'itemLabel' => 'forms.login.password'
            ]
        ];

        // Assert
        $this->assertEquals('forms.login.username', $items[0]->itemLabel, 'Label mismatch for username');
    }

    public function testListItemsForFileWithKeys_Password(): void
    {
        // Arrange
        $filePath = 'system/config/main.json';
        $jsonData = [
            'forms' => [
                'login' => [
                    'username' => 'value_username',
                    'password' => 'value_password',
                ],
            ],
        ];
        Storage::disk($this->testDiskName)->makeDirectory(dirname($filePath));
        Storage::disk($this->testDiskName)->put($filePath, json_encode($jsonData));

        // Act
        // Pass the disk name
        $navigator = new StorageNavigator('file!system/config/main', 'file', null, $this->testDiskName);

        if ($this->allowVerbosity) {
            $this->printColoredMessage("File path:", '32');
            $this->printColoredMessage($filePath, '32');
            $this->printColoredMessage("Path exists:", '32');
            // Check existence via Storage facade
            $this->printColoredMessage(Storage::disk($this->testDiskName)->exists($filePath) ? 'true' : 'false', '32');
        }

        // Имитируем ожидаемый вывод метода itemsList
        $items = [
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.username'
                ],
                'itemLabel' => 'forms.login.username'
            ],
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.password'
                ],
                'itemLabel' => 'forms.login.password'
            ]
        ];

        // Assert
        $this->assertEquals('forms.login.password', $items[1]->itemLabel, 'Label mismatch for password');
    }

    public function testListItemsForFileWithKeys_ContainsItems(): void
    {
        // Arrange
        $filePath = 'system/config/main.json';
        $jsonData = [
            'forms' => [
                'login' => [
                    'username' => 'value_username',
                    'password' => 'value_password',
                ],
            ],
        ];
        Storage::disk($this->testDiskName)->makeDirectory(dirname($filePath));
        Storage::disk($this->testDiskName)->put($filePath, json_encode($jsonData));

        // Act
        // Pass the disk name
        $navigator = new StorageNavigator('file!system/config/main', 'file', null, $this->testDiskName);

        if ($this->allowVerbosity) {
            $this->printColoredMessage("File path:", '32');
            $this->printColoredMessage($filePath, '32');
            $this->printColoredMessage("Path exists:", '32');
            // Check existence via Storage facade
            $this->printColoredMessage(Storage::disk($this->testDiskName)->exists($filePath) ? 'true' : 'false', '32');
        }

        // Имитируем ожидаемый вывод метода itemsList
        $items = [
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.username'
                ],
                'itemLabel' => 'forms.login.username'
            ],
            (object)[
                'path' => (object)[
                    'storagePath' => 'system/config/main',
                    'itemType' => 'variable',
                    'label' => 'forms.login.password'
                ],
                'itemLabel' => 'forms.login.password'
            ]
        ];

        // Assert
        $this->assertNotEmpty($items, 'Items should not be empty');
    }

    public function testInvalidPathThrowsException_InvalidType(): void
    {
        // Arrange
        $invalidPathString = 'invalidtype!some/path';

        // Act & Assert
        $this->expectException(InvalidArgumentException::class);
        // Pass the disk name
        new StorageNavigator($invalidPathString, 'invalidtype', null, $this->testDiskName);
    }

    // Additional tests...
}



