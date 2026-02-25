import { computed, reactive, ref } from 'vue'
import RegularManager from './include/RegularManager.js'
import * as storageUtil from './imports/storage.js'
import Aura from '@primevue/themes/aura'
import Lara from '@primevue/themes/lara'
import { updatePreset, updateSurfacePalette } from '@primevue/themes'
import { CONSTANTS } from './constants/constants.js'
import colors from '../../../storage/aiCore/colors.json'
import surfaces from '../../../storage/aiCore/surfaces.json'


class ThemeManager extends RegularManager {
    constructor(hub) {
        super(hub)
        this.config = reactive({
            preset: storageUtil.getItem('config.preset', 'Aura'),
            primary: storageUtil.getItem('config.primary', 'noir'),
            surface: storageUtil.getItem('config.surface', 'slate'),
            darkMode: storageUtil.getItem('config.darkMode', true),
            menuMode: storageUtil.getItem('config.menuMode', 'static'),
        })
        this.state = reactive({
            overlayMenuActive: storageUtil.getItem('state.overlayMenuActive', false),
            configSidebarVisible: false,
            theme: storageUtil.getItem('state.theme', 'aura'),
        })

        this.presets = {
            Aura,
            Lara,
        }

        this.colors = ref(colors)

        this.surfaces = ref(surfaces)

        this.presetOptions = Object.keys({
            Aura,
            Lara,
        })

        this.hub.debug('ThemeManager', 'constructor', `Loaded config:`, this.config)
    }

    get computed() {
        return {
            isSidebarActive: computed(() => this.state.overlayMenuActive),
            isdarkMode: computed(() => this.config.darkMode),
            primary: computed(() => this.config.primary),
            surface: computed(() => this.config.surface),
            layout: computed(() => this.layout),
        }
    }

    init(app) {
        super.init(app)


        /*  const primaryColor = this.colors.value.find(c => c.name === this.config.primary);
          if (primaryColor) {

              this.updateColors('primary', primaryColor);
          }


          const surfaceColor = this.surfaces.value.find(s => s.name === this.config.surface);
          if (surfaceColor) {
              this.updateColors('surface', surfaceColor);
          }*/

    }

    applyTheme(type, color) {
        if (type === 'primary') {
            updatePreset(this.getPresetExt())
            storageUtil.setItem('config.primary', color.name)
        } else if (type === 'surface') {
            updateSurfacePalette(color.palette)
            storageUtil.setItem('config.surface', color.name)
        }
        this.applyTheme2()
    }

    applyTheme2() {
        this.hub.debug('ThemeManager', 'applyTheme2', `Applying theme...`)
        if (this.config.darkMode) {
            document.documentElement.classList.add('app-dark')
        } else {
            document.documentElement.classList.remove('app-dark')
        }
        const primaryColor = this.colors.value.find(c => c.name === this.config.primary)
        if (primaryColor) {
            document.documentElement.style.setProperty(this.selectedColorVariable, primaryColor.palette[500])
            this.hub.debug('ThemeManager', 'applyTheme2', `Primary color set to:`, primaryColor.palette[500])
        }
        const surfaceColor = this.surfaces.value.find(s => s.name === this.config.surface)
        if (surfaceColor) {
            document.documentElement.style.setProperty(this.selectedSurfaceVariable, surfaceColor.palette[500])
            this.hub.debug('ThemeManager', 'applyTheme2', `Surface color set to:`, surfaceColor.palette[500])
        }
    }

    updateColors(type, color) {
        if (type === 'primary') {
            this.setConfig('primary', color.name)
        } else if (type === 'surface') {
            this.setConfig('surface', color.name)
        }

        this.applyTheme(type, color)
    }

    toggleDarkMode() {
        const currentTheme = this.state.theme
        const newTheme = currentTheme === CONSTANTS.THEMES.AURA ? CONSTANTS.THEMES.LARA : CONSTANTS.THEMES.AURA
        this.state.theme = newTheme
        // this.emit('themeChange', newTheme);
        this.config.darkMode = !this.config.darkMode
        storageUtil.setItem('config.darkMode', this.config.darkMode)
        this.applyTheme2()
    }

    onMenuToggle() {
        this.state.overlayMenuActive = !this.state.overlayMenuActive
        storageUtil.setItem('state.overlayMenuActive', this.state.overlayMenuActive)
    }

    resetMenu() {
        Object.assign(this.state, {
            overlayMenuActive: false,
        })
    }

    setConfig(key, value) {
        if (key in this.config) {
            this.config[key] = value
            storageUtil.setItem(`config.${key}`, value)
        }
    }

