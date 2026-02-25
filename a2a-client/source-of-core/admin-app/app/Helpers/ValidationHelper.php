<?php

namespace App\Helpers;

class ValidationHelper
{
    /**
     * Validate if string is base64 encoded.
     *
     * @param string $value
     * @return bool
     */
    public static function isBase64(string $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }
        return base64_encode($decoded) === $value;
    }

    /**
     * Validate if string is a valid email.
     *
     * @param string $value
     * @return bool
     */
    public static function isEmail(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate if string is a valid URL.
     *
     * @param string $value
     * @return bool
     */
    public static function isUrl(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Validate if string is a valid IP address.
     *
     * @param string $value
     * @return bool
     */
    public static function isIp(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Validate if string is a valid IPv4 address.
     *
     * @param string $value
     * @return bool
     */
    public static function isIpv4(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
    }

    /**
     * Validate if string is a valid IPv6 address.
     *
     * @param string $value
     * @return bool
     */
    public static function isIpv6(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    }

    /**
     * Validate if string is a valid MAC address.
     *
     * @param string $value
     * @return bool
     */
    public static function isMac(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_MAC) !== false;
    }

    /**
     * Validate if string is a valid domain name.
     *
     * @param string $value
     * @return bool
     */
    public static function isDomain(string $value): bool
    {
        return (bool) preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i', $value);
    }

    /**
     * Validate if string contains only alphabetic characters.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlpha(string $value): bool
    {
        return (bool) preg_match('/^[\pL\pM]+$/u', $value);
    }

    /**
     * Validate if string contains only alphanumeric characters.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlphaNumeric(string $value): bool
    {
        return (bool) preg_match('/^[\pL\pM\pN]+$/u', $value);
    }

    /**
     * Validate if string contains only alphanumeric characters, dashes, and underscores.
     *
     * @param string $value
     * @return bool
     */
    public static function isAlphaDash(string $value): bool
    {
        return (bool) preg_match('/^[\pL\pM\pN_-]+$/u', $value);
    }

    /**
     * Validate if string contains only numeric characters.
     *
     * @param string $value
     * @return bool
     */
    public static function isNumeric(string $value): bool
    {
        return (bool) preg_match('/^[\pN]+$/u', $value);
    }

    /**
     * Validate if string is a valid integer.
     *
     * @param string $value
     * @return bool
     */
    public static function isInteger(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_INT) !== false;
    }

    /**
     * Validate if string is a valid float.
     *
     * @param string $value
     * @return bool
     */
    public static function isFloat(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_FLOAT) !== false;
    }

    /**
     * Validate if string is a valid boolean.
     *
     * @param string $value
     * @return bool
     */
    public static function isBoolean(string $value): bool
    {
        return in_array(strtolower($value), ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'], true);
    }

    /**
     * Validate if string is a valid date.
     *
     * @param string $value
     * @return bool
     */
    public static function isDate(string $value): bool
    {
        if (strtotime($value) === false) {
            return false;
        }
        $date = date_parse($value);
        return checkdate($date['month'], $date['day'], $date['year']);
    }

    /**
     * Validate if string is a valid time.
     *
     * @param string $value
     * @return bool
     */
    public static function isTime(string $value): bool
    {
        return (bool) preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $value);
    }

    /**
     * Validate if string is a valid datetime.
     *
     * @param string $value
     * @return bool
     */
    public static function isDateTime(string $value): bool
    {
        if (strtotime($value) === false) {
            return false;
        }
        $date = date_parse($value);
        return checkdate($date['month'], $date['day'], $date['year']) && $date['hour'] !== false;
    }

    /**
     * Validate if string is a valid color.
     *
     * @param string $value
     * @return bool
     */
    public static function isColor(string $value): bool
    {
        return (bool) preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $value);
    }

    /**
     * Validate if string is a valid hex value.
     *
     * @param string $value
     * @return bool
     */
    public static function isHex(string $value): bool
    {
        return (bool) preg_match('/^[A-Fa-f0-9]+$/', $value);
    }

    /**
     * Validate if string is a valid binary value.
     *
     * @param string $value
     * @return bool
     */
    public static function isBinary(string $value): bool
    {
        return (bool) preg_match('/^[01]+$/', $value);
    }

    /**
     * Validate if string is a valid octal value.
     *
     * @param string $value
     * @return bool
     */
    public static function isOctal(string $value): bool
    {
        return (bool) preg_match('/^[0-7]+$/', $value);
    }

    /**
     * Validate if string is a valid decimal value.
     *
     * @param string $value
     * @return bool
     */
    public static function isDecimal(string $value): bool
    {
        return (bool) preg_match('/^[0-9]+$/', $value);
    }

    /**
     * Validate if string is a valid hexadecimal value.
     *
     * @param string $value
     * @return bool
     */
    public static function isHexadecimal(string $value): bool
    {
        return (bool) preg_match('/^[0-9A-Fa-f]+$/', $value);
    }

    /**
     * Validate if string is a valid credit card number.
     *
     * @param string $value
     * @return bool
     */
    public static function isCreditCard(string $value): bool
    {
        $value = preg_replace('/\D/', '', $value);
        $length = strlen($value);
        if ($length < 13 || $length > 19) {
            return false;
        }
        $sum = 0;
        $weight = 2;
        for ($i = $length - 1; $i >= 0; $i--) {
            $digit = $weight * $value[$i];
            $sum += floor($digit / 10) + $digit % 10;
            $weight = $weight % 2 + 1;
        }
        return $sum % 10 === 0;
    }

    /**
     * Validate if string is a valid phone number.
     *
     * @param string $value
     * @return bool
     */
    public static function isPhone(string $value): bool
    {
        return (bool) preg_match('/^\+?[0-9]{10,15}$/', $value);
    }

    /**
     * Validate if string is a valid postal code.
     *
     * @param string $value
     * @return bool
     */
    public static function isPostalCode(string $value): bool
    {
        return (bool) preg_match('/^[0-9]{5}(-[0-9]{4})?$/', $value);
    }

    /**
     * Validate if string is a valid SSN.
     *
     * @param string $value
     * @return bool
     */
    public static function isSsn(string $value): bool
    {
        return (bool) preg_match('/^[0-9]{3}-[0-9]{2}-[0-9]{4}$/', $value);
    }

    /**
     * Validate if string is a valid ZIP code.
     *
     * @param string $value
     * @return bool
     */
    public static function isZipCode(string $value): bool
    {
        return (bool) preg_match('/^[0-9]{5}(-[0-9]{4})?$/', $value);
    }

    /**
     * Validate if string is a valid currency value.
     *
     * @param string $value
     * @return bool
     */
    public static function isCurrency(string $value): bool
    {
        return (bool) preg_match('/^[$]?[0-9]+(\.[0-9]{2})?$/', $value);
    }

    /**
     * Validate if string is a valid percentage value.
     *
     * @param string $value
     * @return bool
     */
    public static function isPercentage(string $value): bool
    {
        return (bool) preg_match('/^[0-9]+(\.[0-9]{2})?%$/', $value);
    }

    /**
     * Validate if string is a valid coordinate.
     *
     * @param string $value
     * @return bool
     */
    public static function isCoordinate(string $value): bool
    {
        return (bool) preg_match('/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/', $value);
    }

    /**
     * Validate if string is a valid latitude.
     *
     * @param string $value
     * @return bool
     */
    public static function isLatitude(string $value): bool
    {
        return (bool) preg_match('/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/', $value);
    }

    /**
     * Validate if string is a valid longitude.
     *
     * @param string $value
     * @return bool
     */
    public static function isLongitude(string $value): bool
    {
        return (bool) preg_match('/^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/', $value);
    }

    /**
     * Validate if string is a valid MIME type.
     *
     * @param string $value
     * @return bool
     */
    public static function isMimeType(string $value): bool
    {
        return (bool) preg_match('/^[a-z]+\/[a-z0-9\-\+\.]+$/i', $value);
    }

    /**
     * Validate if string is a valid file extension.
     *
     * @param string $value
     * @return bool
     */
    public static function isFileExtension(string $value): bool
    {
        return (bool) preg_match('/^[a-z0-9]+$/i', $value);
    }

    /**
     * Validate if string is a valid file name.
     *
     * @param string $value
     * @return bool
     */
    public static function isFileName(string $value): bool
    {
        return (bool) preg_match('/^[a-z0-9][a-z0-9_\-\.]+[a-z0-9]$/i', $value);
    }

    /**
     * Validate if string is a valid directory name.
     *
     * @param string $value
     * @return bool
     */
    public static function isDirectoryName(string $value): bool
    {
        return (bool) preg_match('/^[a-z0-9][a-z0-9_\-\.]+[a-z0-9]$/i', $value);
    }

    /**
     * Validate if string is a valid path.
     *
     * @param string $value
     * @return bool
     */
    public static function isPath(string $value): bool
    {
        return (bool) preg_match('/^[a-z0-9][a-z0-9_\-\.\/]+[a-z0-9]$/i', $value);
    }

    /**
     * Validate if string is a valid URL path.
     *
     * @param string $value
     * @return bool
     */
    public static function isUrlPath(string $value): bool
    {
        return (bool) preg_match('/^[a-z0-9][a-z0-9_\-\.\/]+[a-z0-9]$/i', $value);
    }
} 