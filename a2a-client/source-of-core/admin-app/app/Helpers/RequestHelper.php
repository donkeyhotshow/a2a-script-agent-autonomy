<?php

namespace App\Helpers;

class RequestHelper
{
    /**
     * Get all request data.
     *
     * @return array
     */
    public static function all(): array
    {
        return array_merge($_GET, $_POST, $_FILES);
    }

    /**
     * Get request method.
     *
     * @return string
     */
    public static function method(): string
    {
        return $_SERVER['REQUEST_METHOD'];
    }

    /**
     * Check if request method is GET.
     *
     * @return bool
     */
    public static function isGet(): bool
    {
        return self::method() === 'GET';
    }

    /**
     * Check if request method is POST.
     *
     * @return bool
     */
    public static function isPost(): bool
    {
        return self::method() === 'POST';
    }

    /**
     * Check if request method is PUT.
     *
     * @return bool
     */
    public static function isPut(): bool
    {
        return self::method() === 'PUT';
    }

    /**
     * Check if request method is DELETE.
     *
     * @return bool
     */
    public static function isDelete(): bool
    {
        return self::method() === 'DELETE';
    }

    /**
     * Check if request method is PATCH.
     *
     * @return bool
     */
    public static function isPatch(): bool
    {
        return self::method() === 'PATCH';
    }

    /**
     * Check if request method is OPTIONS.
     *
     * @return bool
     */
    public static function isOptions(): bool
    {
        return self::method() === 'OPTIONS';
    }

    /**
     * Check if request method is HEAD.
     *
     * @return bool
     */
    public static function isHead(): bool
    {
        return self::method() === 'HEAD';
    }

    /**
     * Check if request is AJAX.
     *
     * @return bool
     */
    public static function isAjax(): bool
    {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    /**
     * Check if request is JSON.
     *
     * @return bool
     */
    public static function isJson(): bool
    {
        return strpos(self::header('Content-Type'), 'application/json') !== false;
    }

    /**
     * Get request header.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function header(string $key, $default = null)
    {
        $headers = getallheaders();
        return $headers[$key] ?? $default;
    }

    /**
     * Get request headers.
     *
     * @return array
     */
    public static function headers(): array
    {
        return getallheaders();
    }

    /**
     * Get request IP address.
     *
     * @return string
     */
    public static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }

