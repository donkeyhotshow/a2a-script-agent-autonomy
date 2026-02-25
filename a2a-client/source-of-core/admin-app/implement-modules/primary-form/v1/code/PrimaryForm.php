<?php

namespace App\AiRudeDepot\Modules;

use App\AiRudeDepot\App\App;
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\Managers\StorageNavigator;
use App\AiRudeDepot\Processors\DataProcessor;
use App\AiRudeDepot\Storage\DataHub as StaticStorage;
use App\AiRudeDepot\Storage\DataHub as Storage;
use App\Helpers\Normal;
use App\Helpers\ArrayHelper;
use App\Helpers\JsonHelper;
use Exception;

class PrimaryForm extends App
{
    public $folder = 'primary-form';
    public $state = [];
    public $schema;
    public $currentProgramState;

    public function moduleRun(StepResponse $response, string $pagePath): StepResponse
    {
        $response->addHistory("PrimaryForm::moduleRun starting [User Version]");
        try {
            // Ensure envPath is valid, provide a default if necessary
            $envPath = $this->envPath ?? null;
            if (empty($envPath)) {
                $envPath = base_path(config('ai.env_path', 'storage/ai'));
                $response->addHistory("PrimaryForm::moduleRun: envPath was empty, using default: {$envPath}", 'warning');
            } else {
                $response->addHistory("PrimaryForm::moduleRun: Using envPath: {$envPath}");
            }

            // Run the full modificator chain, passing envPath
            $modResult = DataProcessor::data(null, $envPath) // Start with null data, provide envPath
            ->layoutModule($this->folder)
                ->layoutNodeOperation();

            $structure = $modResult->result();

            // Add the entire structure to the response
            if ($structure) {
                $response->addHistory("Adding structure from modificator result to response");
                $response->addDataRecursive($structure); // Add the whole structure
            } else {
                $response->addHistory("Structure from modificator chain is empty/null", 'warning');
            }


            $forms = $modResult->layoutFormComponent($this->folder)->result();
            if ($forms) {
                $response->addHistory("Adding forms from modificator result to response");
                $response->addDataRecursive(['forms' => $forms]); // Add the whole structure
            } else {
                $response->addHistory("Forms from modificator chain is empty/null", 'warning');
            }


            // Get the final structure (which user says contains everything)
            $response->addHistory("Structure keys after modificator chain:", 'debug', is_array($structure) ? array_keys($structure) : gettype($structure));


            // Merge history/errors from the modificator chain itself
            // $response->merge($modResult->response());

            // Add flag indicating this module ran
            //  $response->addDataRecursive(['primary_form_module_ran_full_chain' => true]);

        } catch (Exception $e) {
            $response->addHistory("Error in PrimaryForm::moduleRun [User Version]: " . $e->getMessage(), 'error', $e->getTrace());
        }
        $response->addHistory("PrimaryForm::moduleRun finished [User Version]");

        // print_r('<br><br>---------response---<br>');
        // print_r($response->getData());
        // exit();
        return $response;
    }


