# Question-to-User (QTU) Module

This module provides a standardized way to ask users a series of questions and collect their answers. It is designed to
be flexible and support various input types and integrates with the task and scenario management system.

## Overview

The QTU module is used in scenarios where user input is required to proceed with a task or configuration. It dynamically
generates UI elements based on a JSON definition of questions, and now supports executing scenarios and managing tasks from the UI.

## Versions

Currently, the following versions of the module are available:

* **Version 1 (v1):**
    * Location: `implement-modules/question-to-user/v1/`
    * Documentation: ``
    * Status: Legacy. Provides basic question-answering functionality.

* **Version 5 (v5):**
    * Location: `implement-modules/question-to-user/v5/`
    * Documentation: `implement-modules/question-to-user/v5/docs/README.md`
    * Status: **Latest & Recommended**
    * **Key Features:**
        * Support for a wide range of input types (string, integer, boolean, choice, etc.)
        * Client-side validation based on question definitions
        * Pre-filling of answers
        * Conditional display of questions
        * Question Categorization
        * Progress Indicator
        * Task and Scenario Management integration
        * Direct execution of scenarios from the UI
        * Component-based architecture for better maintainability
        * Enhanced UI templates with ARIA attributes
        * Comprehensive documentation

## Usage

To use the latest version of the QTU module (v5), refer to its actions and data structures as defined in the v5 directory 
and documentation. For new implementations or refactoring, **Version 5 is required** due to its expanded feature set, 
integration capabilities, and component-based architecture.

### Task and Scenario Integration

The v5 module includes special interfaces for:
- Listing available system tasks
- Showing scenario details
- Executing scenarios with parameters
- Resetting scenario progress markers
- Submitting responses to scenarios

Refer to the `question-to-user-standard.json` in `script/data/standards/` for the standard definition of question
structures, and `implement-modules/question-to-user/v5/docs/` for detailed documentation on integration points.

## Development

The module follows the standard module development practices defined in `docs/standards/module-author/`.
For contributing to this module, please review:
- `@memories.md` - Development history
- `@scratchpad.md` - Current tasks and development status
- `v5/docs/` - Detailed documentation