    /**
     * Get request user agent.
     *
     * @return string
     */
    public static function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }

    /**
     * Get request referer.
     *
     * @return string
     */
    public static function referer(): string
    {
        return $_SERVER['HTTP_REFERER'] ?? '';
    }

    /**
     * Get request host.
     *
     * @return string
     */
    public static function host(): string
    {
        return $_SERVER['HTTP_HOST'] ?? '';
    }

    /**
     * Get request scheme.
     *
     * @return string
     */
    public static function scheme(): string
    {
        return isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    }

    /**
     * Get request port.
     *
     * @return int
     */
    public static function port(): int
    {
        return (int)($_SERVER['SERVER_PORT'] ?? 80);
    }

    /**
     * Get request path.
     *
     * @return string
     */
    public static function path(): string
    {
        return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    }

    /**
     * Get request query string.
     *
     * @return string
     */
    public static function queryString(): string
    {
        return $_SERVER['QUERY_STRING'] ?? '';
    }

    /**
     * Get request query parameters.
     *
     * @return array
     */
    public static function query(): array
    {
        return $_GET;
    }

    /**
     * Get request post parameters.
     *
     * @return array
     */
    public static function post(): array
    {
        return $_POST;
    }

    /**
     * Get request files.
     *
     * @return array
     */
    public static function files(): array
    {
        return $_FILES;
    }

    /**
     * Get request cookie.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function cookie(string $key, $default = null)
    {
        return $_COOKIE[$key] ?? $default;
    }

    /**
     * Get request cookies.
     *
     * @return array
     */
    public static function cookies(): array
    {
        return $_COOKIE;
    }

    /**
     * Get request session.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function session(string $key, $default = null)
    {
        return $_SESSION[$key] ?? $default;
    }

    /**
     * Get request sessions.
     *
     * @return array
     */
    public static function sessions(): array
    {
        return $_SESSION;
    }

    /**
     * Get request input.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function input(string $key, $default = null)
    {
        return self::all()[$key] ?? $default;
    }

    /**
     * Get request JSON input.
     *
     * @return array
     */
    public static function json(): array
    {
        $json = file_get_contents('php://input');
        return JsonHelper::decode($json);
    }

    /**
     * Check if request has file.
     *
     * @param string $key
     * @return bool
     */
    public static function hasFile(string $key): bool
    {
        return isset($_FILES[$key]) && $_FILES[$key]['error'] !== UPLOAD_ERR_NO_FILE;
    }

    /**
     * Get request file.
     *
     * @param string $key
     * @return array|null
     */
    public static function file(string $key): ?array
    {
        return $_FILES[$key] ?? null;
    }

    /**
     * Check if request has input.
     *
     * @param string $key
     * @return bool
     */
    public static function hasInput(string $key): bool
    {
        return isset(self::all()[$key]);
    }

    /**
     * Check if request has header.
     *
     * @param string $key
     * @return bool
     */
    public static function hasHeader(string $key): bool
    {
        return isset(getallheaders()[$key]);
    }

    /**
     * Check if request has cookie.
     *
     * @param string $key
     * @return bool
     */
    public static function hasCookie(string $key): bool
    {
        return isset($_COOKIE[$key]);
    }

    /**
     * Check if request has session.
     *
     * @param string $key
     * @return bool
     */
    public static function hasSession(string $key): bool
    {
        return isset($_SESSION[$key]);
    }

    /**
     * Check if request is secure.
     *
     * @return bool
     */
    public static function isSecure(): bool
    {
        return self::scheme() === 'https';
    }

    /**
     * Check if request is local.
     *
     * @return bool
     */
    public static function isLocal(): bool
    {
        return in_array(self::ip(), ['127.0.0.1', '::1']);
    }

    /**
     * Check if request is from mobile.
     *
     * @return bool
     */
    public static function isMobile(): bool
    {
        return preg_match('/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i', self::userAgent());
    }

    /**
     * Check if request is from tablet.
     *
     * @return bool
     */
    public static function isTablet(): bool
    {
        return preg_match('/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i', self::userAgent()) && !preg_match('/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i', self::userAgent());
    }

    /**
     * Check if request is from desktop.
     *
     * @return bool
     */
    public static function isDesktop(): bool
    {
        return !self::isMobile() && !self::isTablet();
    }

    /**
     * Check if request is from bot.
     *
     * @return bool
     */
    public static function isBot(): bool
    {
        return preg_match('/bot|crawl|slurp|spider|mediapartners/i', self::userAgent());
    }

    /**
     * Check if request is from iOS.
     *
     * @return bool
     */
    public static function isIOS(): bool
    {
        return preg_match('/iphone|ipad|ipod/i', self::userAgent());
    }

    /**
     * Check if request is from Android.
     *
     * @return bool
     */
    public static function isAndroid(): bool
    {
        return preg_match('/android/i', self::userAgent());
    }

    /**
     * Check if request is from Windows.
     *
     * @return bool
     */
    public static function isWindows(): bool
    {
        return preg_match('/windows|win32/i', self::userAgent());
    }

    /**
     * Check if request is from Mac.
     *
     * @return bool
     */
    public static function isMac(): bool
    {
        return preg_match('/macintosh|mac os x/i', self::userAgent());
    }

    /**
     * Check if request is from Linux.
     *
     * @return bool
     */
    public static function isLinux(): bool
    {
        return preg_match('/linux/i', self::userAgent());
    }

    /**
     * Check if request is from Chrome.
     *
     * @return bool
     */
    public static function isChrome(): bool
    {
        return preg_match('/chrome/i', self::userAgent());
    }

    /**
     * Check if request is from Firefox.
     *
     * @return bool
     */
    public static function isFirefox(): bool
    {
        return preg_match('/firefox/i', self::userAgent());
    }

    /**
     * Check if request is from Safari.
     *
     * @return bool
     */
    public static function isSafari(): bool
    {
        return preg_match('/safari/i', self::userAgent());
    }

    /**
     * Check if request is from Opera.
     *
     * @return bool
     */
    public static function isOpera(): bool
    {
        return preg_match('/opera/i', self::userAgent());
    }

    /**
     * Check if request is from IE.
     *
     * @return bool
     */
    public static function isIE(): bool
    {
        return preg_match('/msie|trident/i', self::userAgent());
    }

    /**
     * Check if request is from Edge.
     *
     * @return bool
     */
    public static function isEdge(): bool
    {
        return preg_match('/edge/i', self::userAgent());
    }
} 