    public function processProgram($response): StepResponse
    {
        $selectedWindowIndex = $this->processInput();
        $storage = $this->storage;
        if (isset($this->schema['instructions'])) {
            $response->merge(ProcessInstruction::executeInstructions($storage, $this->schema['instructions']));
        }

        if (empty($this->state)) $this->state = [['run' => 0, 'install' => 0, 'installed' => false]];     // $this->state = [[]];

        if ($storage->address('primary-form/data/program-section:stepNext')->get() ||
            $storage->address('primary-form/data/program-section:stepPrev')->get() ||
            $storage->address('primary-form/data/program-section:levelEnter')->get() ||
            $storage->address('primary-form/data/program-section:levelLeave')->get() ||
            $storage->address('primary-form/data/program-section:stepComplete')->get()
        ) {
            $response->setIsFull(true);
            $this->onStep();
        }

        $displayData = [
            'important' => [],
            'content' => [],
            'context' => [],
            'byAddress' => false
        ];

        $curr = $this->schema;
        foreach ($this->state as $value) {
            if (empty($value)) break;

            if ((isset($value['installed']) && $value['installed']) || !isset($curr['install'])) $curr = $curr['run'][array_keys($curr['run'])[$value['run']]];
            else $curr = $curr['install'][array_keys($curr['install'])[$value['install']]];

            if (isset($curr['display'])) {
                if (isset($curr['display']['important'])) $displayData['important'] = array_merge($displayData['important'], $curr['display']['important']);
                if (isset($curr['display']['content'])) $displayData['content'] = $curr['display']['content'];
                if (isset($curr['display']['context'])) $displayData['context'] = $curr['display']['context'];
                if (isset($curr['display']['byAddress'])) $displayData['byAddress'] = $curr['display']['byAddress'];
            }
        }
        $finData = $response->getData();
        $display = $this->prepareDisplayData($storage, $displayData);

        $storage->address('primary-form/data/program-section:requestToChat')->set($display)->save();
        $storage->address('primary-form/data/program-section:currentProgramState')->set(json_encode($this->state))->save();

        $storage->address("primary-form/data/models/windows:$selectedWindowIndex.state")->set($this->state)->save();

        $response->addHistory('Program completed');

        if (isset($response->getData()['forms'])) {
            $response->addDataRecursive(['forms' => ['program-section' => $storage->address('primary-form/data/program-section')->get()]]);
        }

        $this->processButtons($response);

        $breadcrumbItems = $this->getBreadcrumbItems();
        return $response;
    }

    public function processInput()
    {
        $storage = new Storage();
        $this->storage = $storage;

        $windows = $storage->address('primary-form/data/models/windows')->get();
        $programs = $storage->address('primary-form/data/models/programs')->get();
        $selectedWindowIndex = $storage->address('primary-form/data/models/windows')->find([
            "value" => "{primary-form/data/program-section:selectedWindow}",
            'return' => 'key'
        ]);

        if ($selectedWindowIndex === null) {
            print_r('<br><br>---------address---<br>');
            print_r($storage->address('primary-form/data/models/windows'));
            print_r('<br><br>---------windows---<br>');
            print_r($windows);
            print_r('<br><br>---------programs---<br>');
            print_r($programs);
            print_r('<br><br>---------selectedWindowIndex---<br>');
            print_r($selectedWindowIndex);
            exit();
        }

        $this->state = $windows[$selectedWindowIndex]['state'];
        $selectedProgramId = $windows[$selectedWindowIndex]['selectedProgram'];
        $selectedProgramIndex = $storage->address('primary-form/data/models/programs')->find([
            "value" => $selectedProgramId,
            'return' => 'key'
        ]);

        if ($selectedProgramIndex === null) {
            throw new Exception("Selected program with id {$selectedProgramId} not found.");
        }

        $programName = $programs[$selectedProgramIndex]['name'];

        $this->schema = DataProcessor::address('primary-form/programs/' . $programName)->layoutNodeOperation()->result();

        if (empty($this->schema)) {
            print_r('<br><br>---------schema---<br>');
            print_r("Schema for program {$programName} not found.");
            print_r($storage->address('primary-form/programs/' . $programName)->get());
            exit();
            throw new Exception("Schema for program {$programName} not found.");
        }

        return $selectedWindowIndex;
    }

