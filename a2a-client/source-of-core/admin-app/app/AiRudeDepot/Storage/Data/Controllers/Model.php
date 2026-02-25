<?php

namespace App\AiRudeDepot\Storage\Data\Controllers;

use App\Helpers\ArrayHelper;
use App\Helpers\LogHelper;
use App\Helpers\ResponseHelper;
use Exception;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Database\QueryException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Throwable;

class Model
{
    protected ?EloquentModel $modelInstance = null;
    protected string $modelClass;
    protected string $operation = 'all';
    protected array $parameters = [];
    protected array $keyPath = [];
    protected $dataToSave = null;
    protected ?string $connectionName = null;

    /**
     * Initialize the module with model name, parameters, and connection.
     *
     * @param string $modelName Simple model name (e.g., 'User', 'Item')
     * @param array $parameters Parsed parameters including 'operation'
     * @param string|null $connectionName Optional connection name
     * @throws InvalidArgumentException If model class is invalid
     */
    public function __construct(string $modelName, array $parameters = [], ?string $connectionName = null)
    {
        $this->modelClass = $modelName;
        $this->parameters = $parameters;
        $this->operation = $parameters['operation'] ?? 'all';
        $this->connectionName = $connectionName ?? config('database.default');
        $this->keyPath = [];

        LogHelper::debug('Model::__construct', 'Model Module Initialized', [
            'model' => $this->modelClass,
            'operation' => $this->operation,
            'parameters' => $this->parameters,
            'connection' => $this->connectionName,
            'hash' => spl_object_hash($this)
        ]);
    }

