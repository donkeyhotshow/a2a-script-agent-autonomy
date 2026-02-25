<?php

namespace App\Helpers;

class SessionHelper
{
    /**
     * Start session if not started.
     */
    public static function start(): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            return session_start();
        }
        return true;
    }

    /**
     * Get session value.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    /**
     * Set session value.
     *
     * @param string $key
     * @param mixed $value
     * @return void
     */
    public static function set(string $key, $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    /**
     * Check if session has key.
     *
     * @param string $key
     * @return bool
     */
    public static function has(string $key): bool
    {
        self::start();
        return isset($_SESSION[$key]);
    }

    /**
     * Remove session value.
     *
     * @param string $key
     * @return void
     */
    public static function remove(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    /**
     * Get all session values.
     *
     * @return array
     */
    public static function all(): array
    {
        self::start();
        return $_SESSION;
    }

    /**
     * Clear all session values.
     *
     * @return void
     */
    public static function clear(): void
    {
        self::start();
        $_SESSION = [];
    }

    /**
     * Destroy session.
     *
     * @return bool
     */
    public static function destroy(): bool
    {
        self::start();
        return session_destroy();
    }

    /**
     * Regenerate session ID.
     *
     * @param bool $deleteOldSession
     * @return bool
     */
    public static function regenerate(bool $deleteOldSession = true): bool
    {
        self::start();
        return session_regenerate_id($deleteOldSession);
    }

    /**
     * Get session ID.
     *
     * @return string
     */
    public static function id(): string
    {
        self::start();
        return session_id();
    }

    /**
     * Set session ID.
     *
     * @param string $id
     * @return bool
     */
    public static function setId(string $id): bool
    {
        return session_id($id);
    }

    /**
     * Get session name.
     *
     * @return string
     */
    public static function name(): string
    {
        return session_name();
    }

    /**
     * Set session name.
     *
     * @param string $name
     * @return bool
     */
    public static function setName(string $name): bool
    {
        return session_name($name);
    }

    /**
     * Get session save path.
     *
     * @return string
     */
    public static function savePath(): string
    {
        return session_save_path();
    }

    /**
     * Set session save path.
     *
     * @param string $path
     * @return bool
     */
    public static function setSavePath(string $path): bool
    {
        return session_save_path($path);
    }

    /**
     * Get session cookie parameters.
     *
     * @return array
     */
    public static function getCookieParams(): array
    {
        return session_get_cookie_params();
    }

    /**
     * Set session cookie parameters.
     *
     * @param int $lifetime
     * @param string $path
     * @param string $domain
     * @param bool $secure
     * @param bool $httponly
     * @return bool
     */
    public static function setCookieParams(int $lifetime, string $path = '/', string $domain = '', bool $secure = false, bool $httponly = true): bool
    {
        return session_set_cookie_params($lifetime, $path, $domain, $secure, $httponly);
    }

    /**
     * Flash a value to the session.
     *
     * @param string $key
     * @param mixed $value
     * @return void
     */
    public static function flash(string $key, $value): void
    {
        self::set('_flash.' . $key, $value);
    }

    /**
     * Get flashed value from the session.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function getFlash(string $key, $default = null)
    {
        $value = self::get('_flash.' . $key, $default);
        self::remove('_flash.' . $key);
        return $value;
    }

    /**
     * Check if session has flashed value.
     *
     * @param string $key
     * @return bool
     */
    public static function hasFlash(string $key): bool
    {
        return self::has('_flash.' . $key);
    }

    /**
     * Get all flashed values.
     *
     * @return array
     */
    public static function getFlashed(): array
    {
        $flashed = [];
        foreach ($_SESSION as $key => $value) {
            if (strpos($key, '_flash.') === 0) {
                $flashed[substr($key, 6)] = $value;
                self::remove($key);
            }
        }
        return $flashed;
    }

    /**
     * Keep flashed values for the next request.
     *
     * @param array $keys
     * @return void
     */
    public static function reflash(array $keys = []): void
    {
        if (empty($keys)) {
            foreach ($_SESSION as $key => $value) {
                if (strpos($key, '_flash.') === 0) {
                    self::flash(substr($key, 6), $value);
                }
            }
        } else {
            foreach ($keys as $key) {
                if (self::hasFlash($key)) {
                    self::flash($key, self::getFlash($key));
                }
            }
        }
    }

    /**
     * Get session status.
     *
     * @return int
     */
    public static function status(): int
    {
        return session_status();
    }

    /**
     * Check if session is active.
     *
     * @return bool
     */
    public static function isActive(): bool
    {
        return session_status() === PHP_SESSION_ACTIVE;
    }

    /**
     * Check if session is disabled.
     *
     * @return bool
     */
    public static function isDisabled(): bool
    {
        return session_status() === PHP_SESSION_DISABLED;
    }

    /**
     * Check if session is not started.
     *
     * @return bool
     */
    public static function isNotStarted(): bool
    {
        return session_status() === PHP_SESSION_NONE;
    }

    /**
     * Get session cache limiter.
     *
     * @return string
     */
    public static function getCacheLimiter(): string
    {
        return session_cache_limiter();
    }

    /**
     * Set session cache limiter.
     *
     * @param string $limiter
     * @return bool
     */
    public static function setCacheLimiter(string $limiter): bool
    {
        return session_cache_limiter($limiter);
    }

    /**
     * Get session cache expire.
     *
     * @return int
     */
    public static function getCacheExpire(): int
    {
        return session_cache_expire();
    }

    /**
     * Set session cache expire.
     *
     * @param int $expire
     * @return int
     */
    public static function setCacheExpire(int $expire): int
    {
        return session_cache_expire($expire);
    }

    /**
     * Get session module name.
     *
     * @return string
     */
    public static function getModuleName(): string
    {
        return session_module_name();
    }

    /**
     * Set session module name.
     *
     * @param string $module
     * @return bool
     */
    public static function setModuleName(string $module): bool
    {
        return session_module_name($module);
    }

    /**
     * Get session write close.
     *
     * @return bool
     */
    public static function writeClose(): bool
    {
        return session_write_close();
    }

    /**
     * Get session decode.
     *
     * @param string $data
     * @return bool
     */
    public static function decode(string $data): bool
    {
        return session_decode($data);
    }

    /**
     * Get session encode.
     *
     * @return string
     */
    public static function encode(): string
    {
        return session_encode();
    }

    /**
     * Get session gc.
     *
     * @return int
     */
    public static function gc(): int
    {
        return session_gc();
    }

    /**
     * Get session create id.
     *
     * @param string $prefix
     * @return string
     */
    public static function createId(string $prefix = ''): string
    {
        return session_create_id($prefix);
    }

    /**
     * Get session use strict mode.
     *
     * @return bool
     */
    public static function useStrictMode(): bool
    {
        return ini_get('session.use_strict_mode') === '1';
    }

    /**
     * Set session use strict mode.
     *
     * @param bool $useStrictMode
     * @return bool
     */
    public static function setUseStrictMode(bool $useStrictMode): bool
    {
        return ini_set('session.use_strict_mode', $useStrictMode ? '1' : '0');
    }

    /**
     * Get session use cookies.
     *
     * @return bool
     */
    public static function useCookies(): bool
    {
        return ini_get('session.use_cookies') === '1';
    }

    /**
     * Set session use cookies.
     *
     * @param bool $useCookies
     * @return bool
     */
    public static function setUseCookies(bool $useCookies): bool
    {
        return ini_set('session.use_cookies', $useCookies ? '1' : '0');
    }

    /**
     * Get session use only cookies.
     *
     * @return bool
     */
    public static function useOnlyCookies(): bool
    {
        return ini_get('session.use_only_cookies') === '1';
    }

    /**
     * Set session use only cookies.
     *
     * @param bool $useOnlyCookies
     * @return bool
     */
    public static function setUseOnlyCookies(bool $useOnlyCookies): bool
    {
        return ini_set('session.use_only_cookies', $useOnlyCookies ? '1' : '0');
    }

    /**
     * Get session use trans sid.
     *
     * @return bool
     */
    public static function useTransSid(): bool
    {
        return ini_get('session.use_trans_sid') === '1';
    }

    /**
     * Set session use trans sid.
     *
     * @param bool $useTransSid
     * @return bool
     */
    public static function setUseTransSid(bool $useTransSid): bool
    {
        return ini_set('session.use_trans_sid', $useTransSid ? '1' : '0');
    }
} 