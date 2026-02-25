# Calibration Tool

This application allows for calibration of screen coordinates and the creation of test scenarios.

## Running the Application

To run the application normally:
```
python -m src.main
```

## Test Mode

The application can be run in test mode, which will:
1. Load the configuration
2. Automatically execute the first scenario in the list
3. Close the application after the scenario completes

To run in test mode:
```
python -m src.main --test
```

Or use the provided batch file:
```
.\run_test.bat
```

## Configuration

The application stores configuration in a JSON file at `src/config/icon_positions.json`, which includes:
- Rectangle definitions (coordinates for UI elements)
- Scenarios (sequences of actions to perform)
- Events (trigger conditions)
- Markers (state indicators)
- Algorithm settings

## Key Features

- Screenshot analysis and icon recognition
- Scenario recording and playback
- Event-based automation
- State markers for complex workflows

## Использование общих скриптов и конфигов

Для доступа к общим скриптам и конфигам используйте симлинки:

**Windows (от имени администратора):**
```
mklink /D scripts-common ..\neural-train-and-chat\scripts-common
mklink /D config-common ..\neural-train-and-chat\config-common
```

После этого все общие скрипты и конфиги будут доступны в вашем проекте по путям `scripts-common/` и `config-common/`.

> Не забудьте обновлять симлинки при изменениях в общих папках.
