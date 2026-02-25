<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\Helpers\ArrayHelper;
use App\Helpers\DbHelper;
use App\Helpers\LogHelper;
use App\Helpers\StringHelper;
use Exception;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

class Mysql
{
    protected bool $loaded = true;
    protected string $connection;
    protected string $table;
    protected string $operation = 'select';
    protected array $parameters = [];
    protected $data = null;
    protected array $pathInfo = [];
    protected string $tableName;
    protected array $keyPath = [];
    protected string $address;
    protected ?string $connectionName = null;

    /**
     * Initialize the MySQL controller.
     *
     * @param string $tableName Name of the table
     * @param array $parameters Query parameters
     * @param string|null $connectionName Database connection name
     * @throws InvalidArgumentException If table name is invalid
     */
    public function __construct(string $tableName, array $parameters = [], ?string $connectionName = null)
    {
        $this->connectionName = $connectionName ?: DB::getDefaultConnection();
        $this->tableName = $tableName;
        $this->parameters = $parameters;
        $this->operation = $parameters['operation'] ?? 'select';
        $this->keyPath = [];

        LogHelper::debug('Mysql::__construct', 'State initialized', [
            'table' => $this->tableName,
            'operation' => $this->operation,
            'parameters' => $this->parameters,
            'connection' => $this->connectionName,
            'hash' => spl_object_hash($this)
        ]);

        $this->reload();
    }

    /**
     * Reload data from the database.
     *
     * @param mixed|null $data Optional data to load
     * @return self
     */
    public function reload($data = null): self
    {
        LogHelper::debug('Mysql::reload', 'Called', [
            'hash' => spl_object_hash($this)
        ]);
        $this->loaded = true;
        return $this;
    }

