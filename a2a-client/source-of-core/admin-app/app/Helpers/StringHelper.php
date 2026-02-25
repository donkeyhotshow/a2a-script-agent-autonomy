<?php

namespace App\Helpers;

use Illuminate\Support\Str;
use voku\helper\ASCII;
use Intervention\Image\ImageManager;
use League\CommonMark\CommonMarkConverter;
use HTMLPurifier;
use HTMLPurifier_Config;

class StringHelper
{
    /**
     * Mapping of ordinal words to numbers.
     *
     * @var array
     */
    private static array $ordinalWords = [
        1 => 'first',
        2 => 'second',
        3 => 'third',
        4 => 'fourth',
        5 => 'fifth',
        6 => 'sixth',
        7 => 'seventh',
        8 => 'eighth',
        9 => 'ninth',
        10 => 'tenth',
        11 => 'eleventh',
        12 => 'twelfth',
        13 => 'thirteenth',
        14 => 'fourteenth',
        15 => 'fifteenth',
        16 => 'sixteenth',
        17 => 'seventeenth',
        18 => 'eighteenth',
        19 => 'nineteenth',
        20 => 'twentieth',
        30 => 'thirtieth',
        40 => 'fortieth',
        50 => 'fiftieth',
        60 => 'sixtieth',
        70 => 'seventieth',
        80 => 'eightieth',
        90 => 'ninetieth',
    ];

    /**
     * Convert string to ASCII.
     *
     * @param string $value
     * @return string
     */
    public static function toAscii(string $value): string
    {
        return ASCII::to_ascii($value);
    }

    /**
     * Convert string to slug with better transliteration.
     *
     * @param string $value
     * @return string
     */
    public static function toSlug(string $value): string
    {
        return Str::slug(ASCII::to_ascii($value));
    }

    /**
     * Convert markdown to HTML.
     *
     * @param string $value
     * @return string
     */
    public static function markdownToHtml(string $value): string
    {
        return (new CommonMarkConverter([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]))->convert($value)->getContent();
    }

