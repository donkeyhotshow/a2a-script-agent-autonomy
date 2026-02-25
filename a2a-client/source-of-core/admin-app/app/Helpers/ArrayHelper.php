<?php

namespace App\Helpers;

use Exception;

class ArrayHelper
{
    /**
     * Get array keys.
     *
     * @param array $array
     * @return array
     */
    public static function getKeys(array $array): array
    {
        return array_keys($array);
    }

    /**
     * Get array values.
     *
     * @param array $array
     * @return array
     */
    public static function getValues(array $array): array
    {
        return array_values($array);
    }

    /**
     * Get unique values.
     *
     * @param array $array
     * @return array
     */
    public static function uniqueValues(array $array): array
    {
        return array_unique($array);
    }

    /**
     * Get column from array.
     *
     * @param array $array
     * @param string $column
     * @return array
     */
    public static function arrayColumn(array $array, string $column): array
    {
        return array_column($array, $column);
    }

    /**
     * Get intersection of arrays.
     *
     * @param array $array1
     * @param array $array2
     * @return array
     */
    public static function intersect(array $array1, array $array2): array
    {
        return array_intersect($array1, $array2);
    }

    /**
     * Flip array keys and values.
     *
     * @param array $array
     * @return array
     */
    public static function flip(array $array): array
    {
        return array_flip($array);
    }

    /**
     * Get last element of array.
     *
     * @param array $array
     * @return mixed
     */
    public static function getLastElement(array $array)
    {
        return end($array);
    }

    /**
     * Merge arrays and remove duplicates.
     *
     * @param array $array1
     * @param array $array2
     * @return array
     */
    public static function mergeUniqueAsList(array $array1, array $array2): array
    {
        return array_unique(array_merge($array1, $array2));
    }

    /**
     * Filter array by attribute value.
     *
     * @param array $data
     * @param string $attr
     * @param mixed $value
     * @return array
     */
    public static function filterData(array $data, $attr, $value): array
    {
        return array_filter($data, function ($item) use ($attr, $value) {
            return is_array($item) && isset($item[$attr]) && $item[$attr] == $value;
        });
    }

    /**
     * Merge arrays recursively.
     *
     * @param array $array1
     * @param array $array2
     * @return array
     */
    public static function mergeArrays(array $array1, array $array2): array
    {
        return array_merge_recursive($array1, $array2);
    }

    /**
     * Sort array by key.
     *
     * @param array $array
     * @param string $key
     * @return array
     */
    public static function sortByKey(array $array, string $key): array
    {
        usort($array, function ($a, $b) use ($key) {
            return $a[$key] <=> $b[$key];
        });
        return $array;
    }

    /**
     * Transform array using callback.
     *
     * @param array $array
     * @param callable $callback
     * @return array
     */
    public static function transform(array $array, callable $callback): array
    {
        return array_map($callback, $array);
    }

    /**
     * Check if array is a list.
     *
     * @param mixed $array
     * @return bool
     */
    public static function isList($array): bool
    {
        if (!is_array($array)) {
            return false;
        }
        return array_keys($array) === range(0, count($array) - 1);
    }

    /**
     * Check if array is associative.
     *
     * @param mixed $array
     * @return bool
     */
    public static function isAssociative($array): bool
    {
        return !self::isList($array);
    }

    /**
     * Merge arrays recursively with overwrite.
     *
     * @param array $existingData
     * @param array $newData
     * @return array
     */
    public static function mergeRecursiveOverwrite(array $existingData, array $newData): array
    {
        foreach ($newData as $key => $value) {
            if (is_array($value) && isset($existingData[$key]) && is_array($existingData[$key])) {
                $existingData[$key] = self::mergeRecursiveOverwrite($existingData[$key], $value);
            } else {
                $existingData[$key] = $value;
            }
        }
        return $existingData;
    }

