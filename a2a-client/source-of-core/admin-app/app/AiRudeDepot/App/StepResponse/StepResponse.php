<?php

namespace App\AiRudeDepot\App\StepResponse;

use App\AiRudeDepot\Storage\DataHub;
use Illuminate\Support\Facades\Log;

/**
 * Represents the result of a single step or a sequence of steps within a module's execution.
 *
 * Extends CommonResponseFunctions to inherit base functionality for managing
 * execution history, console logs, data payload, and halt status.
 * Adds specific features like response merging, redirect handling, and temporary session data management.
 *
 * @see CommonResponseFunctions
 * @see StepStatusEnum
 * @see \App\Helpers\ResponseHelper
 */
class StepResponse extends CommonResponseFunctions
{
    /**
     * @var DataHub|null The DataHub instance associated with this response context.
     */
    protected ?DataHub $dataHub = null;

    /**
     * @var array Temporary data intended to be stored in the user's session after module execution.
     */
    protected array $sessionData = [];

    /**
     * Checks if the response includes a 'full' flag, often used in redirect scenarios
     * to indicate a full page reload might be needed.
     *
     * @return bool True if the 'full' flag is set to true, false otherwise.
     */
    public function isFull()
    {
        return isset($this->data['full']) && $this->data['full'] === true;
    }

    /**
     * Merges data, history, console logs, and halt status from another response object.
     * Uses StepResponseHelper::mergeResponses for potentially complex data merging logic.
     *
     * @param StepResponse|ProgramResponse $other The response object to merge from.
     * @return $this The current instance, modified with merged data.
     */
    public function merge(StepResponse|ProgramResponse $other)
    {
        // Manual Merge Logic

        // 1. Merge Data (use array_merge for simple key overwrite)
        $this->data = array_merge($this->data, $other->getData());

        // 2. Merge History
        $this->history = array_merge($this->history, $other->getHistory());

        // 3. Merge Console
        $this->console = array_merge($this->console, $other->getConsole());

        // 4. Merge Halt Status (true if either is true)
        $this->halt = $this->halt || $other->isHalted();

        // 5. Merge Status (prioritize the incoming status if it's not OK or if current is OK)
        // This logic might need refinement based on desired priority
        $otherStatus = $other->getStatus();
        if ($otherStatus !== StepStatusEnum::OK || $this->getStatus() === StepStatusEnum::OK) {
            $this->setStatus($otherStatus);
        }

        // 6. Merge DataHub (prioritize the incoming one if it exists)
        if ($otherDataHub = $other->getDataHub()) {
            $this->setDataHub($otherDataHub);
        }

        // 7. Merge Session Data
        $this->sessionData = array_merge($this->sessionData, $other->sessionData);

        // Log the result for debugging
        Log::debug("[StepResponse::merge MANUALLY] Data AFTER manual merge", [
            'merged_data' => $this->data,
            'merged_status' => $this->getStatus()->name,
            'merged_halt' => $this->isHalted()
        ]);

        return $this;
    }

    /**
     * Gets the DataHub instance associated with this response.
     *
     * @return DataHub|null
     */
    public function getDataHub(): ?DataHub
    {
        return $this->dataHub;
    }

    /**
     * Sets the DataHub instance associated with this response.
     *
     * @param DataHub $dataHub
     * @return $this
     */
    public function setDataHub(DataHub $dataHub): self
    {
        $this->dataHub = $dataHub;
        return $this;
    }

    /**
     * Merges only history, console logs, and halt status from another response object,
     * leaving the primary data payload ($this->data) untouched.
     * Useful for accumulating metadata without overwriting main results.
     *
     * @param StepResponse|ProgramResponse $other The response object to merge metadata from.
     * @return $this The current instance, modified with merged metadata.
     */
    public function mergeMeta(StepResponse|ProgramResponse $other)
    {
        // $this->data remains unchanged
        $this->history = array_merge($this->history, $other->getHistory());
        $this->console = array_merge($this->console, $other->getConsole());
        // Propagate the halt status if the other response was halted.
        $this->halt = $this->halt || $other->isHalted();
        return $this;
    }

    /**
     * Converts the response object into an array suitable for logging or serialization.
     * Includes the main data, console logs, history, and the associated module path.
     *
     * @param string $path The identifier/path of the module associated with this response.
     * @return array An array representation of the response.
     */
    public function toArray($path)
    {
        $logResponsePayload = $this->getData();
        $logResponsePayload['console'] = $this->getConsole();
        $logResponsePayload['history'] = $this->getHistory();
        $logResponsePayload['module'] = $path;
        return $logResponsePayload;
    }

    /**
     * Sets a redirect URL in the response data and updates the status to REDIRECT.
     *
     * @param string $url The target URL for the redirect.
     * @return $this The current instance, configured for redirection.
     */
    public function redirect($url)
    {
        $this->addData('redirect', $url);
        $this->setStatus(StepStatusEnum::REDIRECT);
        return $this;
    }

    /**
     * Checks if the response status is set to REDIRECT.
     *
     * @return bool True if the status is REDIRECT, false otherwise.
     * @deprecated Use getStatus() === StepStatusEnum::REDIRECT instead for clarity.
     */
    public function isRedirect(): bool
    {
        return $this->getStatus() === StepStatusEnum::REDIRECT;
    }

    /**
     * Retrieves the redirect URL if it has been set.
     *
     * @return string|null The redirect URL, or null if not set.
     */
    public function getRedirectUrl(): ?string
    {
        return $this->data['redirect'] ?? null;
    }

    /**
     * Gets the target Inertia component name from the response data.
     * Defaults to 'Dynamic/Index' if not explicitly set.
     *
     * @return string The Inertia component name.
     */
    public function getComponent(): ?string
    {
        return $this->data['component'] ?? "Dynamic/Index";
    }

    /**
     * Adds data intended to be stored in the user's session.
     *
     * @param string $key The key for the session data.
     * @param mixed $value The value to store.
     * @return $this The current instance.
     */
    public function addSessionData(string $key, $value): self
    {
        $this->sessionData[$key] = $value;
        return $this;
    }

    /**
     * Checks if any session data has been added to this response.
     *
     * @return bool True if session data exists, false otherwise.
     */
    public function hasSessionData(): bool
    {
        return !empty($this->sessionData);
    }

    /**
     * Retrieves all session data added to this response.
     *
     * @return array The session data array.
     */
    public function getSessionData(): array
    {
        return $this->sessionData;
    }
}
