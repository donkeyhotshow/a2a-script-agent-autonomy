<?php

namespace App\Hooks;

use Illuminate\Support\Facades\Log;

class LogFacade extends Log
{
    public static function debug($message, array $context = [])
    {
        static::channel('stack')->debug($message, $context);
    }
}
