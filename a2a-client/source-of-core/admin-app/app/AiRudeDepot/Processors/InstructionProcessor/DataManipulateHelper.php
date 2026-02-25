<?php

/**
 * DataManipulateHelper
 *
 * Этот класс предоставляет статические хелпер-методы для манипуляций с данными,
 * применяемых в действиях инструкций (таких как `update`, `for` и т.д.).
 * Он отвечает за низкоуровневую работу с данными, трансформации, условия и поиск.
 *
 * Ключевые функции:
 * - searchInData: Поиск данных в массивах.
 * - applyDataTransformation: Применение различных преобразований к данным (json_encode/decode, инкремент/декремент, работа с массивами, приведение типов).
 * - evaluateCondition: Вычисление условий для действий.
 *
 * Зависимости:
 * - Storage (DataHub): Используется для разрешения адресов внутри хелпера.
 * - Другие хелперы (JsonHelper, ArrayHelper и т.д.): Для выполнения специфических операций с данными.
 *
 * Важно:
 * - Этот хелпер работает с данными, полученными из Storage через InstructionProcessor.
 * - Логика работы с адресами (`buffer:`, `file!`) находится в DataHub и модулях данных,
 *   а не напрямую в этом хелпере, хотя он использует Storage::processResolveInstruction.
 *
 * См. также:
 * - Стандарт: /c:/apps/admin-app/prompts/version-5/standards/low-level-storage.md (описание адресов и взаимодействия с модулями)
 * - InstructionProcessor.php: Класс, который использует этот хелпер для обработки инструкций.
 *
 */

namespace App\AiRudeDepot\Processors\InstructionProcessor;

use App\AiRudeDepot\Storage\DataHub as Storage;
use App\Helpers\JsonHelper;
use App\Models\Item;
use Countable;
use Exception;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Helpers\ArrayHelper;

/**
 * Class DataManipulateHelper
 *
 * Provides static helper methods for common data manipulation tasks like searching arrays,
 * applying type transformations, and evaluating conditions within the AiRudeDepot context.
 *
 * @see \docs\core\AiRudeDepot\Helpers\DataManipulateHelper.md Detailed documentation.
 */
class DataManipulateHelper
{
    public static function searchInData(Storage $storage, $data, array $options)
    {
        if (!is_array($data)) {
            return null;
        }

        $attr = $options['attr'] ?? 'id';

        if (!isset($options['value'])) {
            throw new Exception("Опция 'value' обязательна для поиска.");
        }

        $value = $options['value'] ?? null;
        $returnType = $options['return'] ?? null;

        // Resolve the value using the static helper with the correct namespace
        $value = Storage::processResolveInstruction($value, $storage);

        if ($returnType === 'key') {
            $key = array_search($value, array_column($data, $attr));
            return $key !== false ? $key : null;
        }

        // Use ArrayHelper::filterData for filtering
        $filtered = ArrayHelper::filterData($data, $attr, $value);

        // Return null if no items match the filter criteria
        if (empty($filtered)) {
            return null;
        }

        return reset($filtered) ?: null; // Get the first match or null if none
    }

    public static function applyDataTransformation($data, $with)
    {
        try {
            return match ($with) {
                'json_encode' => json_encode($data),
                'json_decode' => json_decode($data, true),
                'increment' => (int)$data + 1,
                'increment2x' => (int)$data + 2,
                'decrement' => (int)$data - 1,
                'decrement2x' => (int)$data - 2,
                'array_keys' => is_array($data) ? array_keys($data) : [],
                'array_values' => is_array($data) ? array_values($data) : [],
                'array_key_last' => is_array($data) ? array_key_last($data) : null,
                'array_key_first' => is_array($data) ? array_key_first($data) : null,
                'int' => (int)$data,
                'count' => is_array($data) || $data instanceof Countable ? count($data) : 0,
                'stringify' => strval($data),
                'create' => self::simulateCreateInstance($data),
                'verifyPasswordHash' => self::verifyPassword($data),
                'loginUserById' => self::loginUserById($data),
                default => throw new Exception("Unknown conversion method: {$with}")
            };
        } catch (Exception $e) {
            Log::error("Error in DataManipulateHelper::applyDataTransformation with '{$with}': " . $e->getMessage(), ['data' => $data]);
            throw new Exception("Error in DataManipulateHelper::applyDataTransformation with '{$with}': " . $e->getMessage());
        }
    }

