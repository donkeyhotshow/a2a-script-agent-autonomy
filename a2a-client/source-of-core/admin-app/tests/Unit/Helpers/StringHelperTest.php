<?php

namespace Tests\Unit\Helpers;

use App\Helpers\StringHelper;
use Tests\TestCase;

class StringHelperTest extends TestCase
{
    /**
     * Test trim method
     */
    public function testTrim(): void
    {
        $value = '  test string  ';
        $characters = ' ';
        
        $expected = 'test string';
        $actual = StringHelper::trim($value, $characters);
        
        $this->assertEquals($expected, $actual);
    }
} 