<?php

namespace App\Helpers;

class UrlHelper
{
    /**
     * Generate a slug from a title
     *
     * @param string $title The title to generate a slug from
     * @param bool $lowercase Whether to convert slug to lowercase
     * @return string The generated slug
     */
    public static function generateSlug($title, $lowercase = true)
    {
        $slug = self::transliterate($title);

        if ($lowercase) {
            $slug = strtolower($slug);
        }

        $slug = preg_replace('/[^A-Za-z0-9\-_\/]/', '', $slug);
        $slug = preg_replace('/\s+/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');

        if (empty($slug)) {
            $slug = 'page-' . substr(md5($title), 0, 6);
        }

        return $slug;
    }

    /**
     * Transliterate text to ASCII equivalents
     *
     * @param string $text Text to transliterate
     * @return string Transliterated text
     */
    public static function transliterate($text)
    {
        $text = self::cyrillicToLatin($text);
        $text = self::ascii($text);
        return $text;
    }

    /**
     * Convert a string to ASCII
     *
     * @param string $value
     * @return string
     */
    protected static function ascii($value)
    {
        $chars = [
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'æ' => 'a',
            'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A', 'Æ' => 'A',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ø' => 'o',
            'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O', 'Ø' => 'O',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'ý' => 'y', 'ÿ' => 'y',
            'Ý' => 'Y', 'Ÿ' => 'Y',
            'ñ' => 'n',
            'Ñ' => 'N',
            'ç' => 'c',
            'Ç' => 'C',
            'ß' => 'ss',
            'Þ' => 'th',
            'þ' => 'th',
            'ð' => 'd',
            'Ð' => 'D',
            'œ' => 'oe',
            'Œ' => 'OE',
            'æ' => 'ae',
            'Æ' => 'AE',
        ];

        return strtr($value, $chars);
    }

    /**
     * Convert Cyrillic characters to Latin equivalents
     *
     * @param string $text Text with Cyrillic characters
     * @return string Text with Latin equivalents
     */
    protected static function cyrillicToLatin($text)
    {
        $cyr = [
            'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п',
            'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я',
            'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П',
            'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'
        ];

        $lat = [
            'a', 'b', 'v', 'g', 'd', 'e', 'yo', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p',
            'r', 's', 't', 'u', 'f', 'kh', 'ts', 'ch', 'sh', 'shch', '', 'y', '', 'e', 'yu', 'ya',
            'A', 'B', 'V', 'G', 'D', 'E', 'Yo', 'Zh', 'Z', 'I', 'Y', 'K', 'L', 'M', 'N', 'O', 'P',
            'R', 'S', 'T', 'U', 'F', 'Kh', 'Ts', 'Ch', 'Sh', 'Shch', '', 'Y', '', 'E', 'Yu', 'Ya'
        ];

        return str_replace($cyr, $lat, $text);
    }

    /**
     * Validate if a slug is in correct format
     *
     * @param string $slug The slug to validate
     * @return bool Whether the slug is valid
     */
    public static function isValidSlug($slug)
    {
        if (empty($slug)) {
            return false;
        }
        if (!preg_match('/^[a-z0-9\-\/]+$/', $slug)) {
            return false;
        }
        if (preg_match('/^-|-$/', $slug)) {
            return false;
        }
        if (strpos($slug, '--') !== false) {
            return false;
        }
        return true;
    }

    /**
     * Standardize a module name
     */
    public static function standardizeModuleName(string $name): string
    {
        $name = strtolower($name);
        $name = str_replace([' ', '_'], '-', $name);
        $name = preg_replace('/[^a-z0-9\-]/ ', '', $name);
        $name = preg_replace('/-+/', '-', $name);
        $name = trim($name, '-');
        return $name;
    }

    /**
     * Find parent path for a given path
     */
    public static function findParentPath(string $path): ?string
    {
        $path = self::normalizeSlug($path);
        if (empty($path)) {
            return null;
        }
        $parts = explode('/', $path);
        if (count($parts) <= 1) {
            return null;
        }
        array_pop($parts);
        return implode('/', $parts);
    }