    /**
     * Flatten array.
     *
     * @param array $array
     * @return array
     */
    public static function flattenArray(array $array): array
    {
        $result = [];
        array_walk_recursive($array, function ($value) use (&$result) {
            $result[] = $value;
        });
        return $result;
    }

    /**
     * Get first element of array.
     *
     * @param array $array
     * @return mixed
     */
    public static function first(array $array)
    {
        return reset($array);
    }

    /**
     * Get random element from array.
     *
     * @param array $array
     * @return mixed
     */
    public static function random(array $array)
    {
        return $array[array_rand($array)];
    }

    /**
     * Shuffle array.
     *
     * @param array $array
     * @return array
     */
    public static function shuffle(array $array): array
    {
        shuffle($array);
        return $array;
    }

    /**
     * Get array chunk.
     *
     * @param array $array
     * @param int $size
     * @param bool $preserveKeys
     * @return array
     */
    public static function chunk(array $array, int $size, bool $preserveKeys = false): array
    {
        return array_chunk($array, $size, $preserveKeys);
    }

    /**
     * Get array slice.
     *
     * @param array $array
     * @param int $offset
     * @param int|null $length
     * @param bool $preserveKeys
     * @return array
     */
    public static function slice(array $array, int $offset, ?int $length = null, bool $preserveKeys = false): array
    {
        return array_slice($array, $offset, $length, $preserveKeys);
    }

    /**
     * Get array splice.
     *
     * @param array $array
     * @param int $offset
     * @param int|null $length
     * @param array $replacement
     * @return array
     */
    public static function splice(array &$array, int $offset, ?int $length = null, array $replacement = []): array
    {
        return array_splice($array, $offset, $length, $replacement);
    }

    /**
     * Get array pad.
     *
     * @param array $array
     * @param int $size
     * @param mixed $value
     * @return array
     */
    public static function pad(array $array, int $size, $value): array
    {
        return array_pad($array, $size, $value);
    }

    /**
     * Get array fill.
     *
     * @param int $start
     * @param int $count
     * @param mixed $value
     * @return array
     */
    public static function fill(int $start, int $count, $value): array
    {
        return array_fill($start, $count, $value);
    }

    /**
     * Get array fill keys.
     *
     * @param array $keys
     * @param mixed $value
     * @return array
     */
    public static function fillKeys(array $keys, $value): array
    {
        return array_fill_keys($keys, $value);
    }

    /**
     * Get array range.
     *
     * @param mixed $start
     * @param mixed $end
     * @param int|float $step
     * @return array
     */
    public static function range($start, $end, $step = 1): array
    {
        return range($start, $end, $step);
    }

    /**
     * Get array count values.
     *
     * @param array $array
     * @return array
     */
    public static function countValues(array $array): array
    {
        return array_count_values($array);
    }

    /**
     * Get array sum.
     *
     * @param array $array
     * @return int|float
     */
    public static function sum(array $array)
    {
        return array_sum($array);
    }

    /**
     * Get array product.
     *
     * @param array $array
     * @return int|float
     */
    public static function product(array $array)
    {
        return array_product($array);
    }

    /**
     * Get array min.
     *
     * @param array $array
     * @return mixed
     */
    public static function min(array $array)
    {
        return min($array);
    }

    /**
     * Get array max.
     *
     * @param array $array
     * @return mixed
     */
    public static function max(array $array)
    {
        return max($array);
    }

    /**
     * Get array average.
     *
     * @param array $array
     * @return float
     */
    public static function average(array $array): float
    {
        return array_sum($array) / count($array);
    }

    /**
     * Get array median.
     *
     * @param array $array
     * @return float
     */
    public static function median(array $array): float
    {
        sort($array);
        $count = count($array);
        $middle = floor($count / 2);

        if ($count % 2 == 0) {
            return ($array[$middle - 1] + $array[$middle]) / 2;
        }

        return $array[$middle];
    }

