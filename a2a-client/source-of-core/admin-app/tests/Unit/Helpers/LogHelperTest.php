<?php

namespace Tests\Unit\Helpers;

use App\Helpers\LogHelper;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class LogHelperTest extends TestCase
{
    /**
     * Test logError method
     */
    public function testLogError(): void
    {
        $message = 'Test error message';
        $context = ['key' => 'value'];
        
        Log::shouldReceive('error')
            ->once()
            ->with("LogHelper - {$message}", $context);
        
        LogHelper::error('LogHelper', $message, $context);
    }
} 