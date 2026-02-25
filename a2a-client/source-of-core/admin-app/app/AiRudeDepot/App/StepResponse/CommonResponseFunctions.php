<?php

namespace App\AiRudeDepot\App\StepResponse;

use App\AiRudeDepot\Box\Response\ResponseHelper;
use App\Helpers\ArrayHelper;
use Exception;

class CommonResponseFunctions
{
    public bool $halt = false;
    public bool $completed = false;
    public array $data = [];
    protected StepStatusEnum $status;
    protected ?string $message = null;
    protected $history = [];
    protected $console = [];
    protected $enableHistory = true;
    protected $enableDebug = true;

    public function __construct()
    {
        $this->status = StepStatusEnum::OK;
    }

    public function getData(): array
    {
        return $this->data;
    }

    public function getHistory(): array
    {
        return $this->history;
    }

    public function getConsole(): array
    {
        return $this->console;
    }

    public function isFull()
    {
        return isset($this->data['full']) && $this->data['full'];
    }

    public function setIsFull(bool $isFull)
    {
        $this->data['full'] = $isFull;
    }

    public function getStatus(): StepStatusEnum
    {
        return $this->status;
    }

    public function setStatus(StepStatusEnum $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): self
    {
        $this->message = $message;
        return $this;
    }

    public function addHistory(string $message, string $type = 'info', array $traceback = [])
    {
        // Create an exception to get the stack trace
        if ($type == 'error') {
            if (empty($traceback)) {
                if ($this->enableDebug) {
                    $exception = new Exception();
                    $traceback = $exception->getTrace();
                }
            }
        }

        if ($this->enableHistory || $type == 'error') {
            $this->history[] = [
                'header' => ucfirst($type),
                'message' => $message,
                'type' => $type,
                'traceback' => $this->enableDebug ? array_slice($traceback, 0, 15) : []
            ];
        }
        if ($type === 'error') {
            $this->setStatus(StepStatusEnum::ERROR);
        }
        return $this;
    }

    public function halt()
    {
        $this->halt = true;
        $this->setStatus(StepStatusEnum::HALTED);
        return $this;
    }

    public function addConsole(array $data): self
    {
        $this->console[] = $data;
        return $this;
    }

    public function complete()
    {
        $this->completed = true;
        return $this;
    }

    public function isCompleted(): bool
    {
        return $this->completed || $this->isHalted();

    }

    public function isHalted(): bool
    {
        return $this->halt;
    }

    public function addData(string $key, $value)
    {
        $this->data[$key] = $value;
        return $this;
    }

    public function getResponse()
    {
        return ResponseHelper::success($this->data);
    }

    public function addDataRecursive($data)
    {
        if (is_array($data)) {
            $this->data = ArrayHelper::mergeRecursiveOverwrite($this->data, $data);
        } else {
            throw new Exception("Data must be an array.");
        }

        return $this;
    }

    public function mergeData(array $data, bool $overwrite = true): self
    {
        if ($overwrite) {
            $this->data = ArrayHelper::mergeRecursiveOverwrite($this->data, $data);
        } else {
            $this->data = array_merge_recursive($this->data, $data);
        }
        return $this;
    }
}
