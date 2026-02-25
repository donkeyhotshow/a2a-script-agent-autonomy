<?php

namespace Tests\Feature\AiRudeDepot\Support;

use App\AiRudeDepot\App\StepResponse\ProgramResponse;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use Tests\TestCase;

class ResponseTest extends TestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false; // Set to true to enable print statements

    public function testStepResponseAddDataRecursive(): void
    {
        $response = new StepResponse();
        $response->addData('key1', 'value1');
        $response->addDataRecursive(['key2' => 'value2', 'key3' => 'value3']);
        $this->printColoredData($this->allowVerbosity, "Test Result", $response, $response->getData(), 1, true);
        $this->assertEquals(['key1' => 'value1', 'key2' => 'value2', 'key3' => 'value3'], $response->getData());
    }

    public function testStepResponseAddHistory(): void
    {
        $response = new StepResponse();
        $response->addHistory('Test message', 'info');
        $history = $response->getHistory();
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $response, $history, 1, true);
        }
        $this->assertCount(1, $history);
        $this->assertEquals('Test message', $history[0]['message']);
        $this->assertEquals('info', $history[0]['type']);
    }

    public function testStepResponseAddHistoryErrorHalts(): void
    {
        $response = new StepResponse();
        $response->addHistory('Error message', 'error');
        $this->assertTrue($response->isHalted());
    }

    public function testStepResponseMerge(): void
    {
        $response1 = new StepResponse();
        $response1->addData('key1', 'value1');
        $response1->addHistory('History 1');

        $response2 = new StepResponse();
        $response2->addData('key2', 'value2');
        $response2->addHistory('History 2');
        $response2->halt();

        $response1->merge($response2);
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $response1, $response1->getData(), 1, true);
        }

        $this->assertEquals(['key1' => 'value1', 'key2' => 'value2'], $response1->getData());
        $this->assertCount(2, $response1->getHistory());
        $this->assertTrue($response1->isHalted());
    }

    public function testProgramResponseAddSpecialData(): void
    {
        $response = new ProgramResponse();
        $response->addSpecialData('specialKey', 'specialValue');
        $actualData = $response->getSpecialData();
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $response, $actualData, 1, true);
        }
        $this->assertEquals(['specialKey' => ['specialValue']], $actualData);
    }

    public function testProgramResponseMergeSpecialData(): void
    {
        $response1 = new ProgramResponse();
        $response1->addSpecialData('specialKey1', 'value1');

        $response2 = new ProgramResponse();
        $response2->addSpecialData('specialKey2', 'value2');

        $response1->merge($response2);
        $actualData = $response1->getSpecialData();
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $response1, $actualData, 1, true);
        }
        $this->assertEquals(['specialKey1' => ['value1'], 'specialKey2' => ['value2']], $actualData);
    }

    public function testProgramResponseMergeImportantData(): void
    {
        $response1 = new ProgramResponse();
        $response1->addSpecialData('important', ['item1']);

        $response2 = new ProgramResponse();
        $response2->addSpecialData('important', ['item2']);

        $response1->merge($response2);
        $actualData = $response1->getSpecialData();
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $response1, $actualData, 1, true);
        }
        $this->assertEquals(['important' => [['item1'], ['item2']]], $actualData);
    }

    public function testProgramResponseMergeWithStepResponse(): void
    {
        $programResponse = new ProgramResponse();
        $stepResponse = new StepResponse();

        $programResponse->addSpecialData('specialKey', 'specialValue');
        $stepResponse->addData('dataKey', 'dataValue');

        $programResponse->merge($stepResponse);
        if ($this->allowVerbosity) {
            $this->printColoredData($this->allowVerbosity, "Test Result", $programResponse, $programResponse->getData(), 1, true);
        }

        $this->assertEquals(['dataKey' => 'dataValue'], $programResponse->getData());
        $this->assertEquals(['specialKey' => ['specialValue']], $programResponse->getSpecialData());
    }

    // Добавь тесты для остальных методов StepResponse, ResponseState, ResponseActions...
}

