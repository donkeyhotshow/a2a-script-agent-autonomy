<?php

namespace App\AiRudeDepot\Processors\DataProcessor\Php;

use App\AiRudeDepot\Storage\DataHub;

class ProcessInstructionsList
{
    public static function process(&$node, $instructions)
    {
        $storage = new DataHub
        $storage->address('input')->set($node);
        $storage->address('args')->set($arguments);

        $response = ProcessInstruction::executeInstructions($storage, $instructions);
//        $response = $this->response->merge($response);

        $output = null;
        // if (!$response->isCompleted()) {
            $a = $storage->address('output');
            if ($a->get()) $response->addDataRecursive($a->get());
        // }
        $result = $response->getData();

        $node = $result;
    }
}
