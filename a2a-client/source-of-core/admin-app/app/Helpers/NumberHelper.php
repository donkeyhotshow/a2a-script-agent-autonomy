<?php

namespace App\Helpers;

class NumberHelper
{
    /**
     * Format number.
     *
     * @param float $number
     * @param int $decimals
     * @param string $decimalSeparator
     * @param string $thousandsSeparator
     * @return string
     */
    public static function format(float $number, int $decimals = 2, string $decimalSeparator = ".", string $thousandsSeparator = ","): string
    {
        return number_format($number, $decimals, $decimalSeparator, $thousandsSeparator);
    }

    /**
     * Format currency.
     *
     * @param float $number
     * @param string $currency
     * @param int $decimals
     * @param string $decimalSeparator
     * @param string $thousandsSeparator
     * @return string
     */
    public static function formatCurrency(float $number, string $currency = "$", int $decimals = 2, string $decimalSeparator = ".", string $thousandsSeparator = ","): string
    {
        return $currency . self::format($number, $decimals, $decimalSeparator, $thousandsSeparator);
    }

    /**
     * Format percentage.
     *
     * @param float $number
     * @param int $decimals
     * @param string $decimalSeparator
     * @param string $thousandsSeparator
     * @return string
     */
    public static function formatPercentage(float $number, int $decimals = 2, string $decimalSeparator = ".", string $thousandsSeparator = ","): string
    {
        return self::format($number, $decimals, $decimalSeparator, $thousandsSeparator) . "%";
    }

    /**
     * Format bytes.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . " " . $units[$pow];
    }

    /**
     * Format duration.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatDuration(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $seconds = $seconds % 60;
        return sprintf("%02d:%02d:%02d", $hours, $minutes, $seconds);
    }

    /**
     * Format phone number.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatPhoneNumber(string $number, string $format = "(###) ###-####"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format credit card number.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatCreditCardNumber(string $number, string $format = "#### #### #### ####"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format social security number.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatSocialSecurityNumber(string $number, string $format = "###-##-####"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format postal code.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatPostalCode(string $number, string $format = "#####-####"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format zip code.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatZipCode(string $number, string $format = "#####-####"): string
    {
        return self::formatPostalCode($number, $format);
    }

    /**
     * Format routing number.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatRoutingNumber(string $number, string $format = "#########"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format account number.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatAccountNumber(string $number, string $format = "####-####-####-####"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format tax id.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatTaxId(string $number, string $format = "##-#######"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format ein.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatEin(string $number, string $format = "##-#######"): string
    {
        return self::formatTaxId($number, $format);
    }

    /**
     * Format ssn.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatSsn(string $number, string $format = "###-##-####"): string
    {
        return self::formatSocialSecurityNumber($number, $format);
    }

    /**
     * Format ip address.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatIpAddress(string $number, string $format = "###.###.###.###"): string
    {
        $number = preg_replace("/[^0-9]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format mac address.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatMacAddress(string $number, string $format = "##:##:##:##:##:##"): string
    {
        $number = preg_replace("/[^0-9A-Fa-f]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return $result;
    }

    /**
     * Format hex color.
     *
     * @param string $number
     * @param string $format
     * @return string
     */
    public static function formatHexColor(string $number, string $format = "######"): string
    {
        $number = preg_replace("/[^0-9A-Fa-f]/", "", $number);
        $result = "";
        $index = 0;
        for ($i = 0; $i < strlen($format); $i++) {
            if ($format[$i] === "#") {
                if ($index < strlen($number)) {
                    $result .= $number[$index++];
                } else {
                    $result .= "#";
                }
            } else {
                $result .= $format[$i];
            }
        }
        return "#" . $result;
    }

    /**
     * Format rgb color.
     *
     * @param int $red
     * @param int $green
     * @param int $blue
     * @return string
     */
    public static function formatRgbColor(int $red, int $green, int $blue): string
    {
        return sprintf("rgb(%d, %d, %d)", $red, $green, $blue);
    }

    /**
     * Format rgba color.
     *
     * @param int $red
     * @param int $green
     * @param int $blue
     * @param float $alpha
     * @return string
     */
    public static function formatRgbaColor(int $red, int $green, int $blue, float $alpha): string
    {
        return sprintf("rgba(%d, %d, %d, %.2f)", $red, $green, $blue, $alpha);
    }

    /**
     * Format hsl color.
     *
     * @param int $hue
     * @param int $saturation
     * @param int $lightness
     * @return string
     */
    public static function formatHslColor(int $hue, int $saturation, int $lightness): string
    {
        return sprintf("hsl(%d, %d%%, %d%%)", $hue, $saturation, $lightness);
    }

    /**
     * Format hsla color.
     *
     * @param int $hue
     * @param int $saturation
     * @param int $lightness
     * @param float $alpha
     * @return string
     */
    public static function formatHslaColor(int $hue, int $saturation, int $lightness, float $alpha): string
    {
        return sprintf("hsla(%d, %d%%, %d%%, %.2f)", $hue, $saturation, $lightness, $alpha);
    }

