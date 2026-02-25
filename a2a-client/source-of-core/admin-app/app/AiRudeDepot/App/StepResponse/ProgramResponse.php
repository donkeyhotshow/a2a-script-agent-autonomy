<?php

namespace App\AiRudeDepot\App\StepResponse;

use App\Helpers\ResponseHelper;
use Exception;

class ProgramResponse extends StepResponse
{
    protected $specialData = [];

    public function addSpecialData($key, $value)
    {
        if (!ResponseHelper::validateSpecialData($value)) {
            throw new Exception("Invalid special data provided.");
        }

        if (!isset($this->specialData[$key])) {
            $this->specialData[$key] = [];
        }
        $this->specialData[$key][] = $value;
        return $this;
    }

    public function merge($other)
    {
        // First handle StepResponse parent data
        parent::merge($other);

        // If merging with another ProgramResponse, merge special data too
        if ($other instanceof ProgramResponse) {
            foreach ($other->getSpecialData() as $key => $value) {
                if (!isset($this->specialData[$key])) {
                    $this->specialData[$key] = [];
                }

                // Handle both array and non-array values
                if (is_array($value)) {
                    foreach ($value as $item) {
                        $this->specialData[$key][] = $item;
                    }
                } else {
                    $this->specialData[$key][] = $value;
                }
            }
        }

        return $this;
    }

    public function getSpecialData()
    {
        return $this->specialData;
    }
}
