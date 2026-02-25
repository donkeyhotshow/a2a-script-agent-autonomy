# @libs/config-unified/gateway Model Library

This document describes the `@libs/config-unified/gateway` model library, which is part of the `config-unified` monorepo. This library provides a standardized and robust way to manage API gateway routing rules through a `ConfigManagerWrapper` interface, ensuring data integrity, validation, and flexible access patterns.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [ESM-first Policy](#esm-first-policy)
  - [GatewayConfigManager (`index.cjs`)](#gatewayconfigmanager-indexcjs)
  - [Schema Definition (`schema.json`)](#schema-definition-schemajson)
  - [Browser Helpers (`helpers.browser.js`)](#browser-helpers-helpersbrowserjs)
- [Getting Started](#getting-started)
- [Data Structure](#data-structure)
- [API Reference](#api-reference)
- [Testing Strategy](#testing-strategy)

## Overview

The `@libs/config-unified/gateway` library is responsible for the persistent storage and retrieval of gateway routing rules. It enforces a strict schema for rule definitions, handles versioning, and provides a clear API for CRUD operations on gateway rules. Designed to be consumed by both server-side logic and client-side (via an API layer), it ensures consistency across the application stack.

## Architecture

### Directory Structure

```
libs/config-unified/gateway/
├── config/
│   ├── presets/
│   └── validation/
├── storage/
│   └── data/
│       └── config.json
├── tests/
│   └── unit/
│       └── gateway.test.js
├── helpers.browser.js
├── index.cjs
├── index.js
├── package.json
├── README.md
└── schema.json
```

### ESM-first Policy

This library adheres to the [JavaScript Module Standard (ESM-first)](/docs/esm-policy.md). The `package.json` specifies `"type": "module"` and uses conditional `exports` to provide both ESM (`index.js`) and CommonJS (`index.cjs`) entry points. This ensures compatibility with diverse environments.

### GatewayConfigManager (`index.cjs`)

-   **Description**: The core class, `GatewayConfigManager`, extends `ConfigManagerWrapper` from `@libs/config-unified/core`. It provides methods for managing gateway rules, ensuring all operations respect the defined schema.
-   **Key Methods**:
    -   `constructor(configPath, schemaPath, testMode = false, initialConfig = null)`: Initializes the manager.
    -   `getDefaultConfig()`: Returns a default, empty configuration with metadata.
    -   `getRule(id)`: Retrieves a single rule by its unique ID.
    -   `getAllRules()`: Retrieves all configured rules.
    -   `addRule(ruleConfig)`: Adds a new rule, checking for ID uniqueness.
    -   `updateRule(id, updates)`: Updates an existing rule by ID.
    -   `deleteRule(id)`: Deletes a rule by its ID.
-   **Data Storage**: Rules are stored under the `rules` key in the `config.json` file.

### Schema Definition (`schema.json`)

The `schema.json` file defines the JSON Schema for gateway rule configurations. It enforces the structure and validation rules for each property of a gateway rule, including:

-   **`id`**: Unique string, `minLength: 1`, `pattern: "^[a-z0-9-]+$"` (lowercase alphanumeric, hyphens).
-   **`name`**: String, `minLength: 1`.
-   **`path`**: String, `minLength: 1` (expected to be a regex pattern).
-   **`targetUrl`**: String, `format: "uri"`.
-   **`status`**: Enum of `"active"`, `"inactive"`, `"deprecated"`, with a default of `"active"`.
-   **`priority`**: Integer, `minimum: 0`, `maximum: 100`, default `50`.
-   **`description`**: Optional string.
-   **`created` / `updated`**: Read-only `date-time` strings.

### Browser Helpers (`helpers.browser.js`)

This module provides pure ESM helper functions intended for use in browser/UI environments. These helpers facilitate data transformation and basic client-side validation:

-   **`GatewayRule` (typedef)**: JSDoc type definition for a gateway rule.
-   **`normalizeGatewayRule(rawRule)`**: Converts a raw rule object (from `config.json`) into a standardized `GatewayRule` object, ensuring all properties are present with defaults.
-   **`denormalizeGatewayRule(rule)`**: Converts a `GatewayRule` object (from UI) back into a format suitable for storage, stripping unnecessary UI-specific fields and managing timestamps.
-   **`isValidUrl(urlString)`**: Basic utility to check if a string is a valid URL format.
-   **`isValidRegex(regexString)`**: Basic utility to check if a string is a valid regular expression.

## Getting Started

To use this model library in your project:

1.  **Installation (if not part of monorepo)**:

    ```bash
    npm install @libs/config-unified/gateway
    # or yarn add @libs/config-unified/gateway
    ```

2.  **Importing**:

    ```javascript
    // For ESM environments (e.g., modern frontend frameworks)
    import { gatewayConfigManager, GatewayConfigManager } from '@libs/config-unified/gateway';

    // For CommonJS environments (e.g., Node.js scripts)
    const { gatewayConfigManager, GatewayConfigManager } = require('@libs/config-unified/gateway');
    ```

3.  **Basic Usage**:

    ```javascript
    import { gatewayConfigManager } from '@libs/config-unified/gateway';

    async function exampleUsage() {
      try {
        const allRules = await gatewayConfigManager.getAllRules();
        console.log('All Gateway Rules:', allRules);

        const newRule = {
          id: 'my-new-rule',
          name: 'My New Rule',
          path: '/api/custom(/.*)?',
          targetUrl: 'http://localhost:4000',
          status: 'active',
          priority: 85,
          description: 'A custom API rule',
        };
        await gatewayConfigManager.addRule(newRule);
        console.log('Rule added.');

        const updatedRule = await gatewayConfigManager.updateRule('my-new-rule', { status: 'inactive' });
        console.log('Rule updated:', updatedRule);

        await gatewayConfigManager.deleteRule('my-new-rule');
        console.log('Rule deleted.');

      } catch (error) {
        console.error('Error in gateway config management:', error);
      }
    }

    exampleUsage();
    ```

## Data Structure

The `config.json` file is expected to contain a top-level `rules` array, each element being a gateway rule object, and a `metadata` object.

Example `config.json` structure:

```json
{
  "rules": [
    {
      "id": "frontend-app",
      "name": "Frontend Application",
      "path": "^/(?!api/).*",
      "targetUrl": "http://localhost:8080",
      "status": "active",
      "priority": 100,
      "description": "Routes all non-API requests to the frontend application."
    }
    // ... other rules
  ],
  "metadata": {
    "created": "2024-10-15T00:00:00Z",
    "version": "1.0.0",
    "description": "Initial gateway routing rules"
  }
}
```

## API Reference

Refer to the JSDoc comments within `index.cjs` for detailed API documentation of `GatewayConfigManager` methods.

## Testing Strategy

Unit tests for the `@libs/config-unified/gateway` library are located in `tests/unit/gateway.test.js` and are executed using `vitest`. These tests cover:

-   CRUD operations: `getAllRules`, `getRule`, `addRule`, `updateRule`, `deleteRule`.
-   Error handling: Ensuring appropriate errors are thrown for duplicate IDs or non-existent rules.
-   Data integrity: Verifying that rule properties are correctly handled and timestamps are updated.

Testing is performed in an isolated environment by mocking file system operations to ensure deterministic results.