    /**
     * Clean HTML from potentially harmful content.
     *
     * @param string $value
     * @return string
     */
    public static function cleanHtml(string $value): string
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,b,strong,i,em,u,a[href],ul,ol,li,br,img[src|alt],h1,h2,h3,h4,h5,h6,blockquote,code,pre');
        return (new HTMLPurifier($config))->purify($value);
    }

    /**
     * Convert string to lowercase.
     *
     * @param string $value
     * @return string
     */
    public static function toLower(string $value): string
    {
        return Str::lower($value);
    }

    /**
     * Convert string to uppercase.
     *
     * @param string $value
     * @return string
     */
    public static function toUpper(string $value): string
    {
        return Str::upper($value);
    }

    /**
     * Convert string to title case.
     *
     * @param string $value
     * @return string
     */
    public static function toTitle(string $value): string
    {
        return Str::title($value);
    }

    /**
     * Convert string to sentence case.
     *
     * @param string $value
     * @return string
     */
    public static function toSentence(string $value): string
    {
        return Str::ucfirst(Str::lower($value));
    }

    /**
     * Convert string to camel case.
     *
     * @param string $value
     * @return string
     */
    public static function toCamel(string $value): string
    {
        return Str::camel($value);
    }

    /**
     * Convert string to studly case.
     *
     * @param string $value
     * @return string
     */
    public static function toStudly(string $value): string
    {
        return Str::studly($value);
    }

    /**
     * Convert string to snake case.
     *
     * @param string $value
     * @return string
     */
    public static function toSnake(string $value): string
    {
        return Str::snake($value);
    }

    /**
     * Convert string to kebab case.
     *
     * @param string $value
     * @return string
     */
    public static function toKebab(string $value): string
    {
        return Str::kebab($value);
    }

    /**
     * Convert string to plural.
     *
     * @param string $value
     * @return string
     */
    public static function toPlural(string $value): string
    {
        return Str::plural($value);
    }

    /**
     * Convert string to singular.
     *
     * @param string $value
     * @return string
     */
    public static function toSingular(string $value): string
    {
        return Str::singular($value);
    }

    /**
     * Convert string to ordinal.
     *
     * @param string $value
     * @return string
     */
    public static function toOrdinal(string $value): string
    {
        $number = (int) $value;
        $suffix = 'th';
        if ($number % 100 < 11 || $number % 100 > 13) {
            $suffix = match ($number % 10) {
                1 => 'st',
                2 => 'nd',
                3 => 'rd',
                default => 'th',
            };
        }
        return $number . $suffix;
    }

    /**
     * Convert string to ordinal number.
     *
     * @param string $value
     * @return int
     */
    public static function toOrdinalNumber(string $value): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }

        if (preg_match('/^(\d+)(?:st|nd|rd|th)$/i', $value, $matches)) {
            return (int) $matches[1];
        }

        $number = self::toOrdinalWordNumber($value);
        if ($number > 0) {
            return $number;
        }

        return (int) (preg_match('/\d+/', $value, $matches) ? $matches[0] : 0);
    }

    /**
     * Convert string to ordinal word.
     *
     * @param string $value
     * @return string
     */
    public static function toOrdinalWord(string $value): string
    {
        $number = (int) $value;
        return self::$ordinalWords[$number] ?? 
            (($units = $number % 10) === 0 ? 
                self::$ordinalWords[floor($number / 10) * 10] : 
                self::$ordinalWords[floor($number / 10) * 10] . ' ' . self::$ordinalWords[$units]);
    }

    /**
     * Convert string to ordinal word number.
     *
     * @param string $value
     * @return int
     */
    public static function toOrdinalWordNumber(string $value): int
    {
        $value = strtolower($value);
        if (($number = array_search($value, self::$ordinalWords)) !== false) {
            return $number;
        }

        $parts = explode(' ', $value);
        if (count($parts) === 2) {
            $tens = array_search($parts[0], self::$ordinalWords);
            $units = array_search($parts[1], self::$ordinalWords);
            return ($tens !== false && $units !== false) ? $tens + $units : 0;
        }

        return 0;
    }

    /**
     * Check if string is empty.
     *
     * @param string $value
     * @return bool
     */
    public static function isEmpty(string $value): bool
    {
        return Str::isEmpty($value);
    }

    /**
     * Check if string is not empty.
     *
     * @param string $value
     * @return bool
     */
    public static function isNotEmpty(string $value): bool
    {
        return Str::isNotEmpty($value);
    }

    /**
     * Check if string contains only whitespace.
     *
     * @param string $value
     * @return bool
     */
    public static function isWhitespace(string $value): bool
    {
        return Str::isBlank($value);
    }

    /**
     * Check if string is a valid JSON.
     *
     * @param string $value
     * @return bool
     */
    public static function isJson(string $value): bool
    {
        return Str::isJson($value);
    }

    /**
     * Check if string is a valid XML.
     *
     * @param string $value
     * @return bool
     */
    public static function isXml(string $value): bool
    {
        $prev = libxml_use_internal_errors(true);
        $doc = simplexml_load_string($value);
        libxml_use_internal_errors($prev);
        return $doc !== false;
    }

    /**
     * Check if string is a valid HTML.
     *
     * @param string $value
     * @return bool
     */
    public static function isHtml(string $value): bool
    {
        $prev = libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        $doc->loadHTML($value);
        libxml_use_internal_errors($prev);
        return true;
    }

    /**
     * Check if string is a valid email.
     *
     * @param string $value
     * @return bool
     */
    public static function isEmail(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Check if string is a valid URL.
     *
     * @param string $value
     * @return bool
     */
    public static function isUrl(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Check if string is a valid IP address.
     *
     * @param string $value
     * @return bool
     */
    public static function isIp(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Check if string is a valid domain.
     *
     * @param string $value
     * @return bool
     */
    public static function isDomain(string $value): bool
    {
        return (bool) preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i', $value);
    }

    /**
     * Check if string contains only alphabetic characters.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlpha(string $value): bool
    {
        return (bool) preg_match('/^[\pL\pM]+$/u', $value);
    }

    /**
     * Check if string contains only alphanumeric characters.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlphaNumeric(string $value): bool
    {
        return (bool) preg_match('/^[\pL\pM\pN]+$/u', $value);
    }

    /**
     * Check if string contains only alphanumeric characters, dashes, and underscores.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlphaDash(string $value): bool
    {
        return Str::isAlphaDash($value);
    }

    /**
     * Trim a string.
     *
     * @param string $value
     * @param string $characters
     * @return string
     */
    public static function trim(string $value, string $characters = " \t\n\r\0\x0B"): string
    {
        return trim($value, $characters);
    }
} 