    /**
     * Normalize a slug by removing leading/trailing slashes and converting to lowercase
     */
    public static function normalizeSlug(string $slug): string
    {
        $result = strtolower(trim($slug, '/'));
        return $result;
    }

    /**
     * Get all possible parent paths for a given path
     */
    public static function getAllParentPaths(string $path): array
    {
        $path = self::normalizeSlug($path);
        if (empty($path)) {
            return [];
        }
        $parts = explode('/', $path);
        if (count($parts) <= 1) {
            return [];
        }
        $parents = [];
        $currentPath = '';
        for ($i = 0; $i < count($parts) - 1; $i++) {
            $currentPath = empty($currentPath) ? $parts[$i] : $currentPath . '/' . $parts[$i];
            $parents[] = $currentPath;
        }
        return $parents;
    }

    /**
     * Create a permalink string from module and page slugs.
     */
    public static function createPermalink(string $moduleSlug, string $pageSlug): string
    {
        $moduleSlug = self::normalizeSlug(self::standardizeModuleName($moduleSlug));
        $pageSlug = self::normalizeSlug($pageSlug);

        if (empty($moduleSlug)) {
            return $pageSlug;
        }
        if (empty($pageSlug) || $pageSlug === 'index') {
            return $moduleSlug;
        }
        return $moduleSlug . '/' . $pageSlug;
    }

    /**
     * Appends query parameters to a URL.
     *
     * @param string $url The base URL.
     * @param array $params Associative array of query parameters.
     * @return string The URL with appended query parameters.
     */
    public static function appendQueryParams(string $url, array $params): string
    {
        if (empty($params)) {
            return $url;
        }

        $queryString = http_build_query($params);
        $separator = (parse_url($url, PHP_URL_QUERY) == NULL) ? '?' : '&';
        return $url . $separator . $queryString;
    }

    /**
     * Get the current URL.
     *
     * @param bool $withQueryString Whether to include the query string.
     * @return string The current URL.
     */
    public static function current(bool $withQueryString = true): string
    {
        $url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        if (!$withQueryString) {
            $url = strtok($url, '?');
        }
        return $url;
    }

    /**
     * Check if a string is a valid URL.
     */
    public static function isValidUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Check if a URL is secure (HTTPS).
     */
    public static function isSecureUrl(string $url): bool
    {
        return strpos($url, 'https://') === 0;
    }

    /**
     * Get the domain from a URL.
     */
    public static function getDomain(string $url): ?string
    {
        $parsed = parse_url($url);
        return $parsed['host'] ?? null;
    }

    /**
     * Get the path from a URL.
     */
    public static function getPath(string $url): ?string
    {
        $parsed = parse_url($url);
        return $parsed['path'] ?? null;
    }

    /**
     * Get the query string from a URL.
     */
    public static function getQuery(string $url): ?string
    {
        $parsed = parse_url($url);
        return $parsed['query'] ?? null;
    }

    /**
     * Get the fragment from a URL.
     */
    public static function getFragment(string $url): ?string
    {
        $parsed = parse_url($url);
        return $parsed['fragment'] ?? null;
    }

    /**
     * Build a URL from components.
     */
    public static function buildUrl(array $components): string
    {
        $scheme = $components['scheme'] ?? 'http';
        $host = $components['host'] ?? '';
        $path = $components['path'] ?? '';
        $query = $components['query'] ?? '';
        $fragment = $components['fragment'] ?? '';

        $url = $scheme . '://' . $host;
        if ($path) {
            $url .= '/' . ltrim($path, '/');
        }
        if ($query) {
            $url .= '?' . ltrim($query, '?');
        }
        if ($fragment) {
            $url .= '#' . ltrim($fragment, '#');
        }

        return $url;
    }

    /**
     * Check if a URL is internal (same domain).
     */
    public static function isInternalUrl(string $url): bool
    {
        $currentDomain = self::getDomain(self::current());
        $urlDomain = self::getDomain($url);
        return $currentDomain === $urlDomain;
    }

    /**
     * Check if a URL is external (different domain).
     */
    public static function isExternalUrl(string $url): bool
    {
        return !self::isInternalUrl($url);
    }