    private static function simulateCreateInstance($data)
    {
        // Создаём запись Item. Если адрес не задан, попробуем взять его из текущего контекста.
        $item = new Item();
        if (!isset($data['address'])) {
            $data['address'] = null;
        }
        $item->data = [
            'address' => $data['address'] ?? null,
            'content' => $data
        ];
        $item->save(); // Генерирует auto-increment id
        $data['id'] = $item->id; // Встраиваем id в данные

        return $data;
    }

    private static function verifyPassword($inputData): bool
    {
        if (!is_array($inputData) || !isset($inputData['plain']) || !isset($inputData['hash'])) {
            Log::warning("Invalid input provided for password verification.", ['input' => $inputData]);
            return false; // Return false if input is not as expected
        }

        // Ensure inputs are strings, default to empty string if not set or null
        $plainPassword = $inputData['plain'] ?? '';
        $hashedPassword = $inputData['hash'] ?? '';

        // <<< START: Added Logging >>>
        Log::debug('DataManipulateHelper::verifyPassword - Plain Password Input:', [$plainPassword]);
        Log::debug('DataManipulateHelper::verifyPassword - Hashed Password Input:', [$hashedPassword]);
        // <<< END: Added Logging >>>

        // Prevent hashing empty strings if that's desired behavior
        if (empty($plainPassword) || empty($hashedPassword)) {
            Log::debug('DataManipulateHelper::verifyPassword - Empty password or hash, returning false.');
            return false;
        }

        try {
            $result = Hash::check((string)$plainPassword, (string)$hashedPassword);
            Log::debug('DataManipulateHelper::verifyPassword - Hash::check result:', [$result]);
            return $result;
        } catch (Exception $e) {
            Log::error('DataManipulateHelper::verifyPassword - Exception during Hash::check:', [
                'error' => $e->getMessage(),
                'plain_type' => gettype($plainPassword),
                'hash_type' => gettype($hashedPassword),
                // Optionally log parts of the hash to check for corruption, but avoid logging full hash/password
                'hash_start' => substr($hashedPassword, 0, 10)
            ]);
            // Re-throw the original exception that Hash::check might throw (like the Bcrypt algorithm error)
            // Or return false if we want to suppress the error for the action runner
            // throw $e; // Option 1: Re-throw
            return false; // Option 2: Return false on error
        }
    }

    private static function loginUserById($userId): bool
    {
        if (!is_numeric($userId)) {
            Log::error('DataManipulateHelper::loginUserById - Invalid User ID provided.', ['userId' => $userId]);
            return false;
        }

        try {
            $loggedIn = Auth::loginUsingId((int)$userId);
            if ($loggedIn) {
                Log::info('DataManipulateHelper::loginUserById - User successfully logged in via Auth::loginUsingId.', ['userId' => $userId]);
                return true;
            } else {
                Log::warning('DataManipulateHelper::loginUserById - Auth::loginUsingId returned false.', ['userId' => $userId]);
                return false;
            }
        } catch (Exception $e) {
            Log::error('DataManipulateHelper::loginUserById - Exception during Auth::loginUsingId:', [
                'error' => $e->getMessage(),
                'userId' => $userId
            ]);
            return false;
        }
    }

