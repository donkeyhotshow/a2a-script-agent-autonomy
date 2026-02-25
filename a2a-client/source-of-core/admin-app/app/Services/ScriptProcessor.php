<?php

namespace App\Services;

use App\Helpers\ScriptHelper;
use App\Helpers\LogHelperTrait;
use App\Helpers\FileHelperTrait;
use App\Helpers\JsonHelperTrait;
use App\Helpers\PathHelperTrait;

class ScriptProcessor
{
    use LogHelperTrait;
    use FileHelperTrait;
    use JsonHelperTrait;
    use PathHelperTrait;

    protected $scriptHelper;
    protected $basePath;
    protected $stateFile;
    protected $processorPath;
    protected $logFile;

    public function __construct(ScriptHelper $scriptHelper)
    {
        $this->scriptHelper = $scriptHelper;
        $this->basePath = base_path();
        $this->stateFile = $this->join($this->basePath, 'script/engine/state/system.state.json');
        $this->processorPath = $this->join($this->basePath, 'script/engine/main/main-processor.php');
        $this->logFile = 'main_processor.log';
    }

    public function process(string $mode, ?string $payload = null, string $outputFormat = 'json', ?string $taskId = null, ?string $scenarioId = null, bool $force = false)
    {
        // Validate mode
        $validModes = ['list', 'info', 'process', 'clear', 'status', 'result', 'log'];
        if (!in_array($mode, $validModes)) {
            throw new \InvalidArgumentException("Invalid mode: {$mode}");
        }

        // Get system state
        $state = $this->getSystemState();
        $this->logInfo("Initial active task: {$state['publishedTaskId']}");

        // Construct payload if needed
        if ($taskId || $scenarioId) {
            $mainPayload = [
                'taskId' => $taskId,
                'scenarioId' => $scenarioId,
                'force' => $force
            ];
            $payload = base64_encode($this->encode($mainPayload));
        }

        // Execute script
        $result = $this->scriptHelper->executeScript('main.ps1', [
            '--mode', $mode,
            '--payload', $payload,
            '--output-format', $outputFormat
        ]);

        if (!$result['success']) {
            $this->logError("Failed to execute main processor");
            throw new \RuntimeException("Script execution failed");
        }

        return $outputFormat === 'json' 
            ? $this->decode($result['output'][0])
            : implode("\n", $result['output']);
    }

    protected function getSystemState(): array
    {
        if (!$this->exists($this->stateFile)) {
            return [
                'activeTaskId' => null,
                'publishedTaskId' => null,
                'lastProcessedTaskId' => null,
                'lastProcessedTimestamp' => null,
                'isProcessing' => false,
                'lastError' => null,
                'lastErrorTimestamp' => null
            ];
        }

        return $this->decode($this->get($this->stateFile));
    }

    protected function saveSystemState(array $state): void
    {
        $this->put($this->stateFile, $this->encode($state));
    }

    public function getScenarioProgress(string $taskId): array
    {
        $progressFile = $this->join($this->basePath, "script/engine/state/task_{$taskId}_progress.json");
        
        if (!$this->exists($progressFile)) {
            return [
                'taskId' => $taskId,
                'status' => 'unknown',
                'progress' => 0,
                'lastUpdate' => null,
                'error' => null
            ];
        }

        return $this->decode($this->get($progressFile));
    }

    public function getScenarioResult(string $taskId): ?array
    {
        $resultFile = $this->join($this->basePath, "script/engine/state/task_{$taskId}_result.json");
        
        if (!$this->exists($resultFile)) {
            return null;
        }

        return $this->decode($this->get($resultFile));
    }

    public function getScenarioLog(string $taskId): ?array
    {
        $logFile = $this->join($this->basePath, "script/engine/state/task_{$taskId}_log.json");
        
        if (!$this->exists($logFile)) {
            return null;
        }

        return $this->decode($this->get($logFile));
    }
} 