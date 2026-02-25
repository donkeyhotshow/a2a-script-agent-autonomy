<?php

namespace App\Helpers;

use Traits\StringHelperTrait;
use Traits\ArrayHelperTrait;
use Traits\JsonHelperTrait;
use Traits\FileHelperTrait;
use Traits\PathHelperTrait;
use Traits\UrlHelperTrait;
use Traits\NumberHelperTrait;
use Traits\DateHelperTrait;
use Traits\ValidationHelperTrait;
use Traits\SecurityHelperTrait;
use Traits\LogHelperTrait;
use Traits\ConfigHelperTrait;

class Helper
{
    use StringHelperTrait;
    use ArrayHelperTrait;
    use JsonHelperTrait;
    use FileHelperTrait;
    use PathHelperTrait;
    use UrlHelperTrait;
    use NumberHelperTrait;
    use DateHelperTrait;
    use ValidationHelperTrait;
    use SecurityHelperTrait;
    use LogHelperTrait;
    use ConfigHelperTrait;

    /**
     * Get helper instance
     */
    public static function getInstance(): self
    {
        return new static();
    }

    /**
     * Get helper instance as singleton
     */
    private static ?self $instance = null;

    public static function getSingleton(): self
    {
        if (self::$instance === null) {
            self::$instance = new static();
        }
        return self::$instance;
    }
} 