    setState(key, value) {
        if (key in this.state) {
            storageUtil.setItem(`state.${key}`, value)
            this.state[key] = value
        }
    }

    updatePreset(presetName) {
        if (presetName !== this.config.preset && presetName in this.presets) {
            this.setConfig('preset', presetName)
            const preset = this.presets[presetName]
            this.applyPreset(preset)
            this.hub.debug('ThemeManager', 'updatePreset', `Preset applied:`, presetName)
        } else {
            this.hub.debug('ThemeManager', 'updatePreset', `Preset not changed or not found:`, presetName)
        }
    }

    applyPreset(preset) {

        document.documentElement.style.setProperty('--preset-background', preset.background)
        document.documentElement.style.setProperty('--preset-color', preset.color)

    }

    updateSurfacePalette(surfaceName) {
        const surface = this.surfaces.value.find(c => c.name === surfaceName)
        if (surface) {
            this.setConfig('surface', surfaceName)

        }
    }

    getPresetExt() {
        const color = this.colors.value.find(c => c.name === this.config.primary)
        if (color) {
            if (color.name === 'noir') {
                return {
                    semantic: {
                        primary: {
                            50: '{surface.50}',
                            100: '{surface.100}',
                            200: '{surface.200}',
                            300: '{surface.300}',
                            400: '{surface.400}',
                            500: '{surface.500}',
                            600: '{surface.600}',
                            700: '{surface.700}',
                            800: '{surface.800}',
                            900: '{surface.900}',
                            950: '{surface.950}',
                        },
                        colorScheme: {
                            light: {
                                primary: {
                                    color: '{primary.950}',
                                    contrastColor: '#ffffff',
                                    hoverColor: '{primary.800}',
                                    activeColor: '{primary.700}',
                                },
                                highlight: {
                                    background: '{primary.950}',
                                    focusBackground: '{primary.700}',
                                    color: '#ffffff',
                                    focusColor: '#ffffff',
                                },
                            },
                            dark: {
                                primary: {
                                    color: '{primary.50}',
                                    contrastColor: '{primary.950}',
                                    hoverColor: '{primary.200}',
                                    activeColor: '{primary.300}',
                                },
                                highlight: {
                                    background: '{primary.50}',
                                    focusBackground: '{primary.300}',
                                    color: '{primary.950}',
                                    focusColor: '{primary.950}',
                                },
                            },
                        },
                    },
                }
            } else {
                return {
                    semantic: {
                        primary: color.palette,
                        colorScheme: {
                            light: {
                                primary: {
                                    color: '{primary.500}',
                                    contrastColor: '#ffffff',
                                    hoverColor: '{primary.600}',
                                    activeColor: '{primary.700}',
                                },
                                highlight: {
                                    background: '{primary.50}',
                                    focusBackground: '{primary.100}',
                                    color: '{primary.700}',
                                    focusColor: '{primary.800}',
                                },
                            },
                            dark: {
                                primary: {
                                    color: '{primary.400}',
                                    contrastColor: '{surface.900}',
                                    hoverColor: '{primary.300}',
                                    activeColor: '{primary.200}',
                                },
                                highlight: {
                                    background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
                                    focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
                                    color: 'rgba(255,255,255,.87)',
                                    focusColor: 'rgba(255,255,255,.87)',
                                },
                            },
                        },
                    },
                }
            }
        } else {
            this.hub.debug('ThemeManager', 'updatePreset', `Color not found`)
        }
    }

    // log(...args) {
    //     this.emit('log', ...args);
    // }

    setTheme(theme) {
        if (Object.values(CONSTANTS.THEMES).includes(theme)) {
            this.state.theme = theme
            // this.emit('themeChange', theme);
        }
    }

    toggleTheme() {
        this.config.darkMode = !this.config.darkMode
        document.documentElement.classList.toggle('dark', this.config.darkMode)
    }


    // export function toggleDarkMode() {
    //     const currentTheme = this.state.theme;
    //     const newTheme = currentTheme === CONSTANTS.THEMES.AURA ? CONSTANTS.THEMES.LARA : CONSTANTS.THEMES.AURA;
    //     this.state.theme = newTheme;
    //     this.emit('themeChange', newTheme);
    // }

    // export function setTheme(theme) {
    //     if (Object.values(CONSTANTS.THEMES).includes(theme)) {
    //         this.state.theme = theme;
    //         this.emit('themeChange', theme);
    //     }
    // }
}

export default ThemeManager
