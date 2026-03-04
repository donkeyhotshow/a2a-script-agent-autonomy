# Development Workflow Guidelines

## Brief overview
This file contains guidelines for development workflow when working with the user on this project. It covers preferred approaches to file operations, command execution, and project structure.

## File Operations
- Use absolute paths for all file operations to avoid confusion
- When changing directories, always use `cd` with the full absolute path
- Prefer absolute paths over relative paths in all commands and file references
- Use Windows-style paths with backslashes when working with Windows systems

## Command Execution
- Always use absolute paths when executing commands that require directory changes
- Format cd commands as: `cd "C:\full\path\to\directory"`
- When chaining commands, use the full path for each operation
- Avoid using `~` or `$HOME` - always specify the complete path

## Project Structure
- Main project directory: `c:\workspace\org-carrier\a2a-script-agent`
- Use absolute paths when referencing files in this directory
- When creating new files, specify the complete path including the full directory structure

## Development Environment
- Current working directory is always: `c:\workspace\org-carrier\a2a-script-agent`
- Use absolute paths for all tool configurations and references
- When referencing workspace files, use the full path from the root directory

## Examples
```bash
# Correct - absolute path
cd "C:\workspace\org-carrier\a2a-script-agent"

# Incorrect - relative path
cd a2a-script-agent

# Correct - absolute path with command chaining
cd "C:\workspace\org-carrier\a2a-script-agent" && npm install

# Incorrect - relative path
cd a2a-script-agent && npm install