<?php

namespace App\Helpers;

class CookieHelper
{
    /**
     * Set a cookie.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function set(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        if (PHP_VERSION_ID >= 70300) {
            return setcookie($name, $value, [
                'expires' => $expire,
                'path' => $path,
                'domain' => $domain,
                'secure' => $secure,
                'httponly' => $httponly,
                'samesite' => $samesite
            ]);
        }

        if ($samesite !== '') {
            $path .= '; SameSite=' . $samesite;
        }

        return setcookie($name, $value, $expire, $path, $domain, $secure, $httponly);
    }

    /**
     * Get a cookie value.
     *
     * @param string $name
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $name, $default = null)
    {
        return $_COOKIE[$name] ?? $default;
    }

    /**
     * Check if cookie exists.
     *
     * @param string $name
     * @return bool
     */
    public static function has(string $name): bool
    {
        return isset($_COOKIE[$name]);
    }

    /**
     * Remove a cookie.
     *
     * @param string $name
     * @param string $path
     * @param string $domain
     * @return bool
     */
    public static function remove(string $name, string $path = '/', string $domain = ''): bool
    {
        return self::set($name, '', time() - 3600, $path, $domain);
    }

    /**
     * Get all cookies.
     *
     * @return array
     */
    public static function all(): array
    {
        return $_COOKIE;
    }

    /**
     * Clear all cookies.
     *
     * @return void
     */
    public static function clear(): void
    {
        foreach ($_COOKIE as $name => $value) {
            self::remove($name);
        }
    }

    /**
     * Set a cookie that expires in the future.
     *
     * @param string $name
     * @param string $value
     * @param int $minutes
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function forever(string $name, string $value, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::set($name, $value, time() + (5 * 365 * 24 * 60 * 60), $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in minutes.
     *
     * @param string $name
     * @param string $value
     * @param int $minutes
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function make(string $name, string $value, int $minutes = 60, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::set($name, $value, time() + ($minutes * 60), $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in hours.
     *
     * @param string $name
     * @param string $value
     * @param int $hours
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function makeHours(string $name, string $value, int $hours = 1, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::make($name, $value, $hours * 60, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in days.
     *
     * @param string $name
     * @param string $value
     * @param int $days
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function makeDays(string $name, string $value, int $days = 1, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::makeHours($name, $value, $days * 24, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in weeks.
     *
     * @param string $name
     * @param string $value
     * @param int $weeks
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function makeWeeks(string $name, string $value, int $weeks = 1, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::makeDays($name, $value, $weeks * 7, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in months.
     *
     * @param string $name
     * @param string $value
     * @param int $months
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function makeMonths(string $name, string $value, int $months = 1, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::makeDays($name, $value, $months * 30, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie that expires in years.
     *
     * @param string $name
     * @param string $value
     * @param int $years
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function makeYears(string $name, string $value, int $years = 1, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::makeDays($name, $value, $years * 365, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a secure cookie.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function secure(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::set($name, $value, $expire, $path, $domain, true, $httponly, $samesite);
    }

    /**
     * Set a cookie with SameSite attribute.
     *
     * @param string $name
     * @param string $value
     * @param string $samesite
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @return bool
     */
    public static function sameSite(string $name, string $value, string $samesite = 'Lax', int $expire = 0, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true): bool
    {
        return self::set($name, $value, $expire, $path, $domain, $secure, $httponly, $samesite);
    }

    /**
     * Set a cookie with Strict SameSite attribute.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @return bool
     */
    public static function strict(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true): bool
    {
        return self::sameSite($name, $value, 'Strict', $expire, $path, $domain, $secure, $httponly);
    }

    /**
     * Set a cookie with Lax SameSite attribute.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @return bool
     */
    public static function lax(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true): bool
    {
        return self::sameSite($name, $value, 'Lax', $expire, $path, $domain, $secure, $httponly);
    }

    /**
     * Set a cookie with None SameSite attribute.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $httponly
     * @return bool
     */
    public static function none(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $httponly = true): bool
    {
        return self::sameSite($name, $value, 'None', $expire, $path, $domain, true, $httponly);
    }

    /**
     * Set a cookie with HttpOnly attribute.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param string $samesite
     * @return bool
     */
    public static function httpOnly(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $secure = false, string $samesite = 'Lax'): bool
    {
        return self::set($name, $value, $expire, $path, $domain, $secure, true, $samesite);
    }

    /**
     * Set a cookie with Secure attribute.
     *
     * @param string $name
     * @param string $value
     * @param int $expire
     * @param string $path
     * @param string $domain
     * @param bool $httponly
     * @param string $samesite
     * @return bool
     */
    public static function secureOnly(string $name, string $value, int $expire = 0, string $path = '/', string $domain = '', bool $httponly = true, string $samesite = 'Lax'): bool
    {
        return self::set($name, $value, $expire, $path, $domain, true, $httponly, $samesite);
    }
} 