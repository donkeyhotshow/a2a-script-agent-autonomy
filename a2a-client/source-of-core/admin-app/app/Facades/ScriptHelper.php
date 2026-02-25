<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;
use App\Helpers\ScriptHelper;

class Script extends Facade
{
    /**
     * Get the registered name of the component.
     *
     * @return string
     */
    protected static function getFacadeAccessor()
    {
        return ScriptHelper::class;
    }
} 