    /**
     * Get data from the model based on parameters and keyPath.
     *
     * @param array $keyPath Path to navigate in the result
     * @return mixed The result data or null on error
     */
    public function get(array $keyPath = [])
    {
        $this->keyPath = $keyPath;

        LogHelper::debug('Model::get', 'Called get method', [
            'parameters' => $this->parameters,
            'keyPath' => $this->keyPath,
            'hash' => spl_object_hash($this)
        ]);

        try {
            $this->initializeModelInstance();

            $determinedOperation = $this->determineOperation();
            LogHelper::debug('Model::get', 'Determined operation', [
                'operation' => $determinedOperation,
                'parameters' => $this->parameters,
                'hash' => spl_object_hash($this)
            ]);

            if ($determinedOperation === 'count') {
                $countResult = $this->executeCount();
                LogHelper::debug('Model::get', 'Returning count result', [
                    'count' => $countResult,
                    'hash' => spl_object_hash($this)
                ]);
                return $countResult;
            }

            $result = match ($determinedOperation) {
                'find' => $this->executeFind(),
                'where' => $this->executeWhere(),
                'all' => $this->executeAll(),
                default => throw new InvalidArgumentException("Unsupported operation: {$determinedOperation}")
            };

            if (!empty($this->keyPath) && ($result !== null)) {
                $navigatedResult = ArrayHelper::get($result, implode('.', $this->keyPath));
                LogHelper::debug('Model::get', 'Navigated result', [
                    'original' => $result,
                    'keyPath' => $this->keyPath,
                    'navigated' => $navigatedResult,
                    'hash' => spl_object_hash($this)
                ]);
                return $navigatedResult;
            }

            LogHelper::debug('Model::get', 'Returning raw result', [
                'result' => $result,
                'hash' => spl_object_hash($this)
            ]);
            return $result;

        } catch (Exception $e) {
            LogHelper::error('Model::get', 'Error executing get operation', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'parameters' => $this->parameters,
                'keyPath' => $this->keyPath,
                'hash' => spl_object_hash($this)
            ]);
            return null;
        }
    }

    /**
     * Determine the operation based on parameters.
     *
     * @return string The determined operation
     */
    protected function determineOperation(): string
    {
        if (isset($this->parameters['id'])) {
            return 'find';
        }
        if (isset($this->parameters['operation']) && $this->parameters['operation'] === 'count') {
            return 'count';
        }
        if (!empty($this->parameters['where'])) {
            return 'where';
        }
        return 'all';
    }

    /**
     * Initialize the model instance.
     *
     * @throws InvalidArgumentException If model class is invalid
     * @throws Throwable If instantiation fails
     */
    protected function initializeModelInstance(): void
    {
        LogHelper::debug('Model::initializeModelInstance', 'Attempting initialization', [
            'modelClass' => $this->modelClass,
            'connectionName' => $this->connectionName,
            'instanceExists' => !is_null($this->modelInstance),
            'hash' => spl_object_hash($this)
        ]);

        $fqcn = 'App\\Models\\' . $this->modelClass;

        if (app()->runningUnitTests()) {
            $this->handleTestEnvironment($fqcn);
            return;
        }

        if (!$this->modelInstance) {
            $this->createModelInstance($fqcn);
        } else {
            $this->updateModelConnection();
        }
    }

    /**
     * Handle model initialization in test environment.
     *
     * @param string $fqcn Fully qualified class name
     */
    protected function handleTestEnvironment(string $fqcn): void
    {
        if ($this->modelInstance) {
            LogHelper::debug('Model::handleTestEnvironment', 'Instance exists, updating connection', [
                'hash' => spl_object_hash($this)
            ]);
            $this->updateModelConnection();
            return;
        }

        if (class_exists($fqcn, false)) {
            LogHelper::warning('Model::handleTestEnvironment', 'Class declared but instance null', [
                'fqcn' => $fqcn,
                'hash' => spl_object_hash($this)
            ]);
            try {
                $this->modelInstance = new $fqcn();
                $this->updateModelConnection();
            } catch (Throwable $e) {
                LogHelper::error('Model::handleTestEnvironment', 'Error instantiating class', [
                    'fqcn' => $fqcn,
                    'error' => $e->getMessage()
                ]);
            }
            return;
        }

        LogHelper::debug('Model::handleTestEnvironment', 'Proceeding to normal instantiation', [
            'hash' => spl_object_hash($this)
        ]);
    }

    /**
     * Create a new model instance.
     *
     * @param string $fqcn Fully qualified class name
     * @throws InvalidArgumentException If model class is invalid
     * @throws Throwable If instantiation fails
     */
    protected function createModelInstance(string $fqcn): void
    {
        if (!class_exists($fqcn)) {
            LogHelper::error('Model::createModelInstance', 'Class not found', [
                'fqcn' => $fqcn,
                'hash' => spl_object_hash($this)
            ]);
            throw new InvalidArgumentException("Model class not found: {$fqcn}");
        }

        if (!is_subclass_of($fqcn, EloquentModel::class)) {
            LogHelper::error('Model::createModelInstance', 'Invalid model class', [
                'fqcn' => $fqcn,
                'hash' => spl_object_hash($this)
            ]);
            throw new InvalidArgumentException("Invalid model class provided: {$fqcn} is not an Eloquent model.");
        }

        try {
            $this->modelInstance = new $fqcn();
            $this->updateModelConnection();
            LogHelper::debug('Model::createModelInstance', 'Instance created successfully', [
                'fqcn' => $fqcn,
                'hash' => spl_object_hash($this)
            ]);
        } catch (Throwable $e) {
            LogHelper::critical('Model::createModelInstance', 'Fatal error during instantiation', [
                'fqcn' => $fqcn,
                'error_type' => get_class($e),
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'hash' => spl_object_hash($this)
            ]);
            throw $e;
        }
    }

    /**
     * Update the model's database connection.
     */
    protected function updateModelConnection(): void
    {
        if ($this->connectionName) {
            $this->modelInstance->setConnection($this->connectionName);
            LogHelper::debug('Model::updateModelConnection', 'Connection set', [
                'model' => $this->modelClass,
                'connection' => $this->connectionName,
                'hash' => spl_object_hash($this)
            ]);
        } else {
            $defaultConnection = DB::getDefaultConnection();
            $this->modelInstance->setConnection($defaultConnection);
            LogHelper::debug('Model::updateModelConnection', 'Using default connection', [
                'model' => $this->modelClass,
                'default' => $defaultConnection,
                'hash' => spl_object_hash($this)
            ]);
        }
    }

    public function executeCount()
    {
        $query = $this->getModelQuery();
        $query = $this->applyWhereClauses($query, $this->parameters['where'] ?? []);

        // <<< Logging before count >>>
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        LogHelper::debug('Model::executeCount', 'Executing count query', [
            'sql' => $sql,
            'bindings' => $bindings,
            'parameters' => $this->parameters, // Log parameters used
            'hash' => spl_object_hash($this)
        ]);

        $count = (int)$query->count();

        // <<< Logging after count >>>
        LogHelper::debug('Model::executeCount', 'Count result', [
            'count' => $count,
            'hash' => spl_object_hash($this)
        ]);

        return $count;
    }

    protected function getModelQuery()
    {
        $this->initializeModelInstance(); // Ensure model is instantiated
        return $this->modelInstance->newQuery();
    }

    protected function applyWhereClauses($query, $whereParams)
    {
        LogHelper::debug('Model::applyWhereClauses', 'Applying clauses', [
            'whereParams' => $whereParams,
            'hash' => spl_object_hash($this)
        ]); // Log input
        if (empty($whereParams) || !is_array($whereParams)) {
            return $query;
        }

        // Get the fully qualified model class name
        $fqcn = 'App\\Models\\' . $this->modelClass;

        foreach ($whereParams as $column => $value) {
            // Check if the current model is Item and the column is 'address' or 'type' for simple equality
            if ($this->modelClass === 'Item' && ($column === 'address' || $column === 'type') && !is_array($value)) {
                if ($column === 'address') {
                    // Use the scopeByAddress method
                    $query->byAddress($value);
                    LogHelper::debug('Model::applyWhereClauses', 'Applied byAddress scope', [
                        'value' => $value
                    ]);
                } elseif ($column === 'type') {
                    // Use the scopeByType method
                    $query->byType($value);
                    LogHelper::debug('Model::applyWhereClauses', 'Applied byType scope', [
                        'value' => $value
                    ]);
                }
            } elseif (is_array($value)) { // Handle advanced conditions like 'like', 'in', etc.
                foreach ($value as $operator => $operand) {
                    $sqlOperator = match (strtolower($operator)) {
                        'like' => 'LIKE',
                        'not' => '!=',
                        'gt' => '>',
                        'lt' => '<',
                        'gte' => '>=',
                        'lte' => '<=',
                        'in' => 'whereIn', // Special handling
                        'notin' => 'whereNotIn', // Special handling
                        default => '=', // Default to equals if operator is unknown/numeric
                    };

                    if ($sqlOperator === 'whereIn' || $sqlOperator === 'whereNotIn') {
                        $query->{$sqlOperator}($column, Arr::wrap($operand));
                    } elseif ($sqlOperator === 'LIKE') {
                        $query->where($column, 'LIKE', $operand);
                    } else {
                        $query->where($column, $sqlOperator, $operand);
                    }
                }
            } else {
                // Simple equality
                $query->where($column, '=', $value);
            }
        }
        return $query;
    }

    protected function executeFind()
    {
        if (!isset($this->parameters['id'])) {
            throw new InvalidArgumentException("Missing 'id' parameter for 'find' operation.");
        }
        $id = $this->parameters['id'];
        LogHelper::debug('Model::executeFind', 'Executing Model find', [
            'id' => $id,
            'modelClass' => $this->modelClass,
            'connection' => $this->connectionName,
            'hash' => spl_object_hash($this)
        ]);

        // Revert to static call using FQCN - Ensure modelClass is just the name like 'Item'
        $fqcn = 'App\\Models\\' . $this->modelClass;
        if (!class_exists($fqcn)) {
            LogHelper::error('Model::executeFind', 'Model class for find not found', [
                'fqcn_attempted' => $fqcn
            ]);
            return null; // Class doesn't exist
        }

        $model = $fqcn::on($this->connectionName)->find($id);
        LogHelper::debug('Model::executeFind', 'Model find result', [
            'id' => $id,
            'found' => !is_null($model)
        ]);
        return $model ? $model->toArray() : null;
    }

    protected function executeWhere()
    {
        $query = $this->getModelQuery();
        $query = $this->applyWhereClauses($query, $this->parameters['where'] ?? []);
        $query = $this->applyOrderClauses($query, $this->parameters['order'] ?? []);
        $query = $this->applyLimitClause($query, $this->parameters['limit'] ?? null);

        LogHelper::debug('Model::executeWhere', 'Executing Model where', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
            'hash' => spl_object_hash($this)
        ]);
        $collection = $query->get();
        LogHelper::debug('Model::executeWhere', 'Model where raw collection', [
            'count' => $collection->count(),
            'items' => $collection->all(),
            'hash' => spl_object_hash($this)
        ]); // Log collection
        return $collection->toArray();
    }

    protected function applyOrderClauses($query, $orderParams)
    {
        if (empty($orderParams) || !is_array($orderParams)) {
            return $query;
        }

        foreach ($orderParams as $column => $direction) {
            $direction = strtolower($direction) === 'desc' ? 'desc' : 'asc';
            $query->orderBy($column, $direction);
        }
        return $query;
    }

    protected function applyLimitClause($query, $limit)
    {
        if (!is_null($limit) && is_numeric($limit) && $limit > 0) {
            $query->limit((int)$limit);
        }
        return $query;
    }

    protected function executeAll()
    {
        $query = $this->getModelQuery();
        $query = $this->applyOrderClauses($query, $this->parameters['order'] ?? []);
        $query = $this->applyLimitClause($query, $this->parameters['limit'] ?? null);

        LogHelper::debug('Model::executeAll', 'Executing Model all', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
            'hash' => spl_object_hash($this)
        ]);
        return $query->get()->toArray();
    }

    public function set($keyPath = null, $data = null)
    {
        $this->dataToSave = $data;
        // Potentially update operation based on data or keep it as set by parser
        // Example: if operation was 'find', maybe switch to 'update'?
        // For now, assume the operation from the address is correct for set.
        LogHelper::debug('Model::set', 'Called set method', [
            'parameters' => $this->parameters,
            'keyPath_arg' => $keyPath, // Log the received keyPath
            'data_arg' => $data,      // Log the received data
            'hash' => spl_object_hash($this)
        ]);
        return $this;
    }

    /**
     * Removes a record from the database based on parameters.
     * Primarily uses 'id' from parameters for deletion.
     *
     * @return array Result array containing status and potentially error messages.
     * @throws Exception If deletion fails.
     */
    public function remove()
    {
        LogHelper::info('MODEL REMOVE', 'Initiating remove operation.');

        // Ensure model instance is initialized and available
        try {
            $this->initializeModelInstance();
        } catch (Throwable $e) {
            LogHelper::critical('MODEL REMOVE', 'FATAL ERROR during model initialization in remove()!', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ResponseHelper::error('Failed to initialize model instance for removal: ' . $e->getMessage());
        }
        if (!$this->modelInstance) {
            LogHelper::error('MODEL REMOVE', 'Failed: Model instance is null after initialization attempt for removal.');
            return ResponseHelper::error('Model instance could not be initialized for removal.');
        }

        $modelName = $this->getModelName();
        $primaryKey = $this->modelInstance->getKeyName(); // Get primary key name (usually 'id')

        $removeWhere = [];
        if (isset($this->parameters['id']) && !empty($this->parameters['id'])) {
            $removeWhere[$primaryKey] = $this->parameters['id'];
            LogHelper::info('MODEL REMOVE', 'Using \'id\' from parameters for deletion: ' . $this->parameters['id']);
        } elseif (isset($this->parameters['where']) && is_array($this->parameters['where']) && !empty($this->parameters['where'])) {
            $removeWhere = $this->parameters['where'];
            LogHelper::info('MODEL REMOVE', 'Using \'where\' clause from parameters for deletion.', [
                'where' => $removeWhere
            ]);
        } else {
            LogHelper::error('MODEL REMOVE', 'Failed: No \'id\' or \'where\' clause provided in parameters for removal.');
            return ResponseHelper::error("Cannot remove model '$modelName': No 'id' or 'where' clause specified in parameters.");
        }

        if (empty($removeWhere)) {
            LogHelper::error('MODEL REMOVE', 'Failed: WHERE clause for removal is empty.');
            return ResponseHelper::error("Cannot remove model '$modelName': Removal criteria resulted in an empty WHERE clause.");
        }

        try {
            // Ensure model instance is available ( crucial for remove)
            $this->initializeModelInstance();
            if (!$this->modelInstance) {
                LogHelper::error('MODEL REMOVE', 'Failed: Model instance could not be initialized.');
                return ResponseHelper::error("Cannot remove model '$modelName': Failed to initialize model instance.");
            }
            $query = $this->modelInstance->newQuery();
            $this->applyWhereClauses($query, $removeWhere);

            LogHelper::info('MODEL REMOVE', 'Executing delete query.', [
                'where' => $removeWhere
            ]);
            $deletedCount = $query->delete(); // Use Eloquent's delete

            if ($deletedCount > 0) {
                LogHelper::info('MODEL REMOVE', 'Successfully deleted ' . $deletedCount . ' record(s).');
                // Even if multiple deleted (unexpected with ID), report success based on ID provided.
                return ResponseHelper::success(null, "Record with specified criteria removed from '$modelName'.");
            } else {
                LogHelper::warning('MODEL REMOVE', 'No records found matching the criteria.', [
                    'where' => $removeWhere
                ]);
                return ResponseHelper::error("No record found in '$modelName' matching the specified criteria for removal.");
            }
        } catch (Exception $e) {
            LogHelper::error('MODEL REMOVE', 'Exception during deletion: ' . $e->getMessage(), [
                'exception' => $e,
                'where' => $removeWhere
            ]);
            throw new Exception("Error removing record from '$modelName': " . $e->getMessage());
        }
    }

    /**
     * Helper method to get the simple model name.
     *
     * @return string
     */
    protected function getModelName(): string
    {
        return $this->modelClass ?? 'UnknownModel'; // Return stored simple name
    }

    /**
     * Saves data to the model (creates or updates).
     *
     * @return array Result array including status, ID, and potentially the saved/updated data.
     * @throws Exception If saving fails.
     */
    public function save()
    {
        LogHelper::info('MODEL SAVE', 'Initiating save operation.');

        // Ensure model is initialized before proceeding (needed for getKeyName, etc.)
        try {
            $this->initializeModelInstance();
        } catch (Throwable $e) {
            LogHelper::critical('MODEL SAVE', 'FATAL ERROR during model initialization in save()!', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Return an error structure consistent with the method's expected output
            return ResponseHelper::error('Failed to initialize model instance: ' . $e->getMessage());
        }
        // Check if initialization actually worked
        if (!$this->modelInstance) {
            LogHelper::error('MODEL SAVE', 'Failed: Model instance is null after initialization attempt.');
            return ResponseHelper::error('Model instance could not be initialized.');
        }

        $modelName = $this->getModelName();
        $primaryKey = $this->modelInstance->getKeyName(); // Usually 'id'
        $dataForOperation = $this->dataToSave; // Data set via Data::set()

        if (empty($dataForOperation)) {
            LogHelper::error('MODEL SAVE', 'Failed: Data to save is empty.');
            return ResponseHelper::error("Cannot save to model '$modelName': No data provided.");
        }

        LogHelper::info('MODEL SAVE', 'Data payload:', $dataForOperation);

        // Determine if it's an update or create
        $isUpdate = false;
        $updateWhere = [];
        $recordId = null; // The ID we are targeting for update/delete or the ID resulting from create

        // 1. Prioritize 'id' from parameters for update WHERE clause
        if (isset($this->parameters['id']) && !empty($this->parameters['id'])) {
            $recordId = $this->parameters['id'];
            $updateWhere[$primaryKey] = $recordId;
            $isUpdate = true; // Assume update if ID is provided in parameters
            LogHelper::info('MODEL SAVE', 'Determined UPDATE based on \'id\' in parameters: ' . $recordId);
        } // 2. If no parameter 'id', check if an existing model instance was loaded (e.g., by a prior 'get' with ID)
        elseif ($this->modelInstance->exists) {
            $recordId = $this->modelInstance->getKey();
            $updateWhere[$primaryKey] = $recordId;
            $isUpdate = true;
            LogHelper::info('MODEL SAVE', 'Determined UPDATE based on existing loaded model instance with ID: ' . $recordId);
        } // 3. If no parameter 'id' and no loaded instance, check for 'id' in the data payload itself
        elseif (isset($dataForOperation[$primaryKey]) && !empty($dataForOperation[$primaryKey])) {
            $recordId = $dataForOperation[$primaryKey];
            $updateWhere[$primaryKey] = $recordId;
            $isUpdate = true;
            LogHelper::info('MODEL SAVE', 'Determined UPDATE based on \'$primaryKey\' in data payload: ' . $recordId);
            // Remove primary key from data payload for update operation to avoid issues
            // unset($dataForOperation[$primaryKey]); -> No, keep PK for potential direct query update where needed
        } // 4. If no parameter 'id', no loaded instance, no data 'id', check for 'where' in parameters
        elseif (isset($this->parameters['where']) && is_array($this->parameters['where']) && !empty($this->parameters['where'])) {
            $updateWhere = $this->parameters['where'];
            $isUpdate = true;
            LogHelper::info('MODEL SAVE', 'Determined UPDATE based on \'where\' clause in parameters.', [
                'where' => $updateWhere
            ]);
        } else {
            LogHelper::info('MODEL SAVE', 'Determined CREATE operation (no existing ID or WHERE identified).');
        }


        // --- Execute Operation ---
        try {
            if ($isUpdate) {
                // --- UPDATE ---
                LogHelper::info('MODEL SAVE', 'Performing UPDATE operation.', [
                    'where' => $updateWhere
                ]);

                if (empty($updateWhere)) {
                    LogHelper::error('MODEL SAVE', 'Failed UPDATE: Target WHERE clause is empty.');
                    return ResponseHelper::error("Cannot update model '$modelName': Update criteria resulted in an empty WHERE clause.");
                }

                // Filter data based on $fillable ONLY if config requires it (optional, default is flexible update)
                // For now, allow direct update like Mysql module
                // $filteredData = $this->filterFillable($dataForOperation);
                $filteredData = $dataForOperation; // Use raw data for update
                if (isset($filteredData[$primaryKey]) && isset($updateWhere[$primaryKey]) && $updateWhere[$primaryKey] !== $filteredData[$primaryKey] && count($updateWhere) === 1 && array_key_exists($primaryKey, $updateWhere)) { // Added isset check for $updateWhere[$primaryKey]
                    LogHelper::warning('MODEL SAVE', 'Primary key \'$primaryKey\' present in update data differs from WHERE clause ID. Using WHERE clause ID: ' . $updateWhere[$primaryKey]);
                    // Generally, don't allow changing PK via standard update with ID.
                    // If changing PK is intended, it should likely be a different process or explicitly handled.
                    unset($filteredData[$primaryKey]);
                }


                LogHelper::info('MODEL SAVE', 'Data for update operation:', $filteredData);
                if (empty($filteredData)) {
                    LogHelper::warning('MODEL SAVE', 'Update data is empty after filtering or processing. No update performed.');
                    // Return success but indicate no change if ID was found? Or error? Let's treat as success with 0 affected rows.
                    // Attempt to fetch the record based on where clause to return its current state.
                    $query = $this->modelInstance->newQuery();
                    $this->applyWhereClauses($query, $updateWhere);
                    $existingRecord = $query->first();
                    if ($existingRecord) {
                        return ResponseHelper::success($existingRecord->toArray(), "Update requested with empty data for '$modelName'. No changes made.", ['id' => $existingRecord->getKey(), 'affected_rows' => 0]);
                    } else {
                        return ResponseHelper::error("Update requested with empty data for '$modelName', and no record found matching WHERE.", ['where' => $updateWhere, 'affected_rows' => 0]);
                    }
                }

                // Build the update query
                $query = $this->modelInstance->newQuery();
                $this->applyWhereClauses($query, $updateWhere);

                LogHelper::info('MODEL SAVE', 'Executing update query.', [
                    'where' => $updateWhere,
                    'data' => $filteredData
                ]);
                $affectedRows = $query->update($filteredData); // Use Query Builder update (bypasses mass assignment)

                if ($affectedRows > 0) {
                    LogHelper::info('MODEL SAVE', 'Update successful. ' . $affectedRows . ' row(s) affected.');
                    // Fetch the updated record to return its current state
                    $updatedRecordQuery = $this->modelInstance->newQuery();
                    // Re-apply the *original* update WHERE clause to fetch the record(s) we just updated
                    $this->applyWhereClauses($updatedRecordQuery, $updateWhere);
                    $updatedRecord = $updatedRecordQuery->first(); // Fetch the first affected record

                    if ($updatedRecord) {
                        return ResponseHelper::success($updatedRecord->toArray(), "Record updated successfully in '$modelName'.", ['id' => $updatedRecord->getKey(), 'affected_rows' => $affectedRows]);
                    } else {
                        // Should not happen if affectedRows > 0, but handle defensively
                        LogHelper::error('MODEL SAVE', 'Update reported success (' . $affectedRows . ' rows), but failed to retrieve updated record.', [
                            'where' => $updateWhere
                        ]);
                        return ResponseHelper::error("Record update reported success but failed post-update retrieval in '$modelName'.", ['affected_rows' => $affectedRows]);
                    }
                } else {
                    // Check if record exists matching the criteria but wasn't updated (maybe data was identical?)
                    $queryCheck = $this->modelInstance->newQuery();
                    $this->applyWhereClauses($queryCheck, $updateWhere);
                    $existingRecord = $queryCheck->first();
                    if ($existingRecord) {
                        LogHelper::info('MODEL SAVE', 'Update affected 0 rows. Record found, data might be identical.', [
                            'where' => $updateWhere
                        ]);
                        return ResponseHelper::success($existingRecord->toArray(), "Record found but not updated in '$modelName' (data may be identical).", ['id' => $existingRecord->getKey(), 'affected_rows' => 0]);
                    } else {
                        LogHelper::warning('MODEL SAVE', 'Update affected 0 rows. No record found matching the criteria.', [
                            'where' => $updateWhere
                        ]);
                        return ResponseHelper::error("No record found in '$modelName' matching the specified criteria for update.", ['affected_rows' => 0]);
                    }
                }

            } else {
                // --- CREATE ---
                LogHelper::info('MODEL SAVE', 'Performing CREATE operation.');
                // Filter data based on $fillable for create operation
                $filteredData = $this->filterFillable($dataForOperation);

                LogHelper::info('MODEL SAVE', 'Data for create operation (after fillable filter):', [
                    'input_data' => $dataForOperation,
                    'filtered_data' => $filteredData
                ]); // Log both input and filtered
                if (empty($filteredData)) {
                    LogHelper::error('MODEL SAVE', 'Failed CREATE: Data is empty after filtering based \$fillable property of \'$modelName\'.');
                    return ResponseHelper::error("Cannot create record in '$modelName': No fillable data provided.");
                }

                // Ensure primary key is not set for create, Eloquent handles auto-increment
                if (isset($filteredData[$primaryKey])) {
                    LogHelper::warning('MODEL SAVE', 'Primary key \'$primaryKey\' present in create data. It will be ignored if auto-incrementing.', [
                        'pk_value' => $filteredData[$primaryKey]
                    ]);
                    // Depending on DB/model config, explicitly providing PK might be allowed or cause error.
                    // Eloquent create usually ignores it for auto-increment PKs.
                    // Let Eloquent handle it. If PK is not auto-increment and needs to be set, it should be in fillable.
                }

                LogHelper::info('MODEL SAVE', 'Executing create operation.', [
                    'data' => $filteredData
                ]);
                // Use Eloquent's create method (respects $fillable)
                $newRecord = null;
                try {
                    $newRecord = $this->modelInstance->create($filteredData);
                    LogHelper::debug('MODEL SAVE', 'Eloquent create executed.', [
                        'returned_record_exists' => !is_null($newRecord) && $newRecord->exists
                    ]);
                } catch (Throwable $e) {
                    LogHelper::error('MODEL SAVE', 'Exception during Eloquent create:', [
                        'error' => $e->getMessage(),
                        'data' => $filteredData
                    ]);
                    throw $e; // Re-throw after logging
                }

                if ($newRecord && $newRecord->exists) {
                    $newId = $newRecord->getKey();
                    LogHelper::info('MODEL SAVE', 'Create successful. New record ID: ' . $newId);
                    return ResponseHelper::success($newRecord->toArray(), "Record created successfully in '$modelName'.", ['id' => $newId]);
                } else {
                    LogHelper::error('MODEL SAVE', 'Create operation failed unexpectedly.', [
                        'data' => $filteredData
                    ]);
                    return ResponseHelper::error("Failed to create record in '$modelName'.");
                }
            }
        } catch (QueryException $e) {
            $errorCode = $e->errorInfo[1] ?? null;
            $errorMessage = $e->getMessage();
            LogHelper::error('MODEL SAVE', 'QueryException during save: (' . $errorCode . ') ' . $errorMessage, [
                'exception' => $e,
                'isUpdate' => $isUpdate,
                'where' => $updateWhere ?? null,
                'data' => $dataForOperation
            ]);
            throw new Exception("Database error saving to '$modelName': ($errorCode) " . $errorMessage);
        } catch (Exception $e) {
            LogHelper::error('MODEL SAVE', 'Exception during save: ' . $e->getMessage(), [
                'exception' => $e,
                'isUpdate' => $isUpdate,
                'where' => $updateWhere ?? null,
                'data' => $dataForOperation
            ]);
            throw new Exception("Error saving record to '$modelName': " . $e->getMessage());
        }
    }

    // Helper method to get dynamic properties for logging or debugging

    /**
     * Filters data array to include only keys present in the model's $fillable property.
     *
     * @param array $data The data to filter.
     * @return array The filtered data.
     */
    protected function filterFillable(array $data): array
    {
        // Ensure model instance is available
        if (!$this->modelInstance) {
            LogHelper::warning('MODEL filterFillable', 'Model instance not initialized. Cannot filter data.');
            return [];
        }
        $modelName = $this->getModelName(); // Helper to get model name

        $fillable = $this->modelInstance->getFillable();
        if (empty($fillable)) {
            // Check $guarded as well. If $guarded is specifically ['*'], nothing is fillable.
            if ($this->modelInstance->getGuarded() === ['*']) {
                LogHelper::error('MODEL filterFillable', 'Model \'' . $modelName . '\' is fully guarded (\'*\' property). No data allowed for mass assignment.', [
                    'data_attempted' => $data
                ]);
                return []; // Nothing is fillable
            }
            LogHelper::warning('MODEL filterFillable', 'Model \'' . $modelName . '\' has an empty \$fillable array. Allowing all data for create (ensure \$guarded is set appropriately if needed).', [
                'data_passed' => $data
            ]);
            return $data;
        }

        $filtered = Arr::only($data, $fillable);

        // Log differences if any keys were filtered out
        $removedKeys = array_diff_key($data, $filtered);
        if (!empty($removedKeys)) {
            LogHelper::debug('MODEL filterFillable', 'Filtered out keys based on \$fillable', [
                'model' => $modelName,
                'fillable' => $fillable,
                'original_keys' => array_keys($data),
                'filtered_keys' => array_keys($filtered),
                'removed_keys' => array_keys($removedKeys)
            ]);
        } else {
            LogHelper::debug('MODEL filterFillable', 'All keys allowed by \$fillable', [
                'model' => $modelName,
                'keys' => array_keys($data)
            ]);
        }
        return $filtered;
    }

    public function __debugInfo()
    {
        return [
            'modelClass' => $this->modelClass,
            'operation' => $this->operation,
            'parameters' => $this->parameters,
            'keyPath' => $this->keyPath,
            'connectionName' => $this->connectionName,
            'dataToSave' => $this->dataToSave,
            'modelInstanceInitialized' => !is_null($this->modelInstance),
            'hash' => spl_object_hash($this)
        ];
    }

    // +++ ADDED: Public getter for operation +++

    public function updatePathInfo(array $pathInfo): void
    {
        // Replaces the previous segment-based logic.
        // Directly update state from the provided pathInfo array.

        $previousOperation = $this->operation;
        $previousParameters = $this->parameters;

        $this->operation = $pathInfo['parameters']['operation'] ?? $this->operation; // Default to existing if not set
        $this->parameters = $pathInfo['parameters'] ?? []; // Overwrite parameters completely
        $this->keyPath = $pathInfo['keyPath'] ?? []; // Update keyPath as well
        // $this->modelClass = $pathInfo['storagePath'] ?? $this->modelClass; // modelClass shouldn't change for cached instance
        // $this->connectionName remains the same

        LogHelper::debug('Model::updatePathInfo', 'Executed (array)', [
            'hash' => spl_object_hash($this),
            'pathInfo_received' => $pathInfo, // Log the whole input
            'previous_operation' => $previousOperation,
            'new_operation' => $this->operation,
            'previous_parameters' => $previousParameters,
            'new_parameters' => $this->parameters,
        ]);
    }

    // +++ END ADDED +++

    public function getOperation(): string
    {
        return $this->operation;
    }
}
