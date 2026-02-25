<?php

namespace App\Console\Commands;

/**
 * Class NodeEventProcessor
 * 
 * Handles processing of node events during module validation.
 * Manages the execution of node encountered and error detected listeners.
 */
class NodeEventProcessor
{
    /**
     * @var array List of listeners for NodeEncounteredEvent
     */
    private array $nodeEncounteredListeners;

    /**
     * @var array List of listeners for ErrorDetectedEvent
     */
    private array $errorDetectedListeners;

    /**
     * Constructor
     * 
     * @param array $nodeEncounteredListeners Listeners for NodeEncounteredEvent
     * @param array $errorDetectedListeners Listeners for ErrorDetectedEvent
     */
    public function __construct(array $nodeEncounteredListeners, array $errorDetectedListeners)
    {
        $this->nodeEncounteredListeners = $nodeEncounteredListeners;
        $this->errorDetectedListeners = $errorDetectedListeners;
    }

    /**
     * Process a NodeEncounteredEvent
     * 
     * @param NodeEncounteredEvent $event The event to process
     */
    public function processNodeEncountered(NodeEncounteredEvent $event): void
    {
        foreach ($this->nodeEncounteredListeners as $listener) {
            if (method_exists($listener, 'handle')) {
                $listener->handle($event);
            }
        }
    }

    /**
     * Process an ErrorDetectedEvent
     * 
     * @param ErrorDetectedEvent $event The event to process
     */
    public function processErrorDetected(ErrorDetectedEvent $event): void
    {
        foreach ($this->errorDetectedListeners as $listener) {
            if (method_exists($listener, 'handle')) {
                $listener->handle($event);
            }
        }
    }
} 