    /**
     * Check if a URL is relative.
     */
    public static function isRelativeUrl(string $url): bool
    {
        return strpos($url, 'http://') !== 0 && strpos($url, 'https://') !== 0;
    }

    /**
     * Check if a URL is absolute.
     */
    public static function isAbsoluteUrl(string $url): bool
    {
        return !self::isRelativeUrl($url);
    }

    /**
     * Get the base URL.
     */
    public static function getBaseUrl(): string
    {
        $url = self::current(false);
        $path = self::getPath($url);
        if ($path) {
            $url = substr($url, 0, -strlen($path));
        }
        return rtrim($url, '/');
    }

    /**
     * Get the asset URL.
     */
    public static function getAssetUrl(string $path): string
    {
        return self::getBaseUrl() . '/assets/' . ltrim($path, '/');
    }

    /**
     * Get the image URL.
     */
    public static function getImageUrl(string $path): string
    {
        return self::getAssetUrl('images/' . ltrim($path, '/'));
    }

    /**
     * Get the CSS URL.
     */
    public static function getCssUrl(string $path): string
    {
        return self::getAssetUrl('css/' . ltrim($path, '/'));
    }

    /**
     * Get the JavaScript URL.
     */
    public static function getJsUrl(string $path): string
    {
        return self::getAssetUrl('js/' . ltrim($path, '/'));
    }

    /**
     * Get the media URL.
     */
    public static function getMediaUrl(string $path): string
    {
        return self::getBaseUrl() . '/media/' . ltrim($path, '/');
    }

    /**
     * Get the upload URL.
     */
    public static function getUploadUrl(string $path): string
    {
        return self::getBaseUrl() . '/uploads/' . ltrim($path, '/');
    }

    /**
     * Get the download URL.
     */
    public static function getDownloadUrl(string $path): string
    {
        return self::getBaseUrl() . '/downloads/' . ltrim($path, '/');
    }

    /**
     * Get the API URL.
     */
    public static function getApiUrl(string $path): string
    {
        return self::getBaseUrl() . '/api/' . ltrim($path, '/');
    }

    /**
     * Get the admin URL.
     */
    public static function getAdminUrl(string $path): string
    {
        return self::getBaseUrl() . '/admin/' . ltrim($path, '/');
    }

    /**
     * Get the login URL.
     */
    public static function getLoginUrl(): string
    {
        return self::getAdminUrl('login');
    }

    /**
     * Get the logout URL.
     */
    public static function getLogoutUrl(): string
    {
        return self::getAdminUrl('logout');
    }

    /**
     * Get the register URL.
     */
    public static function getRegisterUrl(): string
    {
        return self::getAdminUrl('register');
    }

    /**
     * Get the password reset URL.
     */
    public static function getPasswordResetUrl(): string
    {
        return self::getAdminUrl('password/reset');
    }

    /**
     * Get the password change URL.
     */
    public static function getPasswordChangeUrl(): string
    {
        return self::getAdminUrl('password/change');
    }

    /**
     * Get the profile URL.
     */
    public static function getProfileUrl(): string
    {
        return self::getAdminUrl('profile');
    }

    /**
     * Get the settings URL.
     */
    public static function getSettingsUrl(): string
    {
        return self::getAdminUrl('settings');
    }

    /**
     * Get the dashboard URL.
     */
    public static function getDashboardUrl(): string
    {
        return self::getAdminUrl('dashboard');
    }

    /**
     * Get the home URL.
     */
    public static function getHomeUrl(): string
    {
        return self::getBaseUrl();
    }

    /**
     * Get the error URL.
     */
    public static function getErrorUrl(int $code): string
    {
        return self::getBaseUrl() . '/error/' . $code;
    }

    /**
     * Get the 404 URL.
     */
    public static function get404Url(): string
    {
        return self::getErrorUrl(404);
    }

    /**
     * Get the 403 URL.
     */
    public static function get403Url(): string
    {
        return self::getErrorUrl(403);
    }

    /**
     * Get the 500 URL.
     */
    public static function get500Url(): string
    {
        return self::getErrorUrl(500);
    }
} 