    public function onStep()
    {

        $levelEnter = $this->storage->address('primary-form/data/program-section:levelEnter')->get();
        $levelLeave = $this->storage->address('primary-form/data/program-section:levelLeave')->get();
        $stepNext = $this->storage->address('primary-form/data/program-section:stepNext')->get();
        $stepPrev = $this->storage->address('primary-form/data/program-section:stepPrev')->get();
        $stepComplete = $this->storage->address('primary-form/data/program-section:stepComplete')->get();

        $controlState = &$this->state[array_key_last($this->state)];

        $curr = $this->getCurrentSchemaData();
        if ($levelEnter && $this->isLevelEnterAvailable()) {
            if (isset($curr['run'])) {
                $this->state[] = ['run' => 0];
                $controlState = &$this->state[array_key_last($this->state)];
            }
        } elseif ($levelLeave && $this->isLevelLeaveAvailable()) {

            if (count($this->state) > 1) {
                unset($this->state[array_key_last($this->state)]);
                $controlState = &$this->state[array_key_last($this->state)];

            }
        } elseif ($stepNext && $this->isStepNextAvailable()) {
            if ($this->isInstalled()) {
                $controlState['run'] += 1;


            } else {
                $controlState['install'] += 1;
            }
        } elseif ($stepPrev && $this->isStepPrevAvailable()) {
            if ($this->isInstalled()) {
                $controlState['run'] -= 1;
                if ($controlState['run'] < 0) $controlState['run'] = 0;

            } else {
                $controlState['install'] -= 1;
                if ($controlState['install'] < 0) $controlState['install'] = 0;
            }
        } elseif ($stepComplete && $this->isStepCompleteAvailable()) {
            // Логика для onStepComplete будет здесь, пока просто для примера:
            // // Добавьте нужное действие
            if (!$this->isInstalled()) {
                $controlState['installed'] = true;
            }

        }

        $this->state[array_key_last($this->state)] = $controlState;

        //TODO здесь можно придумать новый метод чтоб оптимизировать этот сет команд
        // Сбрасываем команды после обработки
        $this->storage->address('primary-form/data/program-section:stepNext')->set(null);
        $this->storage->address('primary-form/data/program-section:stepPrev')->set(null);
        $this->storage->address('primary-form/data/program-section:levelEnter')->set(null);
        $this->storage->address('primary-form/data/program-section:levelLeave')->set(null);
        $this->storage->address('primary-form/data/program-section:stepComplete')->set(null);
        $this->storage->address('primary-form/data/program-section')->save();

    }

    public function getCurrentSchemaData()
    {
        $curr = $this->schema;
        foreach ($this->state as $value) {
            if (isset($value['installed']) || !isset($curr['install'])) $curr = $curr['run'][array_keys($curr['run'])[$value['run']]];
            else $curr = $curr['install'][array_keys($curr['install'])[$value['install']]];
        }
        return $curr;
    }

    public function isLevelEnterAvailable()
    {
        $curr = $this->getCurrentSchemaData();
        if (!isset($curr['run'])) return false;
        $curr = $this->getCurrentSchemaData();
        $currLevel = $this->getCurrentLevelSchemaData();
        $currState = $this->state[array_key_last($this->state)];

        if ($this->isInstalled()) {
            return isset($curr['run']);
        } else {
            $countInstallSteps = count(array_keys($currLevel['install']));
            if ((int)$currState['install'] >= $countInstallSteps - 1) return false;
            return true;
        }
    }

    public function getCurrentLevelSchemaData()
    {
        $curr = $this->schema;
        $state = array_slice($this->state, 0, array_key_last($this->state));
        foreach ($state as $value) {
            if (isset($value['installed']) || !isset($curr['install'])) $curr = $curr['run'][array_keys($curr['run'])[$value['run']]];

            else $curr = $curr['install'][array_keys($curr['install'])[$value['install']]];
        }

        return $curr;
    }

    public function isInstalled()
    {
        $currLevel = $this->getCurrentLevelSchemaData();

        if (!isset($currLevel['install'])) return true;
        if (isset($this->state[array_key_last($this->state)]['installed']) && $this->state[array_key_last($this->state)]['installed']) return true;
        return false;
    }

    public function isLevelLeaveAvailable()
    {
        if (count($this->state) == 1) return false;
        return true;
    }

    public function isStepNextAvailable()
    {

        $currLevel = $this->getCurrentLevelSchemaData();
        $currState = $this->state[array_key_last($this->state)];
        if (!$this->isInstalled()) {
            $countInstallSteps = count(array_keys($currLevel['install']));

            if ((int)$currState['install'] >= $countInstallSteps - 1) return false;
            return true;

        } else {
            if ($currState['run'] >= count(array_keys($currLevel['run'])) - 1) return false;
            return true;
        }
    }

    public function isStepPrevAvailable()
    {
        $currState = $this->state[array_key_last($this->state)];
        if ($this->isInstalled()) {
            if ($currState['run'] == 0) return false;
        } else {
            if ($currState['install'] == 0) return false;
        }
        return true;
    }

    public function isStepCompleteAvailable()
    {
        $currLevel = $this->getCurrentLevelSchemaData();
        $currState = $this->state[array_key_last($this->state)];

        if (!$this->isInstalled())
            if (count($currLevel['install']) - 1 == $currState['install']) return true;
        return false;
    }

