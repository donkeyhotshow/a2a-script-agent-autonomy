# StepResponse: Standardizing Module Execution Results

## Purpose

The `StepResponse` class (`App\AiRudeDepot\App\StepResponse\StepResponse`) provides a standardized way to represent the
outcome of executing a module or a sequence of actions within the AiRudeDepot system. It encapsulates the final data
payload, a history of steps taken, console messages, and the overall status of the execution.

This standardization is crucial for:

* **Consistent Handling:** Ensuring different parts of the system (controllers, other modules, frontend) can reliably
  interpret module results.
* **Debugging:** Providing a detailed history and console logs to trace execution flow and diagnose issues.
* **Inter-module Communication:** Allowing modules to pass structured data and status information between each other.
* **Frontend Updates:** Delivering necessary data and status (like redirects or errors) to the Inertia frontend.

## Core Components

A `StepResponse` object primarily consists of:

1. **Data Payload (`$data`):** An associative array holding the primary result data of the execution. This could be
   fetched records, calculation results, UI definitions, etc.
2. **History (`$history`):** An array of associative arrays, where each entry represents a single step or significant
   event during execution. Each history entry typically contains:
    * `status`: The status of that specific step (e.g., `StepStatusEnum::OK`, `StepStatusEnum::ERROR`).
    * `message`: A descriptive message about the step.
    * `data`: Optional data specific to that step.
    * *(Other keys might be present depending on the step)*
3. **Console Logs (`$console`):** An array of strings intended for developer debugging output, not typically shown to
   the end-user.
4. **Status (`$status`):** The overall final status of the *entire* execution sequence, represented by a
   `StepStatusEnum` value.
5. **Halt Flag (`$halt`):** A boolean indicating whether the execution was stopped prematurely (e.g., due to a critical
   error).
6. **Session Data (`$sessionData`):** Temporary data collected during execution that should be flashed to the user's
   session afterwards (e.g., success/error messages for display).

## Statuses (`StepStatusEnum`)

The overall status is defined by the `App\AiRudeDepot\App\StepResponse\StepStatusEnum` enum:

* `OK ('ok')`: Execution completed successfully.
* `ERROR ('error')`: An error occurred during execution. The history should contain details.
* `REDIRECT ('redirect')`: Execution resulted in a need to redirect the user. The `redirect` key in the data payload
  will contain the target URL.
* `HALTED ('halted')`: Execution was stopped intentionally before completion (often related to errors or specific
  conditions).

*(Note: Individual steps within the `$history` array also use these statuses).*

## Common Usage

```php
use App\AiRudeDepot\App\StepResponse\StepResponse;
use App\AiRudeDepot\App\StepResponse\StepStatusEnum;

// Typically instantiated within a module or controller
$response = new StepResponse();

// Adding steps to the history
$response->addStep('Initialization', ['config' => $loadedConfig], StepStatusEnum::OK);
$response->addStep('Data Fetch', ['records' => $fetchedData], StepStatusEnum::OK);

// Handling an error
if ($errorCondition) {
    $response->addStep('Processing Failed', ['reason' => 'Invalid input'], StepStatusEnum::ERROR);
    $response->setStatus(StepStatusEnum::ERROR);
    $response->halt(); // Stop further processing
    return $response; // Return early
}

// Setting final data and status
$response->setData(['processedResult' => $finalResult]);
$response->setStatus(StepStatusEnum::OK);

// Adding console logs for debugging
$response->addConsoleLog('Final result calculated.', ['value' => $finalResult]);

// Adding data for the session
$response->addSessionData('success_message', 'Operation completed successfully!');

// Retrieving information
$finalStatus = $response->getStatus(); // StepStatusEnum::OK
$history = $response->getHistory();
$payload = $response->getData();
$sessionData = $response->getSessionData(); // ['success_message' => '...']

// Handling redirects
if ($needsRedirect) {
    $response->redirect('/new/location'); // Status automatically becomes REDIRECT
    $redirectUrl = $response->getRedirectUrl(); // '/new/location'
}

return $response;
```

## Merging Responses

The `merge()` and `mergeMeta()` methods allow combining results from multiple `StepResponse` (or `ProgramResponse`)
objects, useful when one module calls another.

* `merge()`: Combines data, history, console, and halt status.
* `mergeMeta()`: Combines only history, console, and halt status, preserving the primary data of the calling response.

## Key Methods (from `CommonResponseFunctions` and `StepResponse`)

* `addStep(string $message, ?array $data = null, ?StepStatusEnum $status = StepStatusEnum::OK): self`
* `addConsoleLog(string $message, ?array $context = null): self`
* `setData(array $data): self`
* `addData(string $key, $value): self`
* `getData(): array`
* `getHistory(): array`
* `getConsole(): array`
* `setStatus(StepStatusEnum $status): self`
* `getStatus(): StepStatusEnum`
* `halt(): self`
* `isHalted(): bool`
* `redirect(string $url): self` (Sets status to REDIRECT)
* `getRedirectUrl(): ?string`
* `addSessionData(string $key, $value): self`
* `getSessionData(): array`
* `merge(StepResponse|ProgramResponse $other): self`
* `mergeMeta(StepResponse|ProgramResponse $other): self`

Refer to the PHPDoc comments in `StepResponse.php` and `CommonResponseFunctions.php` for detailed explanations of all
methods.












<!-- mirror-status: outdated -->
<!-- source-size: 7300 -->

