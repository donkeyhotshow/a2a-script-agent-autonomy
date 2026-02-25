# Module Controller Documentation

**Source File:** `app/Http/Controllers/Common/ModuleController.php`

## 1. Overview

The `ModuleController` acts as the primary entry point and router for handling HTTP requests directed at specific JSON
UI modules. It determines the requested module, verifies access permissions, sets up the context, and then delegates the
core module execution logic to the `App\AiRudeDepot\App\Main` class.

## 2. Key Responsibilities

- **Route Handling:** Responds to web routes (typically defined in `routes/web.php` or `routes/admin.php`) that map URL
  paths/slugs to module execution.
- **Permalink Resolution:** Uses `PermanentLinkManager` (via `$this->linkManager`) and direct storage access (
  `$this->storage->address('permalinks/...')`) to find the permalink data associated with the requested slug.
- **Subpath Handling:** Supports modules defined by parent permalinks that handle subpaths (checks `handles_subpaths`
  flag).
- **Context and Access Control:** Differentiates between execution contexts (`'public'`, `'admin'`) and enforces access
  rights based on the `required_access` metadata found in the permalink.
- **Module Mapping:** Utilizes the static `getModuleMap()` method to scan the `storage/ai/` directory and build a map of
  module slugs to their corresponding `App\AiRudeDepot\App\Modules\{ModuleName}` class names (falling back to
  `App\AiRudeDepot\App\App` if a specific class isn't found).
- **Delegation to `Main`:** Calls the static `Main::runAppEnv()` method, passing it the module map, request object,
  application instance, the *full requested path*, and the path to the **source** modules (`storage/aiInstaller/`).
  `Main::runAppEnv` is then responsible for instantiating the correct module `App` class and handling the request
  lifecycle (rendering, action processing).
- **Error Handling:** Catches exceptions during module execution and returns appropriate Inertia error pages (
  `Error/ModuleNotFound`, `Error/Forbidden`, `Error/ServerError`) or JSON error responses.

## 3. Key Methods

### Public Entry Points

- **`runAdminModule(Request $request, Application $appRoot, string $slug)`:**
    - Handles requests for admin-context modules.
    - Checks if the user is authenticated (`Auth::check()`).
    - Calls `runModuleBySlug()` with `context = 'admin'`.
- **`runPublicModule(Request $request, Application $appRoot, string $slug)`:**
    - Handles requests for public-context modules.
    - Calls `runModuleBySlug()` with `context = 'public'`.
- **`runModule(string $path)`:**
    - Likely an older or alternative entry point, normalizes the path and potentially calls `runModuleBySlug`.
- **`runHomepage()`:**
    - Handles requests for the homepage.
    - Attempts to load the permalink defined by `config('ai.homepage_route')`.
    - If not found, falls back to `runDefaultHome()` which uses `$this->defaultHomeRoute`.

### Core Logic

- **`runModuleBySlug(Request $request, string $slug, string $context = 'public')`:** (Protected)
    - The main internal method for processing a request based on a slug.
    - Gets permalink data using `$this->storage->address()`, handling parent permalinks with subpath handling.
    - Checks access based on `permalink['metadata']['required_access']` and the `$context`.
    - Calls `executeModuleFromPermalink()`. Includes `try...catch` for error handling.
- **`executeModuleFromPermalink(Request $request, array $permalink, string $context, string $originalPath = null)`:** (
  Protected)
    - Extracts the module name (`$permalink['module']`).
    - Gets the module map using `getModuleMap()`. **Determines the target App class:** Uses the specific class found in
      the map, or defaults to `PageModule` if no specific class is found (does **not** use
      `permalink['metadata']['module_type']`).
    - Determines the base storage path (`storage/ai/`).
    - Calls `Main::runAppEnv()` passing the determined **`$targetClassName`**, **`$moduleSlug`**, base storage path,
      request, app instance, and the **full requested path** (`$originalPath`).
    - Returns the result from `Main::runAppEnv()` (expected to be an Inertia Response or RedirectResponse).

### Helpers & Utilities

- **`getModuleMap(): array`:** (Protected Static)
    - Scans `storage/ai/` for module directories.
    - Looks for `code/{ModuleName}.php` within each directory.
    - Builds and caches (statically) a map: `[moduleSlug => ModuleAppClassName]`. Uses `App\AiRudeDepot\App\App` as
      fallback if class file/definition not found, but relies on `executeModuleFromPermalink` to default to `PageModule`
      in that case.
- **`loadTopBarData(string $context = 'public'): array`:** (Protected)
    - Loads top bar link data from `storage/ai/top-bar-links/` based on the context (`admin.json` or `quest.json`).
- **`normalizePath($path)`:** (Protected)
    - Utility to clean up path strings (trim slashes).
- **`getPageNameFromPath($path)`:** (Protected)
    - Extracts the last segment of a path.
- **`runDefaultHome()`:** (Protected)
    - Handles rendering the default homepage if the configured one fails.
- **`testModificatorEnvironmentPaths(): void`:** (Public)
    - A specific method for testing environment path configurations related to `Modificator`.

## 4. Related Documentation

- **[AiRudeDepot Main Class](../../AiRudeDepot/Main.md)**
- **[AiRudeDepot App Base Class](../../AiRudeDepot/App.md)**
- **[PermanentLinkManager](../../AiRudeDepot/Storage/PermanentLinkManager.md)**
- **[DataHub](../../AiRudeDepot/Support/DataHub.md)**
- **[AI Installer Overview](../ai-installer-v1/AI-Installer-Overview.md)** (Explains directory structure)

<!-- mirror-status: outdated -->
<!-- source-size: 2828 -->

