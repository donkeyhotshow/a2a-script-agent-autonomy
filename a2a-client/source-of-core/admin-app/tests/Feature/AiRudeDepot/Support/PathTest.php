<?php

namespace Tests\Feature\AiRudeDepot\Support;

use App\Helpers\PathHelper as Path;
use App\AiRudeDepot\Managers\StoragePathParser;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PathTest extends TestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;


    public static function pathTestCases(): array
    {
        return [
            'simple_file_path' => [
                'path' => 'file!system/output/out_index',
                'expected' => [
                    'storagePath' => 'system/output/out_index',
                    'itemType' => 'file',
                    'label' => 'out_index',
                    'pathName' => 'file!system/output/out_index',
                    'keyPath' => [],
                ],
            ],
            'shorted_simple_file_path' => [
                'path' => 'system/output/out_index',
                'expected' => [
                    'storagePath' => 'system/output/out_index',
                    'itemType' => 'file',
                    'label' => 'out_index',
                    'pathName' => 'file!system/output/out_index',
                    'keyPath' => [],
                ],
            ],
            'shorted_file_path_with_keys' => [
                'path' => 'system/config/main:forms.login.username',
                'expected' => [
                    'storagePath' => 'system/config/main',
                    'itemType' => 'file',
                    'label' => 'forms.login.username',
                    'keyPath' => ['forms', 'login', 'username'],
                    'pathName' => 'file!system/config/main:forms.login.username',
                ],
            ],
            'file_path_with_keys' => [
                'path' => 'file!system/config/main:forms.login.username',
                'expected' => [
                    'storagePath' => 'system/config/main',
                    'itemType' => 'file',
                    'label' => 'forms.login.username',
                    'keyPath' => ['forms', 'login', 'username'],
                    'pathName' => 'file!system/config/main:forms.login.username',
                ],
            ],
            'directory_with_special_characters' => [
                'path' => 'directory!system/out-@_index',
                'expected' => [
                    'storagePath' => 'system/out-@_index',
                    'itemType' => 'directory',
                    'label' => 'out-@_index',
                    'keyPath' => [],
                    'pathName' => 'directory!system/out-@_index',
                ],
            ],
            // Добавьте больше случаев по мере необходимости
        ];
    }

    public static function invalidPathTestCases(): array
    {
        return [
            'invalid_prefix' => ['path' => 'invalid_path!system/output'],
            'missing_type' => ['path' => '!system/output'],
            'unsupported_item_type' => ['path' => 'unknown!system/output'],
            // Добавьте больше некорректных путей по мере необходимости
        ];
    }

    #[DataProvider('pathTestCases')]
    public function testBuildPath(string $path, array $expected): void
    {
        $result = Path::buildPath($path, true, $expected['itemType']);
        $this->assertEquals($expected['storagePath'], $result->storagePath, 'Storage Path mismatch');
        $this->assertEquals($expected['itemType'], $result->itemType, 'Item Type mismatch');
        $this->assertEquals($expected['label'], $result->label, 'Label mismatch');
        $this->assertEquals($expected['keyPath'], $result->keyPathList, 'Key Path mismatch');
    }

    // Разделяем тесты для каждого случая
    public function testBuildSimpleFilePath(): void
    {
        $path = 'file!system/output/out_index';
        $expected = [
            'storagePath' => 'system/output/out_index',
            'itemType' => 'file',
            'label' => 'out_index',
            'keyPath' => [],
        ];
        $this->testBuildPath($path, $expected);
    }

    public function testBuildFilePathWithKeys(): void
    {
        $path = 'file!system/config/main:forms.login.username';
        $expected = [
            'storagePath' => 'system/config/main',
            'itemType' => 'file',
            'label' => 'forms.login.username',
            'keyPath' => ['forms', 'login', 'username'],
        ];
        $this->testBuildPath($path, $expected);
    }

    public function testBuildDirectoryWithSpecialCharacters(): void
    {
        $path = 'directory!system/out-@_index';
        $expected = [
            'storagePath' => 'system/out-@_index',
            'itemType' => 'directory',
            'label' => 'out-@_index',
            'keyPath' => [],
        ];
        $this->testBuildPath($path, $expected);
    }

    // Keep DataProvider but comment out testInvalidPaths that uses it
    // #[DataProvider('invalidPathTestCases')]
    // public function testInvalidPaths(string $path): void
    // {
    //     $this->expectException(InvalidArgumentException::class);
    //     StoragePathParser::parse($path);
    // }

    // Rewritten tests using try/catch
    public function testInvalidPrefixPath(): void
    {
        $path = 'invalid_prefix!system/output';
        $exceptionThrown = false;
        try {
            StoragePathParser::parse($path);
        } catch (InvalidArgumentException $e) {
            $exceptionThrown = true;
            $this->assertInstanceOf(\InvalidArgumentException::class, $e);
            $this->assertStringContainsString($path, $e->getMessage());
        } catch (\Exception $e) {
            // Catch other exceptions to fail the test clearly
            $this->fail('Wrong exception type thrown [' . get_class($e) . ']: ' . $e->getMessage());
        }
        $this->assertTrue($exceptionThrown, 'InvalidArgumentException was not thrown for invalid prefix.');
    }

    public function testMissingTypePath(): void
    {
        $path = '!system/output';
        $exceptionThrown = false;
        try {
            StoragePathParser::parse($path);
        } catch (InvalidArgumentException $e) {
            $exceptionThrown = true;
            $this->assertInstanceOf(\InvalidArgumentException::class, $e);
            $this->assertStringContainsString($path, $e->getMessage());
        } catch (\Exception $e) {
            $this->fail('Wrong exception type thrown [' . get_class($e) . ']: ' . $e->getMessage());
        }
        $this->assertTrue($exceptionThrown, 'InvalidArgumentException was not thrown for missing type.');
    }

    public function testUnsupportedItemTypePath(): void
    {
        $path = 'unknown!system/output';
        $exceptionThrown = false;
        try {
            StoragePathParser::parse($path);
        } catch (InvalidArgumentException $e) {
            $exceptionThrown = true;
            $this->assertInstanceOf(\InvalidArgumentException::class, $e);
            $this->assertStringContainsString($path, $e->getMessage());
        } catch (\Exception $e) {
            $this->fail('Wrong exception type thrown [' . get_class($e) . ']: ' . $e->getMessage());
        }
        $this->assertTrue($exceptionThrown, 'InvalidArgumentException was not thrown for unsupported type.');
    }

    // Remove the standalone direct test as it's covered by the rewritten testInvalidPrefixPath
    // public function testDirectInvalidPrefixPath(): void
    // {
    //    ...
    // }

}

