# ThemeManager.js

**Source:** `resources/common/managers/ThemeManager.js`

## Purpose

The `ThemeManager` is responsible for managing the application's visual theme, including presets (like Aura, Lara),
primary color palettes, surface color palettes, and dark mode state. It interacts with PrimeVue's theming capabilities
and browser local storage to persist user preferences.

## Core Functions

1. **State Management:**
    - Manages reactive `config` (preset, primary, surface, darkMode, menuMode) loaded from/saved to local storage via
      `./imports/storage.js`.
    - Manages reactive `state` (overlayMenuActive, configSidebarVisible, theme) also using local storage.
2. **Theme Application:**
    - `applyTheme(type, color)`: Main function to apply theme changes. Calls PrimeVue's `updatePreset` or
      `updateSurfacePalette` and persists the choice to local storage. Calls `applyTheme2`.
    - `applyTheme2()`: Applies dark mode class (`app-dark`) to the document element and potentially sets CSS variables
      for primary/surface colors (although the variable names `--selected-color-variable` and
      `--selected-surface-variable` seem like placeholders and might not be correct).
    - `updateColors(type, color)`: Sets the config for primary/surface and calls `applyTheme`.
    - `updatePreset(presetName)`: Changes the base preset (Aura/Lara), applies it using `applyPreset`, and saves the
      config.
    - `applyPreset(preset)`: *Potentially incomplete.* Sets CSS variables (`--preset-background`, `--preset-color`)
      based on the loaded preset object.
    - `updateSurfacePalette(surfaceName)`: Updates the surface palette config (seems less directly tied to applying the
      palette compared to `applyTheme`).
3. **Configuration Access:**
    - Provides `colors` and `surfaces` refs (loaded from JSON files).
    - Provides `presetOptions` (Aura, Lara).
    - `setConfig(key, value)` / `setState(key, value)`: Update reactive config/state and persist to local storage.
    - `computed`: Exposes computed properties for sidebar state, dark mode, primary/surface colors.
4. **UI Interaction:**
    - `toggleDarkMode()`: Switches the `config.darkMode` flag, applies the theme via `applyTheme2`, and potentially
      switches the base theme between Aura/Lara (this interaction seems complex and might need review).
    - `onMenuToggle()`: Toggles the `overlayMenuActive` state (used for mobile/overlay sidebars).
    - `resetMenu()`: Resets menu state.
5. **Preset Generation:**
    - `getPresetExt()`: Generates a PrimeVue preset extension object based on the currently selected primary color (
      `this.config.primary`) and the predefined color palettes (`this.colors`). It has special handling for the 'noir'
      primary color.

## State & Configuration

- **Config (Persistent):** `preset`, `primary`, `surface`, `darkMode`, `menuMode`.
- **State (Persistent):** `overlayMenuActive`, `theme`.
- **State (Transient):** `configSidebarVisible`.
- **Loaded Data:** `presets` (Aura, Lara objects), `colors` (from JSON), `surfaces` (from JSON).

## Usage

- Instantiated by `HubManager`.
- Accessed via `hub.themeManager`.
- Methods like `toggleDarkMode`, `updateColors`, `updatePreset`, `onMenuToggle` are likely called by UI components (
  e.g., theme configuration sidebar, header buttons).
- The applied theme affects the entire application through PrimeVue's styling and potentially global CSS variables.

## Dependencies

- `./include/RegularManager.js` (Base class)
- `./imports/storage.js`
- `./constants/constants.js`
- `@primevue/themes/aura`
- `@primevue/themes/lara`
- `@primevue/themes` (`updatePreset`, `updateSurfacePalette`)
- `../../../storage/aiCore/colors.json`
- `../../../storage/aiCore/surfaces.json`
- Vue (`reactive`, `ref`, `computed`)
- Relies on `HubManager` (`this.hub`) for debug logging.

<!-- mirror-status: outdated -->
<!-- source-size: 11499 -->