    /**
     * Get array mode.
     *
     * @param array $array
     * @return mixed
     */
    public static function mode(array $array)
    {
        $values = array_count_values($array);
        arsort($values);
        return key($values);
    }

    /**
     * Get array variance.
     *
     * @param array $array
     * @return float
     */
    public static function variance(array $array): float
    {
        $mean = self::average($array);
        $squaredDiffs = array_map(function ($value) use ($mean) {
            return pow($value - $mean, 2);
        }, $array);
        return self::average($squaredDiffs);
    }

    /**
     * Get array standard deviation.
     *
     * @param array $array
     * @return float
     */
    public static function standardDeviation(array $array): float
    {
        return sqrt(self::variance($array));
    }

    /**
     * Get array percentile.
     *
     * @param array $array
     * @param float $percentile
     * @return float
     */
    public static function percentile(array $array, float $percentile): float
    {
        sort($array);
        $index = ($percentile / 100) * (count($array) - 1);
        $fraction = $index - floor($index);
        $lower = $array[floor($index)];
        $upper = $array[ceil($index)];
        return $lower + ($upper - $lower) * $fraction;
    }

    /**
     * Get array quartiles.
     *
     * @param array $array
     * @return array
     */
    public static function quartiles(array $array): array
    {
        return [
            'q1' => self::percentile($array, 25),
            'q2' => self::percentile($array, 50),
            'q3' => self::percentile($array, 75)
        ];
    }

    /**
     * Get array interquartile range.
     *
     * @param array $array
     * @return float
     */
    public static function interquartileRange(array $array): float
    {
        $quartiles = self::quartiles($array);
        return $quartiles['q3'] - $quartiles['q1'];
    }

    /**
     * Get array outliers.
     *
     * @param array $array
     * @return array
     */
    public static function outliers(array $array): array
    {
        $quartiles = self::quartiles($array);
        $iqr = self::interquartileRange($array);
        $lowerBound = $quartiles['q1'] - (1.5 * $iqr);
        $upperBound = $quartiles['q3'] + (1.5 * $iqr);

        return array_filter($array, function ($value) use ($lowerBound, $upperBound) {
            return $value < $lowerBound || $value > $upperBound;
        });
    }

    /**
     * Get array correlation.
     *
     * @param array $array1
     * @param array $array2
     * @return float
     */
    public static function correlation(array $array1, array $array2): float
    {
        if (count($array1) !== count($array2)) {
            throw new Exception('Arrays must have the same length');
        }

        $mean1 = self::average($array1);
        $mean2 = self::average($array2);
        $std1 = self::standardDeviation($array1);
        $std2 = self::standardDeviation($array2);

        $sum = 0;
        for ($i = 0; $i < count($array1); $i++) {
            $sum += (($array1[$i] - $mean1) / $std1) * (($array2[$i] - $mean2) / $std2);
        }

        return $sum / (count($array1) - 1);
    }

    /**
     * Get array covariance.
     *
     * @param array $array1
     * @param array $array2
     * @return float
     */
    public static function covariance(array $array1, array $array2): float
    {
        if (count($array1) !== count($array2)) {
            throw new Exception('Arrays must have the same length');
        }

        $mean1 = self::average($array1);
        $mean2 = self::average($array2);

        $sum = 0;
        for ($i = 0; $i < count($array1); $i++) {
            $sum += ($array1[$i] - $mean1) * ($array2[$i] - $mean2);
        }

        return $sum / (count($array1) - 1);
    }

    /**
     * Get array regression.
     *
     * @param array $x
     * @param array $y
     * @return array
     */
    public static function regression(array $x, array $y): array
    {
        if (count($x) !== count($y)) {
            throw new Exception('Arrays must have the same length');
        }

        $n = count($x);
        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXY = 0;
        $sumXX = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += $x[$i] * $y[$i];
            $sumXX += $x[$i] * $x[$i];
        }

        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumXX - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;

        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'equation' => "y = {$slope}x + {$intercept}"
        ];
    }
} 