    protected function prepareDisplayData($storage, $row)
    {
        $ret = [];
        $display = $row ?? [];

        foreach ($display as $key => $value) {
            if ($key === 'byAddress') {
                continue; // Пропускаем 'byAddress' на данный момент
            }

            if (ArrayHelper::isList($value)) {
                // Объединяем данные массива как контент
                // $rett = array_merge($ret, $value);
                $ret[] = "\n# $key\n\n" . implode("\n", $value) . "\n";
            } else if (is_array($value)) {
                // $ret[] = "\n\n# $key\n\n" . Normal::json_encode($value) . "\n";
                $ret[] = "\n# $key\n\n" . implode("\n", $value) . "\n";
            } else {
                // Отображаем строковые данные как "key:value"
                $ret[] = "\n# $key\n\n$value\n";
            }
        }

        if (isset($row['byAddress']) && $row['byAddress']) {
            if (!is_array($row['byAddress'])) {
                $row['byAddress'] = [$row['byAddress']];
            }
            foreach ($row['byAddress'] as $address) {
                $ret[] = $this->processOneEditableAddress($storage, $address);
            }
        }


        foreach ($ret as $key => &$value) {
            if (!is_string($value)) {
                if (is_array($value)) {
                    $value = implode("\n", array_map(fn($item) => trim($item, '.'), $value));
                } else {
                    $value = (string)$value;
                }
            }
        }

        $finReplaces = [
            ["\r\n", "\n"],
            ["\r\n", "\n"],
            ["\n\n\n", "\n"],
            ["\n\n\n", "\n"],
            [" ", " "],
            ["  ", " "],
            ["  ", " "],
            ["  ", " "],
            ["  ", " "],
            ["  ", " "],
            ["\n ", "\n"],
            ["\r\n ", "\n"],
            ["\r\n ", "\n"],
            ["\n ", "\n"],
            ["\n ", "\n"],
            ["}\n}", "}}"],
            ["{\n{", "{{"],
            ["{\n\"", "{\""],
            ["[\n\"", "[\""],
            ["\"\n}", "\"}"],
            ["}\n]", "}]"],
            //"
        ];
        $return = stripslashes(implode("\n", array_map(fn($item) => trim($item, '.'), $ret)));
        foreach ($finReplaces as $replace) {
            $return = str_replace($replace[0], $replace[1], $return);
        }
        return $return;
    }

    public
    function processOneEditableAddress($storage, $address)
    {
        StaticStorage::resolveInstruction($address);
        $byAddressData = [
            "address" => $address,
            "data" => $storage->address($address)->get()
        ];
        return "\n\n```json\n" . JsonHelper::encode($byAddressData) . "\n```\n";
    }

    public
    function processButtons($response)
    {
        $a = "primary-form/templates/parts/program/navButtons";

        $this->storage->action('update')->batch(
            [
                ['to' => "$a:0.children.0.disabled", 'value' => !$this->isStepPrevAvailable()],
                ['to' => "$a:0.children.1.disabled", 'value' => !$this->isStepNextAvailable()],
                ['to' => "$a:0.children.2.disabled", 'value' => !$this->isStepCompleteAvailable()],
                ['to' => "$a:1.children.0.props.disabled", 'value' => !$this->isLevelLeaveAvailable()],
                ['to' => "$a:1.children.1.props.disabled", 'value' => !$this->isLevelEnterAvailable()],
            ]
        )->process();

        $this->storage->address("$a")->save();

        return $response;
    }

    public
    function getBreadcrumbItems()
    {
        $a = "primary-form/data/program-section";
        if ($this->storage->address("$a:addressIsUpdated")->get()) {
            $selectedAddressItem = $this->storage->address("$a:selectedAddressItem")->get();
            $navigator = new StorageNavigator($selectedAddressItem['path'], $selectedAddressItem['itemType']);
            $items = $navigator->parentsList(true, false);
            $this->storage->address('primary-form/templates/forms/program-control:children.3.items')->set($items)->save();
            $this->storage->address("$a:addressIsUpdated")->set(false)->save();
        }
    }
}
