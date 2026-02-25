<!-- Link back to Core Concepts -->
[Назад к Обзору Менеджеров](../../json-ui/core-concepts/managers.md)

# ThemeManager

`ThemeManager` - a manager responsible for handling themes, color palettes, and display modes (light/dark) in the
application.

Inherits from `RegularManager`.

Available through `hub.themeManager`.

## Purpose

- Managing the current theme (PrimeVue preset, such as Aura, Lara).
- Managing the main color palette (Primary Color).
- Managing the surface palette (Surface Color).
- Toggling between light and dark modes (Dark Mode).
- Saving user theme settings between sessions (using `storageUtil`).
- Applying theme changes to the DOM (through CSS variables and classes).
- Managing menu state (e.g., sidebar menu).

## Main Properties and State

- **`config`** (`reactive`): A reactive object with the theme configuration loaded and saved through `storageUtil`.
    - `preset`: ('Aura' | 'Lara') The name of the current preset.
    - `primary`: (String) The name of the primary color (e.g., 'noir', 'blue').
    - `surface`: (String) The name of the surface color (e.g., 'slate', 'gray').
    - `darkMode`: (Boolean) Whether dark mode is enabled.
    - `menuMode`: ('static' | ...) The menu display mode.
- **`state`** (`reactive`): A reactive object with temporary UI state related to the theme.
    - `overlayMenuActive`: (Boolean) Whether the overlay menu is active.
    - `configSidebarVisible`: (Boolean) Whether the configuration sidebar is visible.
    - `theme`: (String) The current active theme (duplicates `preset`?).
- **`presets`**: An object with imported PrimeVue presets (`Aura`, `Lara`).
- **`colors`** (`ref`): A reactive array of objects describing available primary colors (from `colors.json`).
- **`surfaces`** (`ref`): A reactive array of objects describing available surface colors (from `surfaces.json`).
- **`presetOptions`**: An array of names of available presets.

## Main Methods

- **`constructor(hub)`**: Initializes the manager, loads saved `config` and `state` from `storageUtil`, initializes
  preset, color, and surface lists.
- **`init(app)`**: Initialization method (may contain logic for initially applying the theme).
- **`applyTheme(type, color)`**: Applies changes to the primary color (`primary`) or surface color (`surface`), updates
  the preset or PrimeVue palette and saves the selection.
- **`applyTheme2()`**: Applies general theme changes such as `darkMode` (adding/removing the `app-dark` class to
  `<html>`) and sets CSS variables for selected colors.
- **`updateColors(type, color)`**: Sets a new color (`primary` or `surface`) in `config` and calls `applyTheme`.
- **`toggleDarkMode()`**: Toggles `config.darkMode`, saves the value, and calls `applyTheme2`.
- **`onMenuToggle()`**: Toggles the `state.overlayMenuActive` state and saves it.
- **`resetMenu()`**: Resets `state.overlayMenuActive` to `false`.
- **`setConfig(key, value)`**: Sets a value in `config` and saves it through `storageUtil`.
- **`setState(key, value)`**: Sets a value in `state` and saves it through `storageUtil`.
- **`updatePreset(presetName)`**: Updates `config.preset`, applies the new preset through `applyPreset`, and saves the
  selection.
- **`applyPreset(preset)`**: Applies the styles of the passed preset to the DOM through CSS variables.
- **`updateSurfacePalette(surfaceName)`**: Updates `config.surface`, finds the corresponding surface object, and calls
  `applyTheme` (or `applyTheme2`).
- **`getPresetExt()`**: Returns an object with extended configuration of semantic colors (`primary`) for the current
  PrimeVue preset, taking into account the selected primary color (`config.primary`).
- **`setTheme(theme)` / `toggleTheme()`**: Methods for setting or toggling the theme (probably related to
  `config.preset`).

## Computed Properties (`computed`)

- `isSidebarActive`: Whether the overlay menu is active.
- `isdarkMode`: Whether dark mode is enabled.
- `primary`: The current primary color.
- `surface`: The current surface color.
- `layout`: (Probably a reference to layout settings)

## Usage Examples

```javascript
// Toggle dark mode
hub.themeManager.toggleDarkMode();

// Change primary color
const blueColor = hub.themeManager.colors.value.find(c => c.name === 'blue');
if (blueColor) {
  hub.themeManager.updateColors('primary', blueColor);
}

// Change theme preset
hub.themeManager.updatePreset('Lara');

// Show/hide menu
hub.themeManager.onMenuToggle();
```

## Integration

- **HubManager:** Provides access to `themeManager` (`hub.themeManager`).
- **storageUtil:** Used for saving and loading theme settings (
  See [Storage Utilities](../../resources/managers/imports/storageUtils.md)).
- **PrimeVue Themes:** Uses functions from `@primevue/themes` (`updatePreset`, `updateSurfacePalette`) for dynamic theme
  changes.
- **UI Components:** UI components may use computed properties and methods from `ThemeManager` to adapt their appearance
  and behavior.
- **JSON Files:** Loads data about colors (`storage/aiCore/colors.json`) and surfaces (
  `storage/aiCore/surfaces.json`). (See [Theming Colors](../../theming/colors.md)).

## Dependencies

- `vue` (`reactive`, `ref`, `computed`)
- `RegularManager`
- `./imports/storage.js` (`storageUtil`) - Documented
  in [Storage Utilities](../../resources/managers/imports/storageUtils.md)
- `@primevue/themes` (Aura, Lara, `updatePreset`, `updateSurfacePalette`)
- `./constants/constants.js`
- JSON files with colors and surfaces.

## Implementation File

`resources/common/managers/ThemeManager.js`
