import tailwindcssprimeui from 'tailwindcss-primeui'

export default {
    // Disable JIT mode to generate all styles
    // mode: 'jit', // Use 'aot' (ahead-of-time) instead of 'jit'
    mode: 'aot', // Use 'aot' (ahead-of-time) instead of 'jit'
    plugins: [tailwindcssprimeui],
    safelist: [
        '!opacity-100',
        '!opacity-0',
    ],
    content: [
        './resources/backend/**/*.{js,vue,blade.php}',
        './resources/common/**/*.{js,vue,blade.php}',
        './node_modules/primevue/**/*.{vue,js,ts,jsx,tsx}',
        './storage/ai/**/*.{json,vue,js,ts,jsx,tsx}',
    ],
    theme: {
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1920px',
        },
    },
    darkMode: 'app-dark',
}
