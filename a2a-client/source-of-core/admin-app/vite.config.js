const { fileSystemUtils } = require('@libs/system/file-operations');
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os' // Import the os module
let host = 'barberxxl.com.ua'

// Determine the environment based on the OS
const isWindows = os.platform() === 'win32'
if (isWindows) {
    host = '127.0.0.1'
}

/** @type {import('vite').UserConfig} */
export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler', // or "modern"
            },
        },
    },
    build: {
        assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.json'],
    },
    plugins: [
        laravel({
            input: ['resources/frontend/js/app.js', 'resources/backend/js/app.js'],
            ssr: 'resources/common/js/ssr.js',
            refresh: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        // i18n(),
    ],
    resolve: {
        alias: {
            '@': fileSystemUtils.resolve(__dirname, 'resources'),
            '@backend': fileSystemUtils.resolve(__dirname, 'resources/backend/js'),
            '@frontend': fileSystemUtils.resolve(__dirname, 'resources/frontend/js'),
            '@common': fileSystemUtils.resolve(__dirname, 'resources/common'),
            '@config': fileSystemUtils.resolve(__dirname, 'resources/config'),
            '@depot': fileSystemUtils.resolve(__dirname, 'install-modules/aiCore/js'),
            // vue: fileSystemUtils.resolve('./node_modules/vue/dist/vue.esm-bundler.js'),
        },
        resolve: {
            dedupe: [
                'vue',
            ],
        },
    },
    server: {
        host: true,
        port: 5175,
        hmr: { host },
        watch: {
            ignored: ['**/storage/**'],
        },
        https: isWindows ? false : {
            key: fs.readFileSync(`/home/aleon/apps/ssl/privkey.pem`),
            cert: fs.readFileSync(`/home/aleon/apps/ssl/${host}.crt`),
        },
        cors: {
            origin: ['http://127.0.0.1:4060', 'http://localhost:4060'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        },
    },
})