    /**
     * Get data from the database.
     *
     * @param string|array|null $keyPath Path to get data from
     * @return mixed The data or null if not found
     * @throws RuntimeException If operation fails
     */
    public function get($keyPath = null)
    {
        LogHelper::debug('Mysql::get', 'Called', [
            'hash' => spl_object_hash($this),
            'keyPathArgument' => $keyPath,
            'instanceKeyPath' => $this->keyPath,
            'parameters' => $this->parameters
        ]);

        $effectiveKeyPath = $keyPath ?? $this->keyPath;
        $determinedOperation = $this->determineOperation();

        if (!in_array($determinedOperation, ['select', 'count'])) {
            LogHelper::error('Mysql::get', 'Invalid operation', [
                'hash' => spl_object_hash($this),
                'operation' => $determinedOperation
            ]);
            throw new RuntimeException("Invalid operation for Mysql get: {$determinedOperation}");
        }

        try {
            $query = $this->buildQuery();
            $query = $this->applyQueryConstraints($query);
            $result = $this->executeQuery($query, $determinedOperation);
            $finalResult = $this->processResult($result);

            if (!empty($effectiveKeyPath) && $finalResult !== null) {
                $navigatedResult = ArrayHelper::get($finalResult, $effectiveKeyPath);
                LogHelper::debug('Mysql::get', 'Navigated result', [
                    'originalFinal' => $finalResult,
                    'keyPath' => $effectiveKeyPath,
                    'navigated' => $navigatedResult,
                    'hash' => spl_object_hash($this)
                ]);
                return $navigatedResult;
            }

            return $finalResult;
        } catch (Exception $e) {
            LogHelper::error('Mysql::get', 'Operation failed', [
                'hash' => spl_object_hash($this),
                'operation' => $determinedOperation,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new RuntimeException("Failed to execute Mysql {$determinedOperation}: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Build the base query.
     *
     * @return Builder The query builder instance
     */
    protected function buildQuery(): Builder
    {
        return DB::connection($this->connectionName)->table($this->tableName);
    }

    /**
     * Apply query constraints.
     *
     * @param Builder $query The query builder instance
     * @return Builder The modified query builder
     */
    protected function applyQueryConstraints(Builder $query): Builder
    {
        if (!empty($this->parameters['id'])) {
            $whereForQuery = ['id' => $this->parameters['id']];
            LogHelper::debug('Mysql::applyQueryConstraints', 'Applying WHERE by ID', [
                'where' => $whereForQuery
            ]);
            $query = $this->applyWhereClauses($query, $whereForQuery);
        } elseif (!empty($this->parameters['where'])) {
            LogHelper::debug('Mysql::applyQueryConstraints', 'Applying WHERE by parameters', [
                'where' => $this->parameters['where']
            ]);
            $query = $this->applyWhereClauses($query, $this->parameters['where']);
        }

        $query = $this->applyOrderClauses($query, $this->parameters['order'] ?? []);
        $query = $this->applyLimitClause($query, $this->parameters['limit'] ?? null);

        return $query;
    }

    /**
     * Apply WHERE clauses to the query.
     *
     * @param Builder $query The query builder instance
     * @param array $wheres The WHERE conditions
     * @return Builder The modified query builder
     */
    protected function applyWhereClauses(Builder $query, array $wheres): Builder
    {
        foreach ($wheres as $column => $value) {
            if (is_array($value)) {
                $query->where($column, $value);
            } else {
                $query->where($column, '=', $value);
            }
        }
        return $query;
    }

    /**
     * Apply ORDER BY clauses to the query.
     *
     * @param Builder $query The query builder instance
     * @param array|string $orders The ORDER BY conditions
     * @return Builder The modified query builder
     */
    protected function applyOrderClauses(Builder $query, $orders): Builder
    {
        if (empty($orders)) {
            return $query;
        }

        $orders = is_array($orders) ? $orders : [$orders];

        foreach ($orders as $column => $direction) {
            if (is_numeric($column)) {
                $parts = explode(' ', $direction, 2);
                $column = $parts[0];
                $direction = StringHelper::upper($parts[1] ?? 'ASC');
            } else {
                $direction = StringHelper::upper($direction);
            }

            if (in_array($direction, ['ASC', 'DESC'])) {
                $query->orderBy($column, $direction);
            }
        }

        return $query;
    }

    /**
     * Apply LIMIT clause to the query.
     *
     * @param Builder $query The query builder instance
     * @param int|null $limit The limit value
     * @return Builder The modified query builder
     */
    protected function applyLimitClause(Builder $query, ?int $limit): Builder
    {
        if ($limit !== null && $limit > 0) {
            $query->limit($limit);
        }
        return $query;
    }

    /**
     * Execute the query based on operation type.
     *
     * @param Builder $query The query builder instance
     * @param string $operation The operation type
     * @return mixed The query result
     */
    protected function executeQuery(Builder $query, string $operation)
    {
        if ($operation === 'count') {
            return $this->executeCount($query);
        }
        return $this->executeSelect($query);
    }

    /**
     * Execute a COUNT query.
     *
     * @param Builder $query The query builder instance
     * @return int The count result
     */
    protected function executeCount(Builder $query): int
    {
        $countQuery = $query->cloneWithout([
            'orders', 'limit', 'offset'
        ])->cloneWithoutBindings([
            'order'
        ]);

        LogHelper::debug('Mysql::executeCount', 'Executing count query', [
            'hash' => spl_object_hash($this),
            'sql' => $countQuery->toSql(),
            'bindings' => $countQuery->getBindings()
        ]);

        return $countQuery->count();
    }

    /**
     * Execute a SELECT query.
     *
     * @param Builder $query The query builder instance
     * @return array The query results
     */
    protected function executeSelect(Builder $query): array
    {
        LogHelper::debug('Mysql::executeSelect', 'Executing select query', [
            'hash' => spl_object_hash($this),
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);

        return $query->get()->toArray();
    }

    /**
     * Process the query result.
     *
     * @param mixed $result The query result
     * @return mixed The processed result
     */
    protected function processResult($result)
    {
        $isFindContext = !empty($this->parameters['id']);
        LogHelper::debug('Mysql::processResult', 'Processing result', [
            'isFindContext' => $isFindContext,
            'resultCount' => is_array($result) ? count($result) : 'N/A',
            'hash' => spl_object_hash($this)
        ]);

        if ($isFindContext) {
            if (empty($result)) {
                LogHelper::debug('Mysql::processResult', 'No record found', [
                    'hash' => spl_object_hash($this)
                ]);
                return null;
            }
            LogHelper::debug('Mysql::processResult', 'Record found', [
                'hash' => spl_object_hash($this)
            ]);
            return $result[0];
        }

        LogHelper::debug('Mysql::processResult', 'Returning result array', [
            'hash' => spl_object_hash($this)
        ]);
        return $result;
    }

    /**
     * Determine the operation type.
     *
     * @return string The operation type
     */
    protected function determineOperation(): string
    {
        if (isset($this->parameters['operation']) && $this->parameters['operation'] === 'count') {
            return 'count';
        }
        return 'select';
    }

    /**
     * Save data to the database.
     *
     * @return bool|int|string The result of the save operation
     * @throws RuntimeException If operation fails
     */
    public function save(): bool|int|string
    {
        try {
            $query = $this->buildQuery();
            $data = $this->data;

            if (empty($data)) {
                throw new RuntimeException('No data to save');
            }

            switch ($this->operation) {
                case 'insert':
                    return $this->executeInsert($query, $data);
                case 'update':
                    return $this->executeUpdate($query, $data);
                case 'delete':
                    return $this->executeDelete($query);
                default:
                    throw new RuntimeException("Invalid operation for save: {$this->operation}");
            }
        } catch (Exception $e) {
            LogHelper::error('Mysql::save', 'Save operation failed', [
                'operation' => $this->operation,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new RuntimeException("Failed to save data: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Execute an INSERT query.
     *
     * @param Builder $query The query builder instance
     * @param array $data The data to insert
     * @return bool|int|string The insert result
     */
    protected function executeInsert(Builder $query, array $data): bool|int|string
    {
        LogHelper::debug('Mysql::executeInsert', 'Executing insert', [
            'data' => $data
        ]);

        return $query->insertGetId($data);
    }

    /**
     * Execute an UPDATE query.
     *
     * @param Builder $query The query builder instance
     * @param array $data The data to update
     * @return bool The update result
     */
    protected function executeUpdate(Builder $query, array $data): bool
    {
        LogHelper::debug('Mysql::executeUpdate', 'Executing update', [
            'data' => $data
        ]);

        return $query->update($data);
    }

    /**
     * Execute a DELETE query.
     *
     * @param Builder $query The query builder instance
     * @return bool The delete result
     */
    protected function executeDelete(Builder $query): bool
    {
        LogHelper::debug('Mysql::executeDelete', 'Executing delete');

        return $query->delete();
    }

    /**
     * Set data in the database.
     *
     * @param string|array $keyPath Path to set data at
     * @param mixed $value Value to set
     * @return self
     */
    public function set($keyPath, $value = null): self
    {
        if ($value === null && func_num_args() === 1) {
            $this->data = $keyPath;
        } else {
            $this->data = ArrayHelper::set($this->data ?? [], $keyPath, $value);
        }
        return $this;
    }

    /**
     * Set the operation type.
     *
     * @param string $operation The operation type
     * @throws InvalidArgumentException If operation is invalid
     */
    public function setOperation(string $operation): void
    {
        if (!in_array($operation, ['select', 'insert', 'update', 'delete', 'count'])) {
            throw new InvalidArgumentException("Invalid operation: {$operation}");
        }
        $this->operation = $operation;
    }

    /**
     * Update path information.
     *
     * @param array $pathInfo The path information
     */
    public function updatePathInfo(array $pathInfo): void
    {
        $this->pathInfo = $pathInfo;
    }
}