    /**
     * Format coordinate.
     *
     * @param float $latitude
     * @param float $longitude
     * @param int $precision
     * @return string
     */
    public static function formatCoordinate(float $latitude, float $longitude, int $precision = 6): string
    {
        return sprintf("%." . $precision . "f, %." . $precision . "f", $latitude, $longitude);
    }

    /**
     * Format latitude.
     *
     * @param float $latitude
     * @param int $precision
     * @return string
     */
    public static function formatLatitude(float $latitude, int $precision = 6): string
    {
        return sprintf("%." . $precision . "f", $latitude);
    }

    /**
     * Format longitude.
     *
     * @param float $longitude
     * @param int $precision
     * @return string
     */
    public static function formatLongitude(float $longitude, int $precision = 6): string
    {
        return sprintf("%." . $precision . "f", $longitude);
    }

    /**
     * Format file size.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatFileSize(int $bytes, int $precision = 2): string
    {
        return self::formatBytes($bytes, $precision);
    }

    /**
     * Format memory size.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatMemorySize(int $bytes, int $precision = 2): string
    {
        return self::formatBytes($bytes, $precision);
    }

    /**
     * Format disk size.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatDiskSize(int $bytes, int $precision = 2): string
    {
        return self::formatBytes($bytes, $precision);
    }

    /**
     * Format bandwidth.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatBandwidth(int $bytes, int $precision = 2): string
    {
        return self::formatBytes($bytes, $precision) . "/s";
    }

    /**
     * Format speed.
     *
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public static function formatSpeed(int $bytes, int $precision = 2): string
    {
        return self::formatBytes($bytes, $precision) . "/s";
    }

    /**
     * Format time.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatTime(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format date.
     *
     * @param int $timestamp
     * @param string $format
     * @return string
     */
    public static function formatDate(int $timestamp, string $format = "Y-m-d"): string
    {
        return date($format, $timestamp);
    }

    /**
     * Format datetime.
     *
     * @param int $timestamp
     * @param string $format
     * @return string
     */
    public static function formatDateTime(int $timestamp, string $format = "Y-m-d H:i:s"): string
    {
        return date($format, $timestamp);
    }

    /**
     * Format timestamp.
     *
     * @param int $timestamp
     * @param string $format
     * @return string
     */
    public static function formatTimestamp(int $timestamp, string $format = "Y-m-d H:i:s"): string
    {
        return date($format, $timestamp);
    }

    /**
     * Format relative time.
     *
     * @param int $timestamp
     * @return string
     */
    public static function formatRelativeTime(int $timestamp): string
    {
        $now = time();
        $diff = $now - $timestamp;

        if ($diff < 60) {
            return "just now";
        } elseif ($diff < 3600) {
            $minutes = floor($diff / 60);
            return $minutes . " minute" . ($minutes > 1 ? "s" : "") . " ago";
        } elseif ($diff < 86400) {
            $hours = floor($diff / 3600);
            return $hours . " hour" . ($hours > 1 ? "s" : "") . " ago";
        } elseif ($diff < 604800) {
            $days = floor($diff / 86400);
            return $days . " day" . ($days > 1 ? "s" : "") . " ago";
        } elseif ($diff < 2592000) {
            $weeks = floor($diff / 604800);
            return $weeks . " week" . ($weeks > 1 ? "s" : "") . " ago";
        } elseif ($diff < 31536000) {
            $months = floor($diff / 2592000);
            return $months . " month" . ($months > 1 ? "s" : "") . " ago";
        } else {
            $years = floor($diff / 31536000);
            return $years . " year" . ($years > 1 ? "s" : "") . " ago";
        }
    }

    /**
     * Format relative date.
     *
     * @param int $timestamp
     * @return string
     */
    public static function formatRelativeDate(int $timestamp): string
    {
        return self::formatRelativeTime($timestamp);
    }

    /**
     * Format relative datetime.
     *
     * @param int $timestamp
     * @return string
     */
    public static function formatRelativeDateTime(int $timestamp): string
    {
        return self::formatRelativeTime($timestamp);
    }

    /**
     * Format relative timestamp.
     *
     * @param int $timestamp
     * @return string
     */
    public static function formatRelativeTimestamp(int $timestamp): string
    {
        return self::formatRelativeTime($timestamp);
    }

    /**
     * Format elapsed time.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatElapsedTime(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format remaining time.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatRemainingTime(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format countdown.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatCountdown(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format timer.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatTimer(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format stopwatch.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatStopwatch(int $seconds): string
    {
        return self::formatDuration($seconds);
    }

    /**
     * Format clock.
     *
     * @param int $seconds
     * @return string
     */
    public static function formatClock(int $seconds): string
    {
        return self::formatDuration($seconds);
    }
}
