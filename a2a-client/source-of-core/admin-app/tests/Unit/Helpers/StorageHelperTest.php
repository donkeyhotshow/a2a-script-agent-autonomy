<?php

namespace Tests\Unit\Helpers;

use App\Helpers\StorageHelper;
use App\Helpers\UrlHelper;
use App\Helpers\PathHelper;
use App\Helpers\StringHelper;
use Tests\TestCase;

class StorageHelperTest extends TestCase
{
    /**
     * Test getStoragePath method
     */
    public function testGetStoragePath(): void
    {
        $basePath = 'test/path';
        $slug = 'test-slug';
        
        $expectedPath = StringHelper::normalizePath(PathHelper::join($basePath, UrlHelper::normalizeSlug($slug) . '.json'));
        $actualPath = StorageHelper::getStoragePath($basePath, $slug);
        
        $this->assertEquals($expectedPath, $actualPath);
    }
} 