<?php

namespace App\AiRudeDepot\Storage\Data\Hooks;

use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Render\Exception;
use Error;
use TypeError;

// use App\Facades\ResponseDataCollector;

class Action
{
    private static $logSteps = [];
    private $steps = [];

    public static function setLogSteps(array $logSteps)
    {
        self::$logSteps = $logSteps;
    }

    public static function execute(callable $action, $data)
    {
        try {
            return $action($data);
        } catch (Exception $e) {
            ActionHelper::log("Error executing action: " . $e->getMessage());
            throw new \Exception("Error executing action: " . $e->getMessage());
        }
    }

    public function addStep($step)
    {
        if (is_array($step)) {
            if (array_is_list($step)) {
                $this->steps = array_merge($this->steps, $step);
            } else {
                $this->steps[] = $step;
            }
        } else {
            throw new \Exception("Step is not an array");
        }
    }

    public function run(): StepResponse
    {
        $response = new StepResponse();
        foreach ($this->steps as $step) {
            if ($response->isHalted()) {
                break;
            }
            $result = $this->runStep($step, $response);
            if ($result instanceof StepResponse) {
                $response->merge($result);
            }
        }
        return $response;
    }

    public static function runStep($step, StepResponse $response)
    {
        $name = $step['name'];
        $callable = $step['callable'];

        if (in_array($name, self::$logSteps)) {
            // ResponseDataCollector::push('report', "start $name");
        }

        try {
            $result = $callable($response);
            if ($result instanceof StepResponse) {
                return $result;
            }
        } catch (Error|TypeError $e) {
            $response->addHistory("* Error in $name: " . $e->getMessage(), 'error');
        }

        if (in_array($name, self::$logSteps)) {
            // ResponseDataCollector::push('report', "end $name");
        }

        return null;
    }

    public function __call($name, $arguments)
    {
        throw new \Exception("Method $name not found");
    }
}