    public static function evaluateCondition(Storage $storage, $condition)
    {
        // Handle boolean values directly
        if (is_bool($condition)) {
            return $condition;
        }

        // Handle numeric values as boolean
        if (is_numeric($condition)) {
            return (bool)$condition;
        }

        // Handle literal string values
        if ($condition === 'true') {
            return true;
        }
        if ($condition === 'false') {
            return false;
        }

        // Handle simple string path (unchanged from previous fix)
        if (is_string($condition)) {
            $negate = false;
            if (strpos($condition, '!') === 0) {
                $negate = true;
                $condition = substr($condition, 1);
            }
            // $storage->resolveInstruction($condition);
            $conditionValue = (bool)$storage->address($condition)->get();
            if ($negate) {
                $conditionValue = !$conditionValue;
            }
            return $conditionValue;
        } // Handle array conditions
        elseif (is_array($condition)) { // Use elseif
            if (empty($condition)) {
                throw new Exception("Empty array condition provided.");
            }

            $operation = strtolower($condition[0]);

            // Handle "and" Operator
            if ($operation === 'and') {
                if (count($condition) < 2) {
                    throw new Exception("'and' condition requires at least one operand.");
                }
                for ($i = 1; $i < count($condition); $i++) {
                    if (!self::evaluateCondition($storage, $condition[$i])) {
                        return false;
                    }
                }
                return true;
            } // <<< START: Added handling for 2-element unary operators >>>
            elseif (count($condition) === 2) {
                [$op, $valueLeftKey] = $condition;
                $op = strtolower($op);

                // Resolve left value
                $valueLeft = $storage->address($valueLeftKey)->get();

                return match ($op) {
                    'is_array' => is_array($valueLeft),
                    'is_set' => isset($valueLeft), // Using isset instead of !== null for consistency with old behavior?
                    'notempty' => !empty($valueLeft),
                    'isempty' => empty($valueLeft),
                    default => throw new Exception("Unknown or invalid 2-element operation: {$op}. Condition: " . JsonHelper::encode($condition)),
                };
            }
            // <<< END: Added handling for 2-element unary operators >>>

            // Handle 3-element comparison operators (Changed to elseif)
            elseif (count($condition) === 3) {
                [$op, $valueLeftKey, $valueRightKey] = $condition;
                $op = strtolower($op);

                // Resolve left value
                $valueLeft = $storage->address($valueLeftKey)->get();

                // Resolve right value
                $valueRight = null;
                if ($valueRightKey !== null && $valueRightKey !== '') {
                    $valueRight = $storage->address($valueRightKey)->get();
                }

                // Binary operations logic (unchanged)
                return match ($op) {
                    'equals' => $valueLeft === $valueRight,
                    'notequals' => $valueLeft !== $valueRight,
                    'greaterthan' => is_numeric($valueLeft) && is_numeric($valueRight) && $valueLeft > $valueRight,
                    'greaterthanorequal' => is_numeric($valueLeft) && is_numeric($valueRight) && $valueLeft >= $valueRight,
                    'lessthan' => is_numeric($valueLeft) && is_numeric($valueRight) && $valueLeft < $valueRight,
                    'lessthanorequal' => is_numeric($valueLeft) && is_numeric($valueRight) && $valueLeft <= $valueRight,
                    // Unary ops removed from here as they are handled above
                    default => throw new Exception("Unknown 3-element operation: {$op}. Condition: " . JsonHelper::encode($condition)),
                };
            } // <<< START: Updated final else for other invalid array formats >>>
            else {
                // Handles arrays with 1 element, or 4+ elements that aren't 'and'
                throw new Exception("Invalid array condition format. Expected [op, left, right], [op, left], or [\"and\", cond1...]. Condition: " . JsonHelper::encode($condition));
            }
            // <<< END: Updated final else >>>
        }

        // If condition format is not recognized (fallthrough)
        throw new Exception("Invalid condition format (not bool, numeric, string, or recognized array). Condition: " . JsonHelper::encode($condition